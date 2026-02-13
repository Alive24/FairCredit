import { address, type Address } from "@solana/kit";
import type { Course } from "@/lib/solana/generated/accounts/course";
import type { Resource } from "@/lib/solana/generated/accounts/resource";
import { fetchAllMaybeResource } from "@/lib/solana/generated/accounts/resource";
import { getCreateActivityInstructionAsync } from "@/lib/solana/generated/instructions/createActivity";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { getProviderPDA } from "@/lib/solana/pda";
import { ACTIVITY_KIND_TO_ENUM } from "@/lib/activities/activity-form-schema";
import { fetchResourceEvent } from "@/lib/nostr/client";
import {
  parseModuleRichData,
  type ModuleDefaultActivityTemplate,
  richTextToPlain,
} from "@/lib/resource-nostr-content";

export type DefaultActivityTemplateKind =
  | "AttendMeeting"
  | "AddFeedback"
  | "SubmitAssignment";

export const DEFAULT_ACTIVITY_TEMPLATE_OPTIONS: DefaultActivityTemplateKind[] = [
  "AttendMeeting",
  "AddFeedback",
  "SubmitAssignment",
];

type EnrollmentTemplate = {
  kind: DefaultActivityTemplateKind;
  title: string;
  description: string;
  requiredAttendance?: number;
  requiredEvidenceCount?: number;
  requiredFeedbackEntries?: number;
};

function getOptionString(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const maybe = value as { __option?: string; value?: unknown };
  if (maybe.__option === "Some" && typeof maybe.value === "string") {
    return maybe.value;
  }
  return null;
}

