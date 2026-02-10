"use client";

import { useEffect, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";
import {
  fetchActivitiesByStudentAndCourse,
  type EnrolledActivity,
} from "@/lib/solana/fetch-activities";
import { PublicKey } from "@solana/web3.js";
import type { Option } from "@solana/kit";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export function ActivityList({ courseAddress }: { courseAddress: string }) {
  const { address, isConnected } = useAppKitAccount();
  const { connection } = useAppKitConnection();
  const [activities, setActivities] = useState<EnrolledActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadActivities() {
      if (!address || !isConnected || !connection || !courseAddress) {
        setActivities([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await fetchActivitiesByStudentAndCourse(
          connection,
          new PublicKey(address),
          new PublicKey(courseAddress),
        );
        // Sort by created date descending
        data.sort(
          (a, b) => Number(b.account.created) - Number(a.account.created),
        );
        setActivities(data);
      } catch (error) {
        console.error("Failed to load activities:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadActivities();
  }, [address, isConnected, connection, courseAddress]);

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Please connect your wallet to view activities.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center">
          <FileText className="h-10 w-10 mb-4 opacity-50" />
          <p>No activities found for this course.</p>
          <p className="text-sm mt-1">
            Submit your first activity to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <Card key={activity.publicKey.toBase58()}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base font-semibold">
                  {/* Parse data JSON if possible, otherwise generic title */}
                  {(() => {
                    try {
                      const data = JSON.parse(activity.account.data);
                      return data.title || "Activity Submission";
                    } catch {
                      return "Activity Submission";
                    }
                  })()}
                </CardTitle>
                <CardDescription>
                  Submitted on{" "}
                  {format(
                    new Date(Number(activity.account.created) * 1000),
                    "PPP",
                  )}
                </CardDescription>
              </div>
              <StatusBadge status={activity.account.status as any} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              {/* Description from JSON */}
              <p className="text-muted-foreground">
                {(() => {
                  try {
                    const data = JSON.parse(activity.account.data);
                    return data.description || "No description provided.";
                  } catch {
                    return activity.account.data;
                  }
                })()}
              </p>

              {/* Module Info */}
              {(() => {
                try {
                  const data = JSON.parse(activity.account.data);
                  if (data.modules && data.modules.length > 0) {
                    // Assuming we just show the first one or list them
                    // Ideally we would fetch module titles, but for now we might only have IDs if we don't have course data here.
                    // Wait, ActivityList doesn't have full course data with modules.
                    // We might just show "Module: [ID]" or we need to fetch course data in ActivityList too.
                    // For MVP, let's just show what we have.
                    return (
                      <div className="flex gap-2 flex-wrap mt-2">
                        {data.modules.map((m: any, idx: number) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs"
                          >
                            Module: {m.moduleId}
                          </Badge>
                        ))}
                      </div>
                    );
                  }
                } catch {}
                return null;
              })()}

              {/* Grade if available */}
              {(() => {
                const gradeOpt = activity.account.grade as Option<number>;
                const gradeValue =
                  gradeOpt && gradeOpt.__option === "Some"
                    ? gradeOpt.value ?? null
                    : null;
                if (gradeValue === null) return null;
                return (
                  <div className="flex items-center gap-2 mt-4 p-2 bg-muted/50 rounded-md w-fit">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">
                      Grade: {Number(gradeValue).toFixed(2)}%
                    </span>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: { kind: "Pending" | "Approved" | "Rejected" } | string;
}) {
  // Generated types for enums are tricky. Usually it's { pending: {} }, { approved: {} } etc
  // Let's inspect the status object in logs if needed, but for now handle common patterns.

  let label = "Unknown";
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

  // Check structure
  if (typeof status === "string") {
    label = status;
  } else if (typeof status === "object") {
    const keys = Object.keys(status);
    if (keys.length > 0) {
      label = keys[0];
    }
  }

  switch (label.toLowerCase()) {
    case "approved":
      variant = "default"; // Greenish usually represented by default in some themes, or use custom class
      break;
    case "pending":
      variant = "secondary";
      break;
    case "rejected":
      variant = "destructive";
      break;
  }

  return <Badge variant={variant}>{label}</Badge>;
}
