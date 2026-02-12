import { address, type Address } from "@solana/kit";
import type { Course } from "@/lib/solana/generated/accounts/course";
import type { Resource } from "@/lib/solana/generated/accounts/resource";
import { fetchAllMaybeResource } from "@/lib/solana/generated/accounts/resource";
import { getCreateActivityInstructionAsync } from "@/lib/solana/generated/instructions/createActivity";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { getProviderPDA } from "@/lib/solana/pda";
import { ACTIVITY_KIND_TO_ENUM } from "@/lib/activities/activity-form-schema";

export type DefaultActivityTemplateKind =
  | "AttendMeeting"
  | "AddFeedback"
  | "SubmitAssignment";

const DEFAULT_KIND_SET = new Set<DefaultActivityTemplateKind>([
  "AttendMeeting",
  "AddFeedback",
  "SubmitAssignment",
]);

export const DEFAULT_ACTIVITY_TAG_PREFIX = "default_activity:";

export const DEFAULT_ACTIVITY_TEMPLATE_OPTIONS: DefaultActivityTemplateKind[] = [
  "AttendMeeting",
  "AddFeedback",
  "SubmitAssignment",
];

export function extractDefaultActivityKindsFromTags(
  tags: string[],
): DefaultActivityTemplateKind[] {
  const kinds = tags
    .filter((tag) => tag.startsWith(DEFAULT_ACTIVITY_TAG_PREFIX))
    .map((tag) => tag.slice(DEFAULT_ACTIVITY_TAG_PREFIX.length))
    .filter((entry): entry is DefaultActivityTemplateKind =>
      DEFAULT_KIND_SET.has(entry as DefaultActivityTemplateKind),
    );

  return Array.from(new Set(kinds));
}

export function applyDefaultActivityKindsToTags(
  tags: string[],
  kinds: DefaultActivityTemplateKind[],
): string[] {
  const sanitizedKinds = Array.from(new Set(kinds)).filter((entry) =>
    DEFAULT_KIND_SET.has(entry),
  );

  const preserved = tags.filter(
    (tag) => !tag.startsWith(DEFAULT_ACTIVITY_TAG_PREFIX),
  );
  const encoded = sanitizedKinds.map(
    (kind) => `${DEFAULT_ACTIVITY_TAG_PREFIX}${kind}`,
  );

  return [...preserved, ...encoded];
}

export function getModuleDefaultActivityKindsFromResource(
  resource: Resource | null | undefined,
): DefaultActivityTemplateKind[] {
  if (!resource) return ["AttendMeeting"];
  const fromTags = extractDefaultActivityKindsFromTags(resource.tags);
  if (fromTags.length > 0) {
    return fromTags;
  }
  return ["AttendMeeting"];
}

function buildDefaultActivityData(params: {
  kind: DefaultActivityTemplateKind;
  moduleAddress: string;
  moduleLabel: string;
}): string {
  const modules = [{ module_pubkey: params.moduleAddress }];

  if (params.kind === "AttendMeeting") {
    return JSON.stringify({
      kind: "AttendMeeting",
      timestamp: new Date().toISOString(),
      note: `Attendance tracker for ${params.moduleLabel}`,
      attendanceRecords: [],
      modules,
    });
  }

  if (params.kind === "AddFeedback") {
    return JSON.stringify({
      kind: "AddFeedback",
      content: `Feedback tracker for ${params.moduleLabel}`,
      assetIds: [],
      evidenceAssetIds: [],
      modules,
    });
  }

  return JSON.stringify({
    kind: "SubmitAssignment",
    title: `${params.moduleLabel} - Assignment Tracker`,
    description:
      "Default assignment tracker created at enrollment. Update with real submission details.",
    evidenceLinks: [],
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

  const results: Array<{
    instruction: Awaited<ReturnType<typeof getCreateActivityInstructionAsync>>;
    kind: DefaultActivityTemplateKind;
    moduleAddress: string;
  }> = [];

  let offset = 0;

  for (const module of params.course.modules) {
    const moduleAddress = String(module.resource);
    const moduleLabel = String(moduleAddress).slice(0, 8);
    const kinds = getModuleDefaultActivityKindsFromResource(
      moduleResourceMap.get(moduleAddress),
    );

    for (const kind of kinds) {
      const data = buildDefaultActivityData({
        kind,
        moduleAddress,
        moduleLabel,
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
        kind: ACTIVITY_KIND_TO_ENUM[kind],
        data,
        degreeId: null,
        course: address(params.courseAddress),
        resourceId: null,
        resourceKind: null,
      });

      results.push({ instruction, kind, moduleAddress });
      offset += 1;
    }
  }

  return results;
}
