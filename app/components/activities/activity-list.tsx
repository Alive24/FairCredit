"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import {
  fetchActivitiesByStudentAndCourse,
  type EnrolledActivity,
} from "@/lib/solana/fetch-activities";
import { PublicKey } from "@solana/web3.js";
import { address as toAddress } from "@solana/kit";
import type { Option } from "@solana/kit";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { useToast } from "@/hooks/use-toast";
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
import {
  Loader2,
  FileText,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { CreateActivityForm } from "@/components/activities/create-activity-form";
import { ActivityUpdateActions } from "@/components/activities/activity-update-actions";
import { ActivityStatus } from "@/lib/solana/generated/types/activityStatus";
import {
  type ActivityModuleRef,
  parseActivityData,
} from "@/lib/types/activity-data";
import { parseModuleRichData } from "@/lib/resource-nostr-content";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { getAddFeedbackInstruction } from "@/lib/solana/generated/instructions/addFeedback";
import { useUserRole } from "@/hooks/use-user-role";
import {
  ACTIVITY_KIND_LABEL,
  activityKindKeyFromEnum,
} from "@/lib/activities/activity-form-schema";
import {
  isHiddenFromSupervisor,
  toggleHiddenFromSupervisorTag,
} from "@/lib/activities/activity-visibility";

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
  const { sendTransaction } = useAppKitTransaction();
  const { toast } = useToast();
  const { role } = useUserRole();
  const [activities, setActivities] = useState<EnrolledActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { rpc } = useFairCredit();
  const [course, setCourse] = useState<Course | null>(null);
  const [moduleResources, setModuleResources] = useState<Record<string, Resource | null>>({});
  const [moduleResourceContent, setModuleResourceContent] = useState<
    Record<
      string,
      {
        content: string;
        guidance: string;
        materials: string[];
        materialsRich: string;
      }
    >
  >({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [isVisibilityUpdatingByActivity, setIsVisibilityUpdatingByActivity] =
    useState<Record<string, boolean>>({});

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
      const nextContent: Record<
        string,
        {
          content: string;
          guidance: string;
          materials: string[];
          materialsRich: string;
        }
      > = {};

      await Promise.all(
        maybeResources.map(async (entry, index) => {
          const addr = uniqueAddresses[index];
          if (!entry.exists) {
            nextResources[addr] = null;
            return;
          }

          nextResources[addr] = entry.data;
          nextContent[addr] = {
            content: "",
            guidance: entry.data.name,
            materials: [],
            materialsRich: "",
          };

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
                nextContent[addr] = parseModuleRichData(event.content);
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
        hiddenFromSupervisor: isHiddenFromSupervisor(parsed.raw),
      };
    });
  }, [activities]);

  const visibleParsedActivities = useMemo(() => {
    if (role !== "supervisor") return parsedActivities;
    return parsedActivities.filter((entry) => !entry.hiddenFromSupervisor);
  }, [parsedActivities, role]);

  const toggleVisibility = useCallback(
    async (entry: {
      activity: EnrolledActivity;
      parsed: ReturnType<typeof parseActivityData>;
      hiddenFromSupervisor: boolean;
    }) => {
      if (!address || !isConnected) {
        toast({
          title: "Wallet not connected",
          description: "Connect your wallet to change activity visibility.",
          variant: "destructive",
        });
        return;
      }
      if (role !== "student") {
        toast({
          title: "Action not allowed",
          description:
            "Only students can control activity visibility for supervisors.",
          variant: "destructive",
        });
        return;
      }

      const nextRaw = toggleHiddenFromSupervisorTag({
        raw: entry.parsed.raw,
        hidden: !entry.hiddenFromSupervisor,
      });

      if (!nextRaw) {
        toast({
          title: "Visibility update failed",
          description: "Activity payload is invalid and cannot be updated.",
          variant: "destructive",
        });
        return;
      }

      const key = entry.activity.publicKey.toBase58();
      setIsVisibilityUpdatingByActivity((prev) => ({ ...prev, [key]: true }));
      try {
        const ix = getAddFeedbackInstruction({
          activity: toAddress(key),
          studentAuthority: createPlaceholderSigner(address),
          content: nextRaw,
          assetIds: [],
          evidenceAssetIds: [],
        });

        await sendTransaction([ix]);
        toast({
          title: entry.hiddenFromSupervisor
            ? "Activity visible to supervisor"
            : "Activity hidden from supervisor",
          description:
            "Visibility preference updated. Data remains stored on-chain.",
        });
        await loadActivities();
      } catch (error) {
        toast({
          title: "Visibility update failed",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
      } finally {
        setIsVisibilityUpdatingByActivity((prev) => ({
          ...prev,
          [key]: false,
        }));
      }
    },
    [address, isConnected, loadActivities, role, sendTransaction, toast],
  );

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
        `Module ${index + 1}`;
      const percentage =
        typeof m.percentage === "number" ? Number(m.percentage) : undefined;
      const resourceAddress =
        typeof m.resource === "string" ? String(m.resource) : undefined;

      moduleGroups.push({ id, label, percentage, resourceAddress });
    });
  }

  visibleParsedActivities.forEach(({ parsed }) => {
    parsed.modules.forEach((moduleRef: ActivityModuleRef) => {
      const id = moduleRef.module_pubkey;
      if (!id || moduleIds.has(id)) return;

      moduleIds.add(id);
      moduleGroups.push({
        id,
        label: "Unlinked Module",
      });
    });
  });

  const activitiesByModule: Record<string, typeof parsedActivities> = {};
  moduleGroups.forEach((mod) => {
    activitiesByModule[mod.id] = [];
  });

  const unassignedActivities: typeof parsedActivities = [];

  visibleParsedActivities.forEach((entry) => {
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

  const summary = useMemo(() => {
    const totalActivities = visibleParsedActivities.length;
    const completedActivities = visibleParsedActivities.filter((entry) => {
      const status = entry.activity.account.status;
      const gradeOpt = entry.activity.account.grade as Option<number>;
      return (
        status === ActivityStatus.Archived ||
        Boolean(gradeOpt && gradeOpt.__option === "Some")
      );
    }).length;
    const activeActivities = visibleParsedActivities.filter(
      (entry) => entry.activity.account.status === ActivityStatus.Active,
    ).length;
    const overallProgress =
      totalActivities > 0
        ? Math.round((completedActivities / totalActivities) * 100)
        : 0;

    return {
      totalActivities,
      completedActivities,
      activeActivities,
      overallProgress,
    };
  }, [visibleParsedActivities]);

  const moduleIdKey = moduleGroups.map((mod) => mod.id).join("|");

  useEffect(() => {
    setExpandedModules((prev) => {
      let changed = false;
      const next = { ...prev };
      moduleGroups.forEach((mod) => {
        if (typeof next[mod.id] === "undefined") {
          next[mod.id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [moduleIdKey]);

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

      {moduleGroups.length > 0 && (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Course Modules
          </h2>
          <Badge variant="outline">{moduleGroups.length} modules</Badge>
        </div>
      )}

      {moduleGroups.map((mod) => {
        const entries = activitiesByModule[mod.id] ?? [];
        const resourceAddress = mod.resourceAddress ? String(mod.resourceAddress) : null;
        const resource = resourceAddress ? moduleResources[resourceAddress] : null;
        const moduleRich =
          resourceAddress && moduleResourceContent[resourceAddress]
            ? moduleResourceContent[resourceAddress]
            : null;
        const richContent =
          moduleRich && moduleRich.content ? moduleRich.content : "";
        const guidanceText = moduleRich?.guidance?.trim()
          ? moduleRich.guidance.trim()
          : resource?.name
            ? resource.name
            : "No module guidance has been published yet.";
        const allMaterialTags = moduleRich?.materials?.length
          ? moduleRich.materials
          : resource
            ? resource.tags.filter((tag) => !tag.startsWith("default_activity:"))
            : [];
        const materialsRich = moduleRich?.materialsRich?.trim() || "";
        const materialSource = allMaterialTags;
        const materials = materialSource.slice(0, 3);
        const hiddenMaterialCount = Math.max(
          0,
          materialSource.length - materials.length,
        );
        const moduleExpanded = expandedModules[mod.id] ?? true;

        return (
          <div key={mod.id} className="space-y-3">
            <Card className="border-l-4 border-l-primary/50 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{resource?.name ?? mod.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Module materials and guidance
                    </p>
                  </div>
                  <div className="rounded-md border bg-amber-50 px-3 py-2 text-right dark:bg-amber-950/30">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Module Weight
                    </p>
                    <p className="text-lg font-semibold">
                      {typeof mod.percentage === "number" ? `${mod.percentage}%` : "N/A"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <details open className="rounded-md border bg-background p-3">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                    Module Content
                  </summary>
                  <div className="pt-3">
                    {richContent ? (
                      looksLikeHtml(richContent) ? (
                        <div
                          className="prose prose-sm max-w-none [&_img]:max-h-64 [&_img]:rounded-md"
                          dangerouslySetInnerHTML={{ __html: richContent }}
                        />
                      ) : (
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
                          {richContent}
                        </div>
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No detailed module content published yet.
                      </p>
                    )}
                  </div>
                </details>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Materials
                    </p>
                    {materialsRich ? (
                      looksLikeHtml(materialsRich) ? (
                        <div
                          className="prose prose-sm max-w-none [&_img]:max-h-56 [&_img]:rounded-md"
                          dangerouslySetInnerHTML={{ __html: materialsRich }}
                        />
                      ) : (
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
                          {materialsRich}
                        </div>
                      )
                    ) : materials.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {materials.map((item) => (
                          <li key={`${mod.id}-material-${item}`} className="break-words">
                            {item}
                          </li>
                        ))}
                        {hiddenMaterialCount > 0 && (
                          <li>{hiddenMaterialCount} more material items</li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No material links or tags yet.
                      </p>
                    )}
                  </div>

                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Guidance
                    </p>
                    {looksLikeHtml(guidanceText) ? (
                      <div
                        className="prose prose-sm max-w-none [&_img]:max-h-56 [&_img]:rounded-md"
                        dangerouslySetInnerHTML={{ __html: guidanceText }}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {guidanceText}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedModules((prev) => ({
                        ...prev,
                        [mod.id]: !(prev[mod.id] ?? true),
                      }))
                    }
                  >
                    {moduleExpanded ? (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Hide Activities
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Show {entries.length} Activities
                      </>
                    )}
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Log activity in this module
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          Log Activity in {resource?.name ?? mod.label}
                        </DialogTitle>
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
                </div>
              </CardContent>
            </Card>

            {moduleExpanded && (
              <div className="ml-4 rounded-lg border border-dashed border-l-4 border-l-blue-200 bg-muted/10 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
                    Activity Timeline
                  </p>
                  <Badge variant="secondary">{entries.length} items</Badge>
                </div>

                {entries.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No activities logged for this module yet.
                  </p>
                )}

                {entries.map((entry) => {
                  const { activity, parsed, kindLabel, hiddenFromSupervisor } = entry;
                  const activityKey = activity.publicKey.toBase58();
                  const isUpdatingVisibility =
                    isVisibilityUpdatingByActivity[activityKey] === true;

                  return (
                  <Card
                    key={activityKey}
                    className="ml-2 border-l-4 border-l-blue-300 bg-background/95"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Activity</Badge>
                            <Badge variant="secondary">{kindLabel}</Badge>
                          </div>
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
                          {role === "student" && (
                            <Button
                              size="sm"
                              variant={hiddenFromSupervisor ? "outline" : "destructive"}
                              disabled={isUpdatingVisibility}
                              onClick={() => toggleVisibility(entry)}
                            >
                              {isUpdatingVisibility ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Saving
                                </>
                              ) : hiddenFromSupervisor ? (
                                "Show"
                              ) : (
                                "Archive"
                              )}
                            </Button>
                          )}
                          <StatusBadge status={activity.account.status as any} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm space-y-3">
                        <p className="text-muted-foreground">{parsed.description}</p>
                        {hiddenFromSupervisor && role === "student" && (
                          <Badge variant="outline">Hidden from supervisor</Badge>
                        )}

                        {parsed.modules.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {parsed.modules.map((moduleRef, idx) => (
                              <Badge
                                key={`${moduleRef.module_pubkey}-${idx}`}
                                variant="outline"
                                className="text-xs"
                              >
                                Module: {moduleRef.module_pubkey.slice(0, 8)}...
                              </Badge>
                            ))}
                          </div>
                        )}

                        {parsed.kind === "AttendMeeting" &&
                          (() => {
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
                          activityAddress={activityKey}
                          activityKind={parsed.kind}
                          parsedData={parsed}
                          moduleId={mod.id}
                          onUpdated={loadActivities}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {unassignedActivities.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Unassigned Activities</h2>
          <div className="space-y-4">
            {unassignedActivities.map((entry) => {
              const { activity, parsed, kindLabel, hiddenFromSupervisor } = entry;
              const activityKey = activity.publicKey.toBase58();
              const isUpdatingVisibility =
                isVisibilityUpdatingByActivity[activityKey] === true;
              return (
              <Card key={activityKey}>
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
                      {role === "student" && (
                        <Button
                          size="sm"
                          variant={hiddenFromSupervisor ? "outline" : "destructive"}
                          disabled={isUpdatingVisibility}
                          onClick={() => toggleVisibility(entry)}
                        >
                          {isUpdatingVisibility ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Saving
                            </>
                          ) : hiddenFromSupervisor ? (
                            "Show"
                          ) : (
                            "Archive"
                          )}
                        </Button>
                      )}
                      <Badge variant="secondary">{kindLabel}</Badge>
                      <StatusBadge status={activity.account.status as any} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-3">
                    <p className="text-muted-foreground">{parsed.description}</p>
                    {hiddenFromSupervisor && role === "student" && (
                      <Badge variant="outline">Hidden from supervisor</Badge>
                    )}
                    <ActivityUpdateActions
                      activityAddress={activityKey}
                      activityKind={parsed.kind}
                      parsedData={parsed}
                      onUpdated={loadActivities}
                    />
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>
      )}

      {(moduleGroups.length > 0 || visibleParsedActivities.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Activity Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">Total Activities</p>
                <p className="text-xl font-semibold">{summary.totalActivities}</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-xl font-semibold">{summary.completedActivities}</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-xl font-semibold">{summary.activeActivities}</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">Overall Progress</p>
                <p className="text-xl font-semibold">{summary.overallProgress}%</p>
              </div>
            </CardContent>
          </Card>

          <Card className="h-fit lg:sticky lg:top-20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Final Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Submit your portfolio for final credential review.
              </p>
              <Button className="w-full" disabled>
                Submit for Final Review
              </Button>
            </CardContent>
          </Card>
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