function bytesToHex(value: unknown): string {
  if (!(value instanceof Uint8Array)) return "";
  return Array.from(value)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function truncate(input: string, max = 180): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 3).trimEnd()}...`;
}

function normalizePositiveInt(input: unknown): number | undefined {
  if (typeof input !== "number" || !Number.isFinite(input)) return undefined;
  const rounded = Math.floor(input);
  if (rounded <= 0) return undefined;
  return rounded;
}

function defaultTemplateForModule(moduleLabel: string): EnrollmentTemplate {
  return {
    kind: "AttendMeeting",
    title: `${moduleLabel} Attendance`,
    description: `Attendance tracker for ${moduleLabel}`,
    requiredAttendance: 1,
  };
}

function normalizeTemplate(
  input: ModuleDefaultActivityTemplate,
  moduleLabel: string,
): EnrollmentTemplate {
  const safeTitle =
    input.title.trim() ||
    (input.kind === "SubmitAssignment"
      ? `${moduleLabel} Assignment`
      : input.kind === "AddFeedback"
        ? `${moduleLabel} Feedback`
        : `${moduleLabel} Attendance`);
  const safeDescription = input.description.trim();

  return {
    kind: input.kind,
    title: truncate(safeTitle, 100),
    description: truncate(safeDescription, 260),
    requiredAttendance: normalizePositiveInt(input.requiredAttendance),
    requiredEvidenceCount: normalizePositiveInt(input.requiredEvidenceCount),
    requiredFeedbackEntries: normalizePositiveInt(input.requiredFeedbackEntries),
  };
}

function buildDefaultActivityData(params: {
  template: EnrollmentTemplate;
  moduleAddress: string;
  guidance?: string;
  materials?: string[];
}): string {
  const modules = [{ module_pubkey: params.moduleAddress }];
  const guidancePlain = params.guidance?.trim()
    ? richTextToPlain(params.guidance).trim()
    : "";
  const guidance = guidancePlain
    ? truncate(guidancePlain, 220)
    : "";
  const materials = (params.materials ?? [])
    .map((entry) => truncate(entry.trim(), 72))
    .filter(Boolean)
    .slice(0, 5);
  const guidanceSummary = guidance ? truncate(guidance, 180) : "";
  const materialsSummary = materials.length
    ? truncate(materials.join(", "), 180)
    : "";

  if (params.template.kind === "AttendMeeting") {
    return JSON.stringify({
      kind: "AttendMeeting",
      title: params.template.title,
      description: params.template.description,
      timestamp: new Date().toISOString(),
      note: params.template.description || guidanceSummary || params.template.title,
      requiredAttendance: params.template.requiredAttendance,
      attendanceRecords: [],
      moduleContext: {
        guidance,
        materials,
      },
      modules,
    });
  }

  if (params.template.kind === "AddFeedback") {
    const contentParts = [params.template.description || params.template.title];
    if (guidanceSummary) contentParts.push(guidanceSummary);
    if (materialsSummary) contentParts.push(`Materials: ${materialsSummary}`);

    return JSON.stringify({
      kind: "AddFeedback",
      title: params.template.title,
      description: params.template.description,
      content: truncate(contentParts.join(" "), 400),
      requiredFeedbackEntries: params.template.requiredFeedbackEntries,
      assetIds: [],
      evidenceAssetIds: [],
      moduleContext: {
        guidance,
        materials,
      },
      modules,
    });
  }

  const descriptionParts = [
    params.template.description ||
      "Default assignment tracker created at enrollment. Update with real submission details.",
  ];
  if (guidanceSummary) descriptionParts.push(`Guidance: ${guidanceSummary}`);
  if (materialsSummary) descriptionParts.push(`Materials: ${materialsSummary}`);

  return JSON.stringify({
    kind: "SubmitAssignment",
    title: params.template.title,
    description: truncate(descriptionParts.join(" "), 380),
    requiredEvidenceCount: params.template.requiredEvidenceCount,
    evidenceLinks: [],
    moduleContext: {
      guidance,
      materials,
    },
    modules,
  });
}

export async function buildDefaultActivitiesForEnrollment(params: {
  courseAddress: string;
  course: Course;
  studentWalletAddress: string;
  rpc: Parameters<typeof fetchAllMaybeResource>[0];
}): Promise<
  Array<{
    instruction: Awaited<ReturnType<typeof getCreateActivityInstructionAsync>>;
    kind: DefaultActivityTemplateKind;
    moduleAddress: string;
  }>
> {
  const providerPda = await getProviderPDA(params.course.provider as Address);
  const baseTs = Math.floor(Date.now() / 1000);
  const moduleAddresses = Array.from(
    new Set(params.course.modules.map((module) => String(module.resource))),
  );
  const maybeResources = await fetchAllMaybeResource(
    params.rpc,
    moduleAddresses.map((entry) => address(entry)),
  );
  const moduleResourceMap = new Map<string, Resource | null>();
  maybeResources.forEach((entry, index) => {
    moduleResourceMap.set(
      moduleAddresses[index],
      entry.exists ? entry.data : null,
    );
  });
  const moduleRichDataMap = new Map<
    string,
    {
      guidance: string;
      materials: string[];
      templates: EnrollmentTemplate[];
    }
  >();

  await Promise.all(
    moduleAddresses.map(async (moduleAddress) => {
      const resource = moduleResourceMap.get(moduleAddress);
      const moduleLabel = resource?.name?.trim() || "Module";
      if (!resource) {
        moduleRichDataMap.set(moduleAddress, {
          guidance: moduleLabel,
          materials: [],
          templates: [defaultTemplateForModule(moduleLabel)],
        });
        return;
      }

      const dTag = getOptionString(resource.nostrDTag as unknown);
      const authorHex = bytesToHex(resource.nostrAuthorPubkey);

      if (!dTag || authorHex.length !== 64) {
        moduleRichDataMap.set(moduleAddress, {
          guidance: resource.name,
          materials: [],
          templates: [defaultTemplateForModule(moduleLabel)],
        });
        return;
      }

      try {
        const event = await fetchResourceEvent(authorHex, dTag);
        if (event?.content) {
          const parsed = parseModuleRichData(event.content);
          const templates =
            parsed.defaultActivities.length > 0
              ? parsed.defaultActivities.map((entry) =>
                  normalizeTemplate(entry, moduleLabel),
                )
              : [defaultTemplateForModule(moduleLabel)];
          moduleRichDataMap.set(moduleAddress, {
            guidance: parsed.guidance || resource.name,
            materials: parsed.materials,
            templates,
          });
          return;
        }
      } catch {
        // best-effort
      }

      moduleRichDataMap.set(moduleAddress, {
        guidance: resource.name,
        materials: [],
        templates: [defaultTemplateForModule(moduleLabel)],
      });
    }),
  );

  const results: Array<{
    instruction: Awaited<ReturnType<typeof getCreateActivityInstructionAsync>>;
    kind: DefaultActivityTemplateKind;
    moduleAddress: string;
  }> = [];

  let offset = 0;

  for (const module of params.course.modules) {
    const moduleAddress = String(module.resource);
    const moduleRichData = moduleRichDataMap.get(moduleAddress);
    const templates =
      moduleRichData?.templates?.length
        ? moduleRichData.templates
        : [defaultTemplateForModule("Module")];

    for (const template of templates) {
      const data = buildDefaultActivityData({
        template,
        moduleAddress,
        guidance: moduleRichData?.guidance,
        materials: moduleRichData?.materials,
      });

      if (new TextEncoder().encode(data).length > 512) {
        continue;
      }

      const instruction = await getCreateActivityInstructionAsync({
        activity: undefined,
        student: createPlaceholderSigner(params.studentWalletAddress),
        provider: providerPda,
        hub: undefined,
        systemProgram: undefined,
        creationTimestamp: BigInt(baseTs + offset),
        kind: ACTIVITY_KIND_TO_ENUM[template.kind],
        data,
        degreeId: null,
        course: address(params.courseAddress),
        resourceId: null,
        resourceKind: null,
      });

      results.push({ instruction, kind: template.kind, moduleAddress });
      offset += 1;
    }
  }

  return results;
}
