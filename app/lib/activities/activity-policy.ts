import type { UserRole } from "@/hooks/use-user-role";
import type { ActivityKindKey } from "@/lib/activities/activity-form-schema";

export type ActivityAction =
  | "create"
  | "add_feedback"
  | "add_attendance"
  | "add_grade"
  | "archive";

const ACTION_POLICY: Record<ActivityAction, ReadonlyArray<UserRole>> = {
  create: ["student"],
  add_feedback: ["student"],
  add_attendance: ["student"],
  add_grade: ["supervisor"],
  archive: ["supervisor"],
};

export function canPerformActivityAction(
  role: UserRole,
  action: ActivityAction,
): boolean {
  const allowed = ACTION_POLICY[action];
  return allowed.includes(role);
}

export function getCreateActivityKindsForRole(
  role: UserRole,
  opts?: { existingActivityContext?: boolean },
): ActivityKindKey[] {
  if (role === "student") {
    return [
      "SubmitAssignment",
      "AttendMeeting",
      "AddFeedback",
    ];
  }

  if (role === "supervisor" && opts?.existingActivityContext) {
    return ["AddGrade"];
  }

  return [];
}

export const ROLE_INTENT_NOTICE: Record<ActivityAction, string> = {
  create: "Only students can create activity records in this frontend flow.",
  add_feedback: "Only students can add feedback in this frontend flow.",
  add_attendance:
    "Only students can mark attendance in this frontend flow.",
  add_grade: "Only supervisors can add grades in this frontend flow.",
  archive: "Only supervisors can archive activities in this frontend flow.",
};
