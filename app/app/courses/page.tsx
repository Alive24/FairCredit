"use client";

import { Header } from "@/components/header";
import { CourseList } from "@/components/courses/course-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { useEffect, useState } from "react";
import { FileText, Users, Loader2 } from "lucide-react";
import { fetchMaybeHub } from "@/lib/solana/generated/accounts";
import type { Hub } from "@/lib/solana/generated/accounts";
import { getUpdateHubConfigInstructionAsync } from "@/lib/solana/generated/instructions/updateHubConfig";
import { DEFAULT_PLACEHOLDER_SIGNER } from "@/lib/solana/placeholder-signer";
import { resolveAcceptedCourses } from "@/lib/solana/course-ref-resolver";

export default function CoursesPage() {
  const { rpc } = useFairCredit();
  const [hubData, setHubData] = useState<Hub | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptedCourseCount, setAcceptedCourseCount] = useState(0);

  useEffect(() => {
    async function fetchHubData() {
      try {
        // Get hub address from Codama instruction (it auto-resolves PDA)
        const instruction = await getUpdateHubConfigInstructionAsync({
          hub: undefined,
          authority: DEFAULT_PLACEHOLDER_SIGNER,
          config: {
            requireProviderApproval: false,
            minReputationScore: 0,
          },
        });
        const hubAddress = instruction.accounts[0].address;
        const hubAccount = await fetchMaybeHub(rpc, hubAddress);
        const hub = hubAccount.exists ? hubAccount.data : null;
        setHubData(hub);
        if (hub) {
          const resolved = await resolveAcceptedCourses(
            rpc,
            hub.acceptedCourses ?? []
          );
          setAcceptedCourseCount(resolved.length);
        } else {
          setAcceptedCourseCount(0);
        }
      } catch (error) {
        console.error("Failed to fetch hub data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchHubData();
  }, [rpc]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">FairCredit Courses</h1>
          <p className="text-muted-foreground">
            Browse available courses from accepted providers on the FairCredit
            platform
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Accepted Courses
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-2xl font-bold">{acceptedCourseCount}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Hub-accepted; available for credentials
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Accepted Providers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-2xl font-bold">
                  {hubData?.acceptedProviders?.length || 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Verified educators
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Course List */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Available Courses</h2>
          <CourseList />
        </div>
      </main>
    </div>
  );
}
