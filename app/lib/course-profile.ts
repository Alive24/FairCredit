export type CourseProfile = {
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
  status: "draft" | "published";
  skills: string[];
  requirements: string[];
  tags: string[];
  updatedAt: string | null;
};

export const emptyCourseProfile: CourseProfile = {
  title: "",
  description: "",
  category: "",
  durationValue: "",
  durationUnit: "weeks",
  supervisorName: "",
  supervisorEmail: "",
  supervisorInstitution: "",
  learningObjectives: "",
  methodology: "",
  assessmentCriteria: "",
  deliverables: "",
  prerequisites: "",
  status: "draft",
  skills: [],
  requirements: [],
  tags: [],
  updatedAt: null,
};
