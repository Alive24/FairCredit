"use client";

import { useEffect, useState } from "react";
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
import { Calendar, Clock, User } from "lucide-react";
import { address } from "@solana/kit";
import {
  fetchMaybeHub,
  fetchMaybeProvider,
  fetchMaybeCourse,
} from "@/lib/solana/generated/accounts";
import { getUpdateHubConfigInstructionAsync } from "@/lib/solana/generated/instructions/updateHubConfig";
import { getAddAcceptedCourseInstructionAsync } from "@/lib/solana/generated/instructions/addAcceptedCourse";
import { getAddAcceptedProviderInstructionAsync } from "@/lib/solana/generated/instructions/addAcceptedProvider";
import { DEFAULT_PLACEHOLDER_SIGNER } from "@/lib/solana/placeholder-signer";
import type { Course as CourseAccount } from "@/lib/solana/generated/accounts";

interface Course {
  id: string;
  name: string;
  description: string;
  status: any;
  workloadRequired: number;
  provider: string;
  providerName: string;
  providerEmail: string;
  created: Date;
  updated: Date;
}

export function CourseList() {
  const { rpc } = useFairCredit();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        setLoading(true);
        setError(null);
        // Get hub address from Codama instruction (it auto-resolves PDA)
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

        // Fetch and enrich courses with provider data.
        // Hub stores acceptedCourses as courseIds only; course PDA is (provider, courseId).
        // Try each (providerWallet, courseId) for accepted providers until we find the course.
        const enrichedCourses = await Promise.all(
          (hub.acceptedCourses ?? []).map(async (courseId) => {
            const providers = hub.acceptedProviders ?? [];
            for (const prov of providers) {
              const providerWallet =
                typeof prov === "string" ? prov : String(prov);
              const courseInstruction =
                await getAddAcceptedCourseInstructionAsync({
                  hub: undefined,
                  authority: DEFAULT_PLACEHOLDER_SIGNER,
                  course: undefined,
                  courseId,
                  providerWallet: address(providerWallet),
                });
              const courseAddress = courseInstruction.accounts[3].address;
              const courseAccount = await fetchMaybeCourse(rpc, courseAddress);
              if (!courseAccount.exists) continue;
              const courseData = courseAccount.data;

              const providerAddress =
                typeof courseData.provider === "string"
                  ? courseData.provider
                  : String(courseData.provider);
              const providerInstruction =
                await getAddAcceptedProviderInstructionAsync({
                  hub: undefined,
                  authority: DEFAULT_PLACEHOLDER_SIGNER,
                  provider: undefined,
                  providerWallet: address(providerAddress),
                });
              const providerAddressPDA =
                providerInstruction.accounts[2].address;
              const providerAccount = await fetchMaybeProvider(
                rpc,
                providerAddressPDA,
              );
              const provider = providerAccount.exists
                ? providerAccount.data
                : null;

              return {
                id: courseId,
                name: courseData.name,
                description: courseData.description,
                status: courseData.status,
                workloadRequired: courseData.workloadRequired,
                provider:
                  typeof courseData.provider === "string"
                    ? courseData.provider
                    : String(courseData.provider),
                providerName: provider?.name ?? "Unknown Provider",
                providerEmail: provider?.email ?? "",
                created: new Date(Number(courseData.created) * 1000),
                updated: new Date(Number(courseData.updated) * 1000),
              };
            }
            return null;
          }),
        );

        setCourses(
          enrichedCourses.filter((c): c is NonNullable<typeof c> => c !== null),
        );
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setError("Failed to load courses. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, [rpc]);

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

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <Card key={course.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{course.name}</CardTitle>
                <CardDescription className="mt-1">{course.id}</CardDescription>
              </div>
              <Badge variant="secondary">
                {course.status?.draft
                  ? "Draft"
                  : course.status?.published
                  ? "Published"
                  : course.status?.archived
                  ? "Archived"
                  : "Unknown"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {course.description}
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{course.providerName}</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{course.workloadRequired} hours workload</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Created {course.created.toLocaleDateString()}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button className="w-full" size="sm">
                View Details
              </Button>
              <Button variant="outline" size="sm">
                Enroll
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
