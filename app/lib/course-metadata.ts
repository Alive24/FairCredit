import type { CourseProfile } from "@/lib/course-profile";

export type CourseMetadataPayload = {
  version: 1;
  courseAddress: string;
  creationTimestamp: number;
  title: string;
  description: string;
  category: string;
  durationValue: string;
  durationUnit: "weeks" | "months" | "years";
  supervisorName: string;
  supervisorEmail: string;
  supervisorInstitution: string;
  learningObjectives: string;
  methodology: string;
  assessmentCriteria: string;
  deliverables: string;
  prerequisites: string;
  skills: string[];
  requirements: string[];
  tags: string[];
  updatedAt: string;
};

const DEFAULT_UNIT: CourseMetadataPayload["durationUnit"] = "weeks";

export function buildCourseMetadataPayload(
  profile: CourseProfile,
  params: { courseAddress: string; creationTimestamp: number },
): CourseMetadataPayload {
  return {
    version: 1,
    courseAddress: params.courseAddress,
    creationTimestamp: params.creationTimestamp,
    title: profile.title ?? "",
    description: profile.description ?? "",
    category: profile.category ?? "",
    durationValue: profile.durationValue ?? "",
    durationUnit: profile.durationUnit ?? DEFAULT_UNIT,
    supervisorName: profile.supervisorName ?? "",
    supervisorEmail: profile.supervisorEmail ?? "",
    supervisorInstitution: profile.supervisorInstitution ?? "",
    learningObjectives: profile.learningObjectives ?? "",
    methodology: profile.methodology ?? "",
    assessmentCriteria: profile.assessmentCriteria ?? "",
    deliverables: profile.deliverables ?? "",
    prerequisites: profile.prerequisites ?? "",
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    requirements: Array.isArray(profile.requirements) ? profile.requirements : [],
    tags: Array.isArray(profile.tags) ? profile.tags : [],
    updatedAt: new Date().toISOString(),
  };
}

export function parseCourseMetadataPayload(
  content: string,
): CourseMetadataPayload | null {
  try {
    const parsed = JSON.parse(content) as Partial<CourseMetadataPayload>;
    if (parsed.version !== 1) return null;
    return {
      version: 1,
      courseAddress: parsed.courseAddress ?? "",
      creationTimestamp: Number(parsed.creationTimestamp ?? 0),
      title: parsed.title ?? "",
      description: parsed.description ?? "",
      category: parsed.category ?? "",
      durationValue: parsed.durationValue ?? "",
      durationUnit:
        parsed.durationUnit === "months" || parsed.durationUnit === "years"
          ? parsed.durationUnit
          : DEFAULT_UNIT,
      supervisorName: parsed.supervisorName ?? "",
      supervisorEmail: parsed.supervisorEmail ?? "",
      supervisorInstitution: parsed.supervisorInstitution ?? "",
      learningObjectives: parsed.learningObjectives ?? "",
      methodology: parsed.methodology ?? "",
      assessmentCriteria: parsed.assessmentCriteria ?? "",
      deliverables: parsed.deliverables ?? "",
      prerequisites: parsed.prerequisites ?? "",
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      updatedAt: parsed.updatedAt ?? "",
    };
  } catch {
    return null;
  }
}

export function applyCourseMetadataToProfile(
  profile: CourseProfile,
  payload: CourseMetadataPayload,
): CourseProfile {
  return {
    ...profile,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    durationValue: payload.durationValue,
    durationUnit: payload.durationUnit,
    supervisorName: payload.supervisorName,
    supervisorEmail: payload.supervisorEmail,
    supervisorInstitution: payload.supervisorInstitution,
    learningObjectives: payload.learningObjectives,
    methodology: payload.methodology,
    assessmentCriteria: payload.assessmentCriteria,
    deliverables: payload.deliverables,
    prerequisites: payload.prerequisites,
    skills: payload.skills,
    requirements: payload.requirements,
    tags: payload.tags,
    updatedAt: payload.updatedAt,
  };
}
