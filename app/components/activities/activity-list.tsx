"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";
import {
  fetchActivitiesByStudentAndCourse,
  type EnrolledActivity,
} from "@/lib/solana/fetch-activities";
import { PublicKey } from "@solana/web3.js";
import { address as toAddress } from "@solana/kit";
import type { Option } from "@solana/kit";
import { useFairCredit } from "@/hooks/use-fair-credit";
import {
  fetchMaybeCourse,
  type Course,
} from "@/lib/solana/generated/accounts/course";
import {
  fetchAllMaybeResource,
  type Resource,
} from "@/lib/solana/generated/accounts/resource";
import { fetchResourceEvent } from "@/lib/nostr/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, FileText, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { CreateActivityForm } from "@/components/activities/create-activity-form";
import { ActivityUpdateActions } from "@/components/activities/activity-update-actions";
import { ActivityStatus } from "@/lib/solana/generated/types/activityStatus";
import { ResourceKind } from "@/lib/solana/generated/types/resourceKind";
import {
  type ActivityModuleRef,
  parseActivityData,
} from "@/lib/types/activity-data";
import {
  ACTIVITY_KIND_LABEL,
  activityKindKeyFromEnum,
} from "@/lib/activities/activity-form-schema";

function stripHtml(input: string): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function looksLikeHtml(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function getOptionString(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const maybe = value as { __option?: string; value?: unknown };
  if (maybe.__option === "Some" && typeof maybe.value === "string") {
    return maybe.value;
  }
  return null;
}

export function ActivityList({ courseAddress }: { courseAddress: string }) {
  const { address, isConnected } = useAppKitAccount();
  const { connection } = useAppKitConnection();
  const [activities, setActivities] = useState<EnrolledActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { rpc } = useFairCredit();
  const [course, setCourse] = useState<Course | null>(null);
  const [moduleResources, setModuleResources] = useState<Record<string, Resource | null>>({});
  const [moduleResourceContent, setModuleResourceContent] = useState<Record<string, string>>({});

  const loadActivities = useCallback(async () => {
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

      data.sort((a, b) => Number(b.account.created) - Number(a.account.created));
      setActivities(data);
    } catch (error) {
      console.error("Failed to load activities:", error);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, connection, courseAddress]);

  const loadCourse = useCallback(async () => {
    try {
      const res = await fetchMaybeCourse(rpc, toAddress(courseAddress));
      if (res.exists) {
        setCourse(res.data);
      } else {
        setCourse(null);
      }
    } catch (error) {
      console.error("Failed to load course for activities:", error);
      setCourse(null);
    }
  }, [rpc, courseAddress]);

  const loadModuleResources = useCallback(async () => {
    if (!course?.modules?.length) {
      setModuleResources({});
      setModuleResourceContent({});
      return;
    }

    try {
      const uniqueAddresses = Array.from(
        new Set(course.modules.map((mod) => String(mod.resource))),
      );
      const maybeResources = await fetchAllMaybeResource(
        rpc,
        uniqueAddresses.map((entry) => toAddress(entry)),
      );

      const nextResources: Record<string, Resource | null> = {};
      const nextContent: Record<string, string> = {};

      await Promise.all(
        maybeResources.map(async (entry, index) => {
          const addr = uniqueAddresses[index];
          if (!entry.exists) {
            nextResources[addr] = null;
            return;
          }

          nextResources[addr] = entry.data;

          const dTag = getOptionString(entry.data.nostrDTag as any);
          const authorHex =
            entry.data.nostrAuthorPubkey instanceof Uint8Array
              ? Array.from(entry.data.nostrAuthorPubkey)
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("")
              : "";

          if (dTag && authorHex.length === 64) {
            try {
              const event = await fetchResourceEvent(authorHex, dTag);
              if (event?.content) {
                nextContent[addr] = event.content;
              }
            } catch {
              // best-effort content load
            }
          }
        }),
      );

      setModuleResources(nextResources);
      setModuleResourceContent(nextContent);
    } catch (error) {
      console.error("Failed to load module resources:", error);
    }
  }, [course, rpc]);

  useEffect(() => {
    loadActivities();
    loadCourse();
  }, [loadActivities, loadCourse]);

  useEffect(() => {
    loadModuleResources();
  }, [loadModuleResources]);

  const parsedActivities = useMemo(() => {
    return activities.map((activity) => {
      const parsed = parseActivityData(activity.account.data);
      const kindFromAccount = activityKindKeyFromEnum(activity.account.kind as number);
      const resolvedKind = parsed.kind ?? kindFromAccount;

      return {
        activity,
        parsed,
        kindLabel: resolvedKind ? ACTIVITY_KIND_LABEL[resolvedKind] : "Unknown Kind",
      };
    });
  }, [activities]);

  type ModuleGroup = {
    id: string;
    label: string;
    percentage?: number;
    resourceAddress?: string;
  };

  const moduleGroups: ModuleGroup[] = [];
  const moduleIds = new Set<string>();

  if (course?.modules) {
    course.modules.forEach((m: any, index: number) => {
      const id = String(
        m.id ?? m.resource ?? m.module_pubkey ?? `module-${index}`,
      );
      if (moduleIds.has(id)) return;

      moduleIds.add(id);
      const label =
        (m.title as string | undefined) ??
        (m.name as string | undefined) ??
        `${id.slice(0, 8)}…`;
      const percentage =
        typeof m.percentage === "number" ? Number(m.percentage) : undefined;
      const resourceAddress =
        typeof m.resource === "string" ? String(m.resource) : undefined;

      moduleGroups.push({ id, label, percentage, resourceAddress });
    });
  }

  parsedActivities.forEach(({ parsed }) => {
    parsed.modules.forEach((moduleRef: ActivityModuleRef) => {
      const id = moduleRef.module_pubkey;
      if (!id || moduleIds.has(id)) return;

      moduleIds.add(id);
      moduleGroups.push({
        id,
        label: `${id.slice(0, 8)}…`,
      });
    });
  });

  const activitiesByModule: Record<string, typeof parsedActivities> = {};
  moduleGroups.forEach((mod) => {
    activitiesByModule[mod.id] = [];
  });

  const unassignedActivities: typeof parsedActivities = [];

  parsedActivities.forEach((entry) => {
    const modules = entry.parsed.modules;
    if (!modules.length) {
      unassignedActivities.push(entry);
      return;
    }

    let matched = false;
    modules.forEach((moduleRef) => {
      const id = moduleRef.module_pubkey;
      if (id && activitiesByModule[id]) {
        activitiesByModule[id].push(entry);
        matched = true;
      }
    });

    if (!matched) {
      unassignedActivities.push(entry);
    }
  });

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

  return (
    <div className="space-y-6">
      {moduleGroups.length === 0 && activities.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center">
            <FileText className="h-10 w-10 mb-4 opacity-50" />
            <p>No modules or activities found for this course.</p>
          </CardContent>
        </Card>
      )}

      {moduleGroups.map((mod) => {
        const entries = activitiesByModule[mod.id] ?? [];
        const resourceAddress = mod.resourceAddress ? String(mod.resourceAddress) : null;
        const resource = resourceAddress ? moduleResources[resourceAddress] : null;
        const richContent =
          resourceAddress && moduleResourceContent[resourceAddress]
            ? moduleResourceContent[resourceAddress]
            : "";

        const activeCount = entries.filter(
          (entry) => entry.activity.account.status === ActivityStatus.Active,
        ).length;
        const gradedCount = entries.filter((entry) => {
          const gradeOpt = entry.activity.account.grade as Option<number>;
          return Boolean(gradeOpt && gradeOpt.__option === "Some");
        }).length;
        const attendanceLogs = entries.reduce((sum, entry) => {
          if (entry.parsed.kind !== "AttendMeeting") return sum;
          const payload = entry.parsed.parsed as any;
          const count = Array.isArray(payload?.attendanceRecords)
            ? payload.attendanceRecords.length
            : 0;
          return sum + count;
        }, 0);

        return (
          <div key={mod.id} className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{resource?.name ?? mod.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {typeof mod.percentage === "number"
                        ? `Module weight: ${mod.percentage}%`
                        : "Module linked from course"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Activities {entries.length}</Badge>
                    <Badge variant="outline">Active {activeCount}</Badge>
                    <Badge variant="outline">Graded {gradedCount}</Badge>
                    <Badge variant="outline">Attendance Logs {attendanceLogs}</Badge>
                  </div>
                </div>
                {resource && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary">{ResourceKind[resource.kind]}</Badge>
                    {resource.tags.slice(0, 6).map((tag) => (
                      <Badge key={`${resourceAddress}-${tag}`} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {richContent ? (
                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Module Materials & Guidance
                    </p>
                    {looksLikeHtml(richContent) ? (
                      <div
                        className="prose prose-sm max-w-none [&_img]:max-h-64 [&_img]:rounded-md"
                        dangerouslySetInnerHTML={{ __html: richContent }}
                      />
                    ) : (
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
                        {richContent}
                      </div>
                    )}
                  </div>
                ) : resource ? (
                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Module Guidance Summary
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stripHtml(resource.name)}
                    </p>
                  </div>
                ) : null}

                <Dialog>
                  <div className="flex items-center justify-end">
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Log activity in this module
                      </Button>
                    </DialogTrigger>
                  </div>

                  <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Log Activity in {mod.label}</DialogTitle>
                      <DialogDescription>
                        Record what you did for this module and attach relevant
                        evidence.
                      </DialogDescription>
                    </DialogHeader>
                    <CreateActivityForm
                      key={mod.id}
                      courseAddress={courseAddress}
                      initialModuleId={mod.id}
                      hasAttendanceTracker={entries.some(
                        (entry) => entry.parsed.kind === "AttendMeeting",
                      )}
                      onSubmitted={loadActivities}
                    />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {entries.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No activities logged for this module yet.
                </p>
              )}

              {entries.map(({ activity, parsed, kindLabel }) => (
                <Card key={activity.publicKey.toBase58()}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-semibold">
                          {parsed.title || "Activity"}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Created{" "}
                          {format(
                            new Date(Number(activity.account.created) * 1000),
                            "PPP p",
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Updated{" "}
                          {format(
                            new Date(Number(activity.account.updated) * 1000),
                            "PPP p",
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{kindLabel}</Badge>
                        <StatusBadge status={activity.account.status as any} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-3">
                      <p className="text-muted-foreground">{parsed.description}</p>

                      {parsed.modules.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {parsed.modules.map((moduleRef, idx) => (
                            <Badge
                              key={`${moduleRef.module_pubkey}-${idx}`}
                              variant="outline"
                              className="text-xs"
                            >
                              Module: {moduleRef.module_pubkey.slice(0, 8)}…
                            </Badge>
                          ))}
                        </div>
                      )}

                      {parsed.kind === "AttendMeeting" && (() => {
                        const payload = parsed.parsed as any;
                        const records = Array.isArray(payload?.attendanceRecords)
                          ? payload.attendanceRecords.filter(
                              (entry: unknown) => typeof entry === "string",
                            )
                          : [];
                        if (!records.length) return null;

                        return (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              Attendance Records: {records.length}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Latest: {(() => {
                                const latest = records[records.length - 1];
                                const asNumber = Number(latest);
                                const latestDate = Number.isFinite(asNumber)
                                  ? new Date(asNumber * 1000)
                                  : new Date(latest);
                                return format(latestDate, "PPP p");
                              })()}
                            </p>
                          </div>
                        );
                      })()}

                      {parsed.evidenceLinks.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Evidence Links
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {parsed.evidenceLinks.map((link, idx) => (
                              <a
                                key={`${link}-${idx}`}
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs underline text-blue-600"
                              >
                                Link {idx + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {(() => {
                        const gradeOpt = activity.account.grade as Option<number>;
                        const gradeValue =
                          gradeOpt && gradeOpt.__option === "Some"
                            ? gradeOpt.value ?? null
                            : null;
                        if (gradeValue === null) return null;
                        return (
                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md w-fit">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="font-medium">
                              Grade: {Number(gradeValue).toFixed(2)}%
                            </span>
                          </div>
                        );
                      })()}

                      <ActivityUpdateActions
                        activityAddress={activity.publicKey.toBase58()}
                        activityKind={parsed.kind}
                        parsedData={parsed}
                        moduleId={mod.id}
                        onUpdated={loadActivities}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {unassignedActivities.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Unassigned Activities</h2>
          <div className="space-y-4">
            {unassignedActivities.map(({ activity, parsed, kindLabel }) => (
              <Card key={activity.publicKey.toBase58()}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {parsed.title || "Activity"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Submitted on{" "}
                        {format(
                          new Date(Number(activity.account.created) * 1000),
                          "PPP",
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{kindLabel}</Badge>
                      <StatusBadge status={activity.account.status as any} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-3">
                    <p className="text-muted-foreground">{parsed.description}</p>
                    <ActivityUpdateActions
                      activityAddress={activity.publicKey.toBase58()}
                      activityKind={parsed.kind}
                      parsedData={parsed}
                      onUpdated={loadActivities}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: ActivityStatus | string;
}) {
  let label = "Unknown";
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

  if (typeof status === "number") {
    switch (status) {
      case ActivityStatus.Active:
        label = "Active";
        variant = "default";
        break;
      case ActivityStatus.Pending:
        label = "Pending";
        variant = "secondary";
        break;
      case ActivityStatus.Archived:
        label = "Archived";
        variant = "outline";
        break;
      default:
        label = "Unknown";
        variant = "outline";
        break;
    }
  } else if (typeof status === "string") {
    label = status;
    switch (status.toLowerCase()) {
      case "active":
        variant = "default";
        break;
      case "pending":
        variant = "secondary";
        break;
      case "archived":
        variant = "outline";
        break;
    }
  }

  return <Badge variant={variant}>{label}</Badge>;
}
