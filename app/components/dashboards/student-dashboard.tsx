"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, GraduationCap, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";
import { useFairCredit } from "@/hooks/use-fair-credit";
import {
  fetchCredentialsByStudent,
  type EnrolledCredential,
} from "@/lib/solana/fetch-credentials";
import {
  fetchAllMaybeCourse,
  type Course,
} from "@/lib/solana/generated/accounts/course";
import { Address } from "@solana/kit";
import { PublicKey } from "@solana/web3.js";

type EnrolledCourse = {
  credential: EnrolledCredential;
  course: Course | null;
  courseAddress: string;
};

export function StudentDashboard() {
  const { address, isConnected } = useAppKitAccount();
  const { connection } = useAppKitConnection();
  const { rpc } = useFairCredit();
  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadEnrollments() {
      if (!address || !isConnected || !connection) {
        setEnrollments([]);
        return;
      }

      setIsLoading(true);
      try {
        // 1. Fetch credentials
        const credentials = await fetchCredentialsByStudent(
          connection,
          new PublicKey(address),
        );

        if (credentials.length === 0) {
          setEnrollments([]);
          setIsLoading(false);
          return;
        }

        // 2. Extract course addresses
        const courseAddresses = credentials.map((c) =>
          String(c.account.course),
        );

        // 3. Batch fetch courses
        const courses = await fetchAllMaybeCourse(
          rpc,
          courseAddresses as Address[],
        );

        // 4. Combine data
        const combined: EnrolledCourse[] = credentials.map((cred, index) => {
          const maybeCourse = courses[index];
          return {
            credential: cred,
            course: maybeCourse.exists ? maybeCourse.data : null,
            courseAddress: courseAddresses[index],
          };
        });

        setEnrollments(combined);
      } catch (error) {
        console.error("Failed to load enrollments:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadEnrollments();
  }, [address, isConnected, connection, rpc]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Student Dashboard</h1>
            <p className="text-muted-foreground">
              Browse courses, register, and track your credentials
            </p>
          </div>
        </div>

        {/* Enrolled Courses Section */}
        {isConnected && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">My Enrollments</h2>
            {isLoading ? (
              <div className="flex items-center justify-center p-8 border rounded-lg bg-card">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : enrollments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollments.map(({ credential, course, courseAddress }) => (
                  <Link
                    key={credential.publicKey.toBase58()}
                    href={`/courses/${courseAddress}`}
                    className="block group"
                  >
                    <Card className="h-full group-hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-1">
                          <Badge variant="outline">COURSE</Badge>
                          {/* Status Badge could go here depending on credential status */}
                        </div>
                        <CardTitle className="line-clamp-1">
                          {course?.name || "Unknown Course"}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {course?.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground">
                          <p>
                            Credential ID:{" "}
                            {String(credential.publicKey).slice(0, 8)}...
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>You haven't enrolled in any courses yet.</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link href="/courses">Browse available courses</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Getting Started */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              How It Works
            </CardTitle>
            <CardDescription>
              Your academic credentials, verified on the blockchain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center p-4 rounded-lg border bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <span className="text-lg font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold mb-1">Browse & Register</h3>
                <p className="text-sm text-muted-foreground">
                  Find an accepted course and register directly from its detail
                  page.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-lg border bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <span className="text-lg font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold mb-1">Complete Activities</h3>
                <p className="text-sm text-muted-foreground">
                  Record learning activities and get endorsement from your
                  supervisor.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-lg border bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <span className="text-lg font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold mb-1">Earn Credential</h3>
                <p className="text-sm text-muted-foreground">
                  Once approved, your credential is recorded on-chain and can be
                  verified by anyone.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/courses">
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col gap-2 bg-transparent"
                >
                  <Search className="h-6 w-6" />
                  Browse Courses
                </Button>
              </Link>
              <Link href="/credentials">
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col gap-2 bg-transparent"
                >
                  <BookOpen className="h-6 w-6" />
                  My Credentials
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
