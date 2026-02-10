"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { Award, Calendar, Clock, ChevronDown } from "lucide-react";
import { fetchMaybeHub } from "@/lib/solana/generated/accounts";
import { getUpdateHubConfigInstructionAsync } from "@/lib/solana/generated/instructions/updateHubConfig";
import { DEFAULT_PLACEHOLDER_SIGNER } from "@/lib/solana/placeholder-signer";
import { CourseStatus } from "@/lib/solana/generated/types/courseStatus";
import { resolveAcceptedCourses } from "@/lib/solana/course-ref-resolver";
import { fetchCredentialsByStudent } from "@/lib/solana/fetch-credentials";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";
import { PublicKey } from "@solana/web3.js";

interface Course {
  address: string;
  name: string;
  description: string;
  status: CourseStatus;
  workloadRequired: number;
  provider: string;
  created: Date;
  updated: Date;
  approvedCredentialsCount: number;
  collegeId?: string;
  degreeId?: string | null;
}

export function CourseList() {
  const { rpc } = useFairCredit();
  const { address: userAddress } = useAppKitAccount();
  const { connection } = useAppKitConnection();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseAddresses, setEnrolledCourseAddresses] = useState<
    Set<string>
  >(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Hub and Courses
        const hubInstruction = await getUpdateHubConfigInstructionAsync({
          hub: undefined,
          authority: DEFAULT_PLACEHOLDER_SIGNER,
          config: {
            requireProviderApproval: false,
            minReputationScore: 0,
          },
        });
        const hubAddress = hubInstruction.accounts[0].address;
        const hubAccount = await fetchMaybeHub(rpc, hubAddress);
        const hub = hubAccount.exists ? hubAccount.data : null;

        if (!hub) {
          setCourses([]);
          return;
        }

        const resolvedCourses = await resolveAcceptedCourses(
          rpc,
          hub.acceptedCourses ?? [],
        );

        const enrichedCourses = resolvedCourses.map(({ address, course }) => {
          const opt = course.degreeId as
            | { __option: string; value?: string }
            | undefined;
          const deg =
            opt &&
            typeof opt === "object" &&
            opt.__option === "Some" &&
            opt.value
              ? opt.value
              : null;
          return {
            address: String(address),
            name: course.name,
            description: course.description,
            status: course.status,
            workloadRequired: course.workloadRequired,
            provider: String(course.provider),
            created: new Date(Number(course.created) * 1000),
            updated: new Date(Number(course.updated) * 1000),
            approvedCredentialsCount: course.approvedCredentials?.length ?? 0,
            collegeId: course.collegeId ?? undefined,
            degreeId: deg ?? undefined,
          };
        });

        setCourses(enrichedCourses);

        // 2. Fetch User Credentials if connected
        if (userAddress && connection) {
          const credentials = await fetchCredentialsByStudent(
            connection,
            new PublicKey(userAddress),
          );
          const enrolled = new Set<string>();
          credentials.forEach((cred) => {
            if (cred.account.course) {
              enrolled.add(String(cred.account.course));
            }
          });
          setEnrolledCourseAddresses(enrolled);

          setDebugInfo(
            JSON.stringify(
              {
                userAddress: String(userAddress),
                courseAddresses: enrichedCourses.map((c) => c.address),
                enrolledCourseAddresses: Array.from(enrolled),
                credentialCourses: credentials.map((c) => c.account.course),
              },
              null,
              2,
            ),
          );
        } else {
          setEnrolledCourseAddresses(new Set());
          setDebugInfo(
            JSON.stringify(
              {
                userAddress: null,
                courseAddresses: enrichedCourses.map((c) => c.address),
                enrolledCourseAddresses: [],
                credentialCourses: [],
              },
              null,
              2,
            ),
          );
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load courses. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [rpc, userAddress]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            No courses available at the moment
          </p>
        </CardContent>
      </Card>
    );
  }

  const enrolledCourses = courses.filter((c) =>
    enrolledCourseAddresses.has(c.address),
  );
  const availableCourses = courses.filter(
    (c) => !enrolledCourseAddresses.has(c.address),
  );

  const CourseCard = ({
    course,
    isEnrolled,
  }: {
    course: Course;
    isEnrolled: boolean;
  }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{course.name}</CardTitle>
            <CardDescription className="mt-1">
              {course.address.slice(0, 8)}…
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {course.status === CourseStatus.Draft
              ? "Draft"
              : course.status === CourseStatus.InReview
              ? "In Review"
              : course.status === CourseStatus.Accepted
              ? "Accepted"
              : course.status === CourseStatus.Archived
              ? "Archived"
              : "Unknown"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {course.description}
        </p>

        {(course.collegeId || course.degreeId) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {course.collegeId && (
              <Badge variant="secondary" className="text-xs">
                {course.collegeId}
              </Badge>
            )}
            {course.degreeId && (
              <Badge variant="outline" className="text-xs">
                {course.degreeId}
              </Badge>
            )}
          </div>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{course.workloadRequired} hours workload</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Created {course.created.toLocaleDateString()}</span>
          </div>

          {typeof course.approvedCredentialsCount === "number" &&
            course.approvedCredentialsCount > 0 && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span>
                  {course.approvedCredentialsCount} credential(s) approved
                </span>
              </div>
            )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button className="w-full" size="sm" asChild>
            <Link href={`/courses/${course.address}`}>View Details</Link>
          </Button>
          {!isEnrolled && course.status === CourseStatus.Accepted && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/courses/${course.address}`}>Enroll</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-12">
      {enrolledCourses.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Enrolled Courses
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((course) => (
              <CourseCard
                key={course.address}
                course={course}
                isEnrolled={true}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-semibold mb-6">Available Courses</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {availableCourses.map((course) => (
            <CourseCard
              key={course.address}
              course={course}
              isEnrolled={false}
            />
          ))}
        </div>
      </div>

      {/* Debugging Info Card */}
      <Card className="mt-6">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setDebugOpen((prev) => !prev)}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Debugging Info</CardTitle>
              <CardDescription>
                Enrollment detection debug data for the courses page.
              </CardDescription>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                debugOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </CardHeader>
        {debugOpen && (
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">
                  Connected Wallet Address
                </p>
                <p className="font-mono break-all">
                  {userAddress ? String(userAddress) : "Not connected"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Enrolled Course Addresses (derived from credentials)
                </p>
                <p className="font-mono break-all">
                  {Array.from(enrolledCourseAddresses).length > 0
                    ? Array.from(enrolledCourseAddresses).join(", ")
                    : "[]"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Raw Debug Payload (JSON)
                </p>
                <pre className="text-xs bg-muted/40 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
                  {debugInfo ?? "—"}
                </pre>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
