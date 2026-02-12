import type {
  ActivityKindKey,
  ResourceKindKey,
} from "@/lib/activities/activity-form-schema";

export interface ActivityModuleRef {
  module_pubkey: string;
  progress?: number;
}

export interface SubmitAssignmentData {
  kind: "SubmitAssignment";
  title: string;
  description: string;
  evidenceLinks: string[];
  resourceId?: string;
  resourceKind?: ResourceKindKey;
  modules: ActivityModuleRef[];
}

export interface AddFeedbackData {
  kind: "AddFeedback";
  content: string;
  assetIds: string[];
  evidenceAssetIds: string[];
  modules: ActivityModuleRef[];
}

export interface AddGradeData {
  kind: "AddGrade";
  gradeValue: number;
  feedback?: string;
  assetIds: string[];
  evidenceAssetIds: string[];
  modules: ActivityModuleRef[];
}

export interface AttendMeetingData {
  kind: "AttendMeeting";
  timestamp: string;
  note?: string;
  attendanceRecords?: string[];
  modules: ActivityModuleRef[];
}

export interface ConsumeResourceData {
  kind: "ConsumeResource";
  title: string;
  description: string;
  resourceId: string;
  resourceKind: ResourceKindKey;
  progress?: number;
  reflection?: string;
  modules: ActivityModuleRef[];
}

export type ActivityData =
  | SubmitAssignmentData
  | AddFeedbackData
  | AddGradeData
  | AttendMeetingData
  | ConsumeResourceData;

export type ParsedActivityData = {
  raw: string;
  parsed: ActivityData | null;
  title: string;
  description: string;
  modules: ActivityModuleRef[];
  evidenceLinks: string[];
  kind: ActivityKindKey | null;
};

const RESOURCE_KIND_SET = new Set<string>([
  "Assignment",
  "AssignmentSummative",
  "Meeting",
  "General",
  "Publication",
  "PublicationReviewed",
]);

function normalizeModuleRef(input: unknown): ActivityModuleRef | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const value = input as Record<string, unknown>;
  const modulePubkey =
    typeof value.module_pubkey === "string" ? value.module_pubkey : null;

  if (!modulePubkey) return null;

  const progress =
    typeof value.progress === "number" && Number.isFinite(value.progress)
      ? value.progress
      : undefined;

  return {
    module_pubkey: modulePubkey,
    progress,
  };
}

function normalizeModules(input: unknown): ActivityModuleRef[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => normalizeModuleRef(item))
    .filter((item): item is ActivityModuleRef => item !== null);
}

export function isSubmitAssignmentData(value: unknown): value is SubmitAssignmentData {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.kind === "SubmitAssignment" &&
    typeof obj.title === "string" &&
    typeof obj.description === "string" &&
    Array.isArray(obj.modules) &&
    Array.isArray(obj.evidenceLinks)
  );
}

export function isAddFeedbackData(value: unknown): value is AddFeedbackData {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.kind === "AddFeedback" &&
    typeof obj.content === "string" &&
    Array.isArray(obj.modules) &&
    Array.isArray(obj.assetIds) &&
    Array.isArray(obj.evidenceAssetIds)
  );
}

export function isAddGradeData(value: unknown): value is AddGradeData {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.kind === "AddGrade" &&
    typeof obj.gradeValue === "number" &&
    Number.isFinite(obj.gradeValue) &&
    Array.isArray(obj.modules) &&
    Array.isArray(obj.assetIds) &&
    Array.isArray(obj.evidenceAssetIds)
  );
}

export function isAttendMeetingData(value: unknown): value is AttendMeetingData {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.kind === "AttendMeeting" &&
    typeof obj.timestamp === "string" &&
    Array.isArray(obj.modules)
  );
}

export function isConsumeResourceData(value: unknown): value is ConsumeResourceData {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.kind === "ConsumeResource" &&
    typeof obj.title === "string" &&
    typeof obj.description === "string" &&
    typeof obj.resourceId === "string" &&
    typeof obj.resourceKind === "string" &&
    RESOURCE_KIND_SET.has(obj.resourceKind) &&
    Array.isArray(obj.modules)
  );
}

export function parseActivityData(raw: string): ParsedActivityData {
  const invalidPayload: ParsedActivityData = {
    raw,
    parsed: null,
    title: "Invalid Activity Data",
    description: "Unsupported activity payload format.",
    modules: [],
    evidenceLinks: [],
    kind: null,
  };

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (isSubmitAssignmentData(parsed)) {
      return {
        raw,
        parsed: {
          ...parsed,
          modules: normalizeModules(parsed.modules),
          evidenceLinks: parsed.evidenceLinks
            .filter((entry) => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter(Boolean),
        },
        title: parsed.title,
        description: parsed.description,
        modules: normalizeModules(parsed.modules),
        evidenceLinks: parsed.evidenceLinks,
        kind: "SubmitAssignment",
      };
    }

    if (isAddFeedbackData(parsed)) {
      return {
        raw,
        parsed: {
          ...parsed,
          modules: normalizeModules(parsed.modules),
        },
        title: "Feedback Added",
        description: parsed.content,
        modules: normalizeModules(parsed.modules),
        evidenceLinks: [],
        kind: "AddFeedback",
      };
    }

    if (isAddGradeData(parsed)) {
      return {
        raw,
        parsed: {
          ...parsed,
          modules: normalizeModules(parsed.modules),
        },
        title: "Grade Added",
        description: parsed.feedback?.trim() || `Grade: ${parsed.gradeValue}`,
        modules: normalizeModules(parsed.modules),
        evidenceLinks: [],
        kind: "AddGrade",
      };
    }

    if (isAttendMeetingData(parsed)) {
      return {
        raw,
        parsed: {
          ...parsed,
          modules: normalizeModules(parsed.modules),
        },
        title: "Meeting Attendance",
        description: parsed.note?.trim() || `Attended at ${parsed.timestamp}`,
        modules: normalizeModules(parsed.modules),
        evidenceLinks: [],
        kind: "AttendMeeting",
      };
    }

    if (isConsumeResourceData(parsed)) {
      return {
        raw,
        parsed: {
          ...parsed,
          modules: normalizeModules(parsed.modules),
        },
        title: parsed.title,
        description: parsed.description,
        modules: normalizeModules(parsed.modules),
        evidenceLinks: [],
        kind: "ConsumeResource",
      };
    }

    return invalidPayload;
  } catch {
    return invalidPayload;
  }
}
