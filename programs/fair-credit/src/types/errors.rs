use anchor_lang::prelude::*;

#[error_code]
pub enum ActivityError {
    #[msg("Too many assets attached to activity")]
    TooManyAssets,
}

#[error_code]
pub enum CourseError {
    #[msg("Too many weights for course")]
    TooManyWeights,
    #[msg("Too many resources for course")]
    TooManyResources,
    #[msg("Invalid progress percentage")]
    InvalidProgress,
}

#[error_code]
pub enum StudentError {
    #[msg("Student already enrolled in this degree/course")]
    AlreadyEnrolled,
    #[msg("Too many degrees for student")]
    TooManyDegrees,
    #[msg("Too many courses for student")]
    TooManyCourses,
    #[msg("Invalid email format")]
    InvalidEmail,
    #[msg("Too many skills")]
    TooManySkills,
    #[msg("Duplicate skill")]
    DuplicateSkill,
    #[msg("Too many achievements")]
    TooManyAchievements,
    #[msg("Too many certifications")]
    TooManyCertifications,
    #[msg("Duplicate certification")]
    DuplicateCertification,
}

#[error_code]
pub enum ResourceError {
    #[msg("Too many assets attached")]
    TooManyAssets,
    #[msg("Too many tags")]
    TooManyTags,
    #[msg("Duplicate tag")]
    DuplicateTag,
    #[msg("Too many teachers assigned")]
    TooManyTeachers,
    #[msg("Teacher already assigned to resource")]
    TeacherAlreadyAssigned,
    #[msg("Content too long")]
    ContentTooLong,
    #[msg("Invalid IPFS hash")]
    InvalidIPFSHash,
    #[msg("Invalid grade value")]
    InvalidGrade,
    #[msg("Submission not graded yet")]
    SubmissionNotGraded,
}

#[error_code]
pub enum CollegeError {
    #[msg("Too many degrees for college")]
    TooManyDegrees,
    #[msg("Degree already exists")]
    DegreeAlreadyExists,
    #[msg("Too many courses for college")]
    TooManyCourses,
    #[msg("Course already exists")]
    CourseAlreadyExists,
    #[msg("Too many required courses")]
    TooManyRequiredCourses,
    #[msg("Course already required")]
    CourseAlreadyRequired,
    #[msg("Too many elective courses")]
    TooManyElectiveCourses,
    #[msg("Elective already exists")]
    ElectiveAlreadyExists,
    #[msg("Too many prerequisites")]
    TooManyPrerequisites,
    #[msg("Prerequisite already exists")]
    PrerequisiteAlreadyExists,
    #[msg("Too many courses for faculty")]
    TooManyCoursesForFaculty,
    #[msg("Faculty course already exists")]
    FacultyCourseAlreadyExists,
    #[msg("Too many qualifications")]
    TooManyQualifications,
} 