import {
  richTextToPlain,
  type ModuleDefaultActivityTemplate,
  type ModuleDefaultActivityTemplateKind,
} from "@/lib/resource-nostr-content";

export function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.trim().toLowerCase();
  if (normalized.length % 2 !== 0) {
    if (normalized.length !== 64) {
      console.warn("Invalid hex length", normalized.length);
    }
  }
  if (normalized.length % 2 !== 0) throw new Error("Invalid hex string");

  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.substr(i, 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array | number[] | unknown): string {
  if (!bytes) return "";
  if (
    bytes instanceof Uint8Array ||
    Array.isArray(bytes) ||
    (typeof bytes === "object" && bytes !== null && "length" in bytes)
  ) {
    return Array.from(bytes as ArrayLike<number>)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return "";
}

export const DEFAULT_ACTIVITY_TEMPLATE_KINDS: ModuleDefaultActivityTemplateKind[] = [
  "AttendMeeting",
  "AddFeedback",
  "SubmitAssignment",
];

export const DEFAULT_ACTIVITY_TEMPLATE_LABEL: Record<
  ModuleDefaultActivityTemplateKind,
  string
> = {
  AttendMeeting: "Attendance Tracker",
  AddFeedback: "Feedback Tracker",
  SubmitAssignment: "Assignment Tracker",
};

export type DefaultActivityTemplateDraft = {
  enabled: boolean;
  title: string;
  description: string;
  requiredAttendance: string;
  requiredEvidenceCount: string;
  requiredFeedbackEntries: string;
};

export type DefaultActivityTemplateDraftMap = Record<
  ModuleDefaultActivityTemplateKind,
  DefaultActivityTemplateDraft
>;

function parsePositiveInteger(input: string): number | undefined {
  if (!input.trim()) return undefined;
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return undefined;
  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : undefined;
}

export function buildDefaultActivityDraftMap(
  templates: ModuleDefaultActivityTemplate[],
): DefaultActivityTemplateDraftMap {
  const fallback = (kind: ModuleDefaultActivityTemplateKind) => ({
    enabled: false,
    title: DEFAULT_ACTIVITY_TEMPLATE_LABEL[kind],
    description: "",
    requiredAttendance: "",
    requiredEvidenceCount: "",
    requiredFeedbackEntries: "",
  });

  const next: DefaultActivityTemplateDraftMap = {
    AttendMeeting: fallback("AttendMeeting"),
    AddFeedback: fallback("AddFeedback"),
    SubmitAssignment: fallback("SubmitAssignment"),
  };

  templates.forEach((template) => {
    next[template.kind] = {
      enabled: true,
      title: template.title || DEFAULT_ACTIVITY_TEMPLATE_LABEL[template.kind],
      description: template.description || "",
      requiredAttendance:
        typeof template.requiredAttendance === "number"
          ? String(template.requiredAttendance)
          : "",
      requiredEvidenceCount:
        typeof template.requiredEvidenceCount === "number"
          ? String(template.requiredEvidenceCount)
          : "",
      requiredFeedbackEntries:
        typeof template.requiredFeedbackEntries === "number"
          ? String(template.requiredFeedbackEntries)
          : "",
    };
  });

  return next;
}

export function buildDefaultActivityTemplates(
  drafts: DefaultActivityTemplateDraftMap,
): ModuleDefaultActivityTemplate[] {
  const templates: ModuleDefaultActivityTemplate[] = [];

  DEFAULT_ACTIVITY_TEMPLATE_KINDS.forEach((kind) => {
    const draft = drafts[kind];
    if (!draft.enabled) return;

    const title = draft.title.trim() || DEFAULT_ACTIVITY_TEMPLATE_LABEL[kind];
    const description = draft.description.trim();

    if (kind === "AttendMeeting") {
      templates.push({
        kind,
        title,
        description,
        requiredAttendance: parsePositiveInteger(draft.requiredAttendance),
      });
      return;
    }

    if (kind === "AddFeedback") {
      templates.push({
        kind,
        title,
        description,
        requiredFeedbackEntries: parsePositiveInteger(
          draft.requiredFeedbackEntries,
        ),
      });
      return;
    }

    templates.push({
      kind,
      title,
      description,
      requiredEvidenceCount: parsePositiveInteger(draft.requiredEvidenceCount),
    });
  });

  return templates;
}

export function buildModuleRichSignature(params: {
  content: string;
  guidance: string;
  materialsRich: string;
  defaultActivityDrafts: DefaultActivityTemplateDraftMap;
}): string {
  const snapshot = {
    content: params.content.trim(),
    guidance: params.guidance.trim(),
    materialsRich: params.materialsRich.trim(),
    defaultActivities: buildDefaultActivityTemplates(params.defaultActivityDrafts),
  };
  return JSON.stringify(snapshot);
}

export function summarizeMaterialsFromRich(input: string): string[] {
  const plain = richTextToPlain(input);
  if (!plain) return [];
  const unique = new Set<string>();
  plain.split(/[\n,]/).forEach((entry) => {
    const normalized = entry.trim();
    if (normalized) unique.add(normalized);
  });
  return Array.from(unique).slice(0, 12);
}
