import { z } from "zod";
import { ActivityKind } from "@/lib/solana/generated/types/activityKind";
import { ResourceKind } from "@/lib/solana/generated/types/resourceKind";

export const ACTIVITY_KIND_OPTIONS = [
  "AddFeedback",
  "AddGrade",
  "SubmitAssignment",
  "ConsumeResource",
  "AttendMeeting",
] as const;

export type ActivityKindKey = (typeof ACTIVITY_KIND_OPTIONS)[number];

export const RESOURCE_KIND_OPTIONS = [
  "Assignment",
  "AssignmentSummative",
  "Meeting",
  "General",
  "Publication",
  "PublicationReviewed",
] as const;

export type ResourceKindKey = (typeof RESOURCE_KIND_OPTIONS)[number];

export const ACTIVITY_KIND_LABEL: Record<ActivityKindKey, string> = {
  AddFeedback: "Add Feedback",
  AddGrade: "Add Grade",
  SubmitAssignment: "Submit Assignment",
  ConsumeResource: "Consume Resource",
  AttendMeeting: "Attend Meeting",
};

export const RESOURCE_KIND_LABEL: Record<ResourceKindKey, string> = {
  Assignment: "Assignment",
  AssignmentSummative: "Summative Assignment",
  Meeting: "Meeting",
  General: "General",
  Publication: "Publication",
  PublicationReviewed: "Reviewed Publication",
};

export const ACTIVITY_KIND_TO_ENUM: Record<ActivityKindKey, ActivityKind> = {
  AddFeedback: ActivityKind.AddFeedback,
  AddGrade: ActivityKind.AddGrade,
  SubmitAssignment: ActivityKind.SubmitAssignment,
  ConsumeResource: ActivityKind.ConsumeResource,
  AttendMeeting: ActivityKind.AttendMeeting,
};

export const RESOURCE_KIND_TO_ENUM: Record<ResourceKindKey, ResourceKind> = {
  Assignment: ResourceKind.Assignment,
  AssignmentSummative: ResourceKind.AssignmentSummative,
  Meeting: ResourceKind.Meeting,
  General: ResourceKind.General,
  Publication: ResourceKind.Publication,
  PublicationReviewed: ResourceKind.PublicationReviewed,
};

export function activityKindKeyFromEnum(
  value: ActivityKind | number,
): ActivityKindKey | null {
  switch (value) {
    case ActivityKind.AddFeedback:
      return "AddFeedback";
    case ActivityKind.AddGrade:
      return "AddGrade";
    case ActivityKind.SubmitAssignment:
      return "SubmitAssignment";
    case ActivityKind.ConsumeResource:
      return "ConsumeResource";
    case ActivityKind.AttendMeeting:
      return "AttendMeeting";
    default:
      return null;
  }
}

export function parseCsvIdList(input: string): string[] {
  if (!input.trim()) return [];

  const unique = new Set<string>();
  for (const token of input.split(",")) {
    const value = token.trim();
    if (value) unique.add(value);
  }

  return Array.from(unique);
}

const idListSchema = z
  .array(z.string().trim().min(1).max(32))
  .max(10, "Maximum 10 IDs are allowed.");

const isoTimestampSchema = z
  .string()
  .min(1, "Timestamp is required.")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Timestamp must be a valid date/time.",
  });

const optionalModuleSchema = z
  .string()
  .trim()
  .max(128, "Module ID is too long.")
  .optional()
  .default("");

export const submitAssignmentCreateSchema = z.object({
  kind: z.literal("SubmitAssignment"),
  moduleId: optionalModuleSchema,
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(280),
  resourceId: z.string().trim().max(32).optional(),
  resourceKind: z.enum(RESOURCE_KIND_OPTIONS).optional(),
  evidenceLinks: z.array(z.string().trim().url()).max(5).default([]),
});

export const addFeedbackCreateSchema = z.object({
  kind: z.literal("AddFeedback"),
  moduleId: optionalModuleSchema,
  content: z.string().trim().min(2).max(512),
  assetIds: idListSchema.default([]),
  evidenceAssetIds: idListSchema.default([]),
});

export const addGradeCreateSchema = z.object({
  kind: z.literal("AddGrade"),
  moduleId: optionalModuleSchema,
  gradeValue: z.number().min(0).max(100),
  feedback: z.string().trim().max(512).optional(),
  assetIds: idListSchema.default([]),
  evidenceAssetIds: idListSchema.default([]),
});

export const attendMeetingCreateSchema = z.object({
  kind: z.literal("AttendMeeting"),
  moduleId: optionalModuleSchema,
  timestamp: isoTimestampSchema,
  note: z.string().trim().max(280).optional(),
});

export const consumeResourceCreateSchema = z.object({
  kind: z.literal("ConsumeResource"),
  moduleId: optionalModuleSchema,
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(280),
  resourceId: z.string().trim().min(1).max(32),
  resourceKind: z.enum(RESOURCE_KIND_OPTIONS),
  progress: z.number().min(0).max(100).optional(),
  reflection: z.string().trim().max(280).optional(),
});

export const activityCreateSchemaByKind = {
  SubmitAssignment: submitAssignmentCreateSchema,
  AddFeedback: addFeedbackCreateSchema,
  AddGrade: addGradeCreateSchema,
  AttendMeeting: attendMeetingCreateSchema,
  ConsumeResource: consumeResourceCreateSchema,
} as const;

export const activityCreateSchema = z.discriminatedUnion("kind", [
  submitAssignmentCreateSchema,
  addFeedbackCreateSchema,
  addGradeCreateSchema,
  attendMeetingCreateSchema,
  consumeResourceCreateSchema,
]);

export type ActivityCreateValues = z.infer<typeof activityCreateSchema>;

export type ActivityCreateValuesByKind = {
  [K in keyof typeof activityCreateSchemaByKind]: z.infer<
    (typeof activityCreateSchemaByKind)[K]
  >;
};
