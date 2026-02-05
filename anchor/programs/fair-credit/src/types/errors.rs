use anchor_lang::prelude::*;

#[error_code]
pub enum ActivityError {
    #[msg("Too many assets attached to activity")]
    TooManyAssets,
    #[msg("Creation timestamp must be within ±5 minutes of current time")]
    InvalidCreationTimestamp,
}

#[error_code]
pub enum CourseError {
    #[msg("Creation timestamp must be within ±5 minutes of current time")]
    InvalidCreationTimestamp,
    #[msg("Too many modules for course")]
    TooManyModules,
    #[msg("Too many resources for course")]
    TooManyResources,
    #[msg("Invalid progress percentage")]
    InvalidProgress,
    #[msg("Credential already in approved list")]
    CredentialAlreadyApproved,
    #[msg("Too many approved credentials")]
    TooManyApprovedCredentials,
    #[msg("Course must be Verified (active) to create credentials")]
    CourseNotActive,
    #[msg("Caller is not authorized to update this course")]
    UnauthorizedCourseAuthority,
    #[msg("Nostr reference already set; use force=true to override")]
    NostrRefAlreadySet,
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
    #[msg("Creation timestamp must be within ±5 minutes of current time")]
    InvalidCreationTimestamp,
    #[msg("Too many assets attached")]
    TooManyAssets,
    #[msg("Too many tags")]
    TooManyTags,
    #[msg("Duplicate tag")]
    DuplicateTag,
    #[msg("Invalid grade value")]
    InvalidGrade,
    #[msg("Submission not graded yet")]
    SubmissionNotGraded,
    #[msg("Caller is not authorized to update this entity")]
    UnauthorizedResourceAuthority,
    #[msg("Nostr reference already set; use force=true to override")]
    NostrRefAlreadySet,
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

#[error_code]
pub enum ProviderError {
    #[msg("Unauthorized provider action")]
    UnauthorizedProviderAction,
    #[msg("Provider already suspended by this verifier")]
    AlreadySuspended,
    #[msg("Provider not suspended by this verifier")]
    NotSuspended,
    #[msg("Cannot suspend yourself")]
    CannotSuspendSelf,
    #[msg("Suspension note too long")]
    NoteTooLong,
    #[msg("Invalid reputation score (must be 0-100)")]
    InvalidReputationScore,
}

#[error_code]
pub enum CredentialError {
    #[msg("Credential must be Endorsed before provider can approve")]
    NotEndorsed,
    #[msg("Credential must be Verified before student can mint NFT")]
    NotVerified,
    #[msg("Credential NFT has already been minted")]
    AlreadyMinted,
    #[msg("Only the designated mentor can endorse this credential")]
    UnauthorizedEndorser,
    #[msg("Too many activities linked to this credential")]
    TooManyActivities,
    #[msg("Activity must be created by the same student as the credential")]
    ActivityNotOwnedByStudent,
    #[msg("Activity already linked to this credential")]
    ActivityAlreadyLinked,
}

#[error_code]
pub enum HubError {
    #[msg("Unauthorized hub action")]
    UnauthorizedHubAction,
    #[msg("Provider already accepted")]
    ProviderAlreadyAccepted,
    #[msg("Provider not in accepted list")]
    ProviderNotAccepted,
    #[msg("Hub list capacity reached")]
    HubListCapacityReached,
    #[msg("Course already accepted")]
    CourseAlreadyAccepted,
    #[msg("Course not in accepted list")]
    CourseNotAccepted,
    #[msg("Course list already registered in hub")]
    CourseListAlreadyRegistered,
    #[msg("Course list must be registered in hub before use")]
    CourseListNotRegistered,
    #[msg("Course list is full")]
    CourseListFull,
    #[msg("Course list reference required")]
    CourseListReferenceRequired,
}
