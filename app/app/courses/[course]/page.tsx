"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import {
  ArrowLeft,
  Pencil,
  Loader2,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { CourseProfileEditor } from "@/components/courses/course-profile-editor";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import { useToast } from "@/hooks/use-toast";
import { address } from "@solana/kit";
import { fetchMaybeCourse } from "@/lib/solana/generated/accounts/course";
import type { Course } from "@/lib/solana/generated/accounts/course";
import { getUpdateCourseStatusInstructionAsync } from "@/lib/solana/generated/instructions/updateCourseStatus";
import { getSetCourseNostrRefInstructionAsync } from "@/lib/solana/generated/instructions/setCourseNostrRef";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { CourseStatus } from "@/lib/solana/generated/types/courseStatus";
import { emptyCourseProfile, type CourseProfile } from "@/lib/course-profile";
import {
  applyCourseMetadataToProfile,
  buildCourseMetadataPayload,
  parseCourseMetadataPayload,
} from "@/lib/course-metadata";
import {
  buildCourseDTag,
  DEFAULT_RELAYS,
  fetchLatestCourseEvent,
  publishCourseEvent,
  type NostrEvent,
} from "@/lib/nostr/client";
import { nip19 } from "nostr-tools";
import { useTransactionQueue } from "@/hooks/use-transaction-queue";
import { getCloseCourseInstructionAsync } from "@/lib/solana/generated/instructions/closeCourse";

function formatTimestamp(value: bigint | number) {
  const date = new Date(Number(value) * 1000);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function unwrapOption<T>(val: unknown): T | null {
  if (val == null) return null;
  if (typeof val === "object" && "__option" in (val as object)) {
    const opt = val as { __option: string; value?: T };
    return opt.__option === "Some" && "value" in opt ? opt.value ?? null : null;
  }
  return val as T;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes32(hex: string): Uint8Array {
  const normalized = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error("Invalid Nostr pubkey (expected 64 hex chars)");
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function serializeCourseForDebug(course: Course | null) {
  if (!course) return null;
  return JSON.stringify(
    course,
    (_key, value) => {
      if (typeof value === "bigint") return value.toString();
      if (value instanceof Uint8Array) return `0x${bytesToHex(value)}`;
      if (value && typeof value === "object" && "__option" in value) {
        const opt = value as { __option: string; value?: unknown };
        return opt.__option === "Some" ? opt.value ?? null : null;
      }
      return value;
    },
    2,
  );
}

function formatNostrStatus(status: string) {
  switch (status) {
    case "missing":
      return "Missing dTag/pubkey on-chain";
    case "loading":
      return "Loading from relays…";
    case "loaded":
      return "Event found";
    case "not_found":
      return "No event found";
    case "error":
      return "Error fetching event";
    default:
      return "Idle";
  }
}

function getStatusBadge(status?: CourseStatus | string) {
  switch (status) {
    case CourseStatus.Draft:
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          Draft
        </Badge>
      );
    case CourseStatus.InReview:
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          In Review
        </Badge>
      );
    case CourseStatus.Accepted:
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Accepted
        </Badge>
      );
    case CourseStatus.Archived:
      return <Badge className="bg-muted text-muted-foreground">Archived</Badge>;
    default:
      return (
        <Badge variant="secondary">
          {typeof status === "string" ? status : "Unknown"}
        </Badge>
      );
  }
}

export default function CourseDetailPage() {
  const params = useParams<{ course: string }>();
  const courseAddressRaw = params?.course;
  const courseAddress = useMemo(
    () => (typeof courseAddressRaw === "string" ? courseAddressRaw : null),
    [courseAddressRaw],
  );

  const { rpc } = useFairCredit();
  const { address: walletAddress, isConnected } = useAppKitAccount();
  const { sendTransaction, isSending, walletProvider } = useAppKitTransaction();
  const { toast } = useToast();
  const transactionQueue = useTransactionQueue();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingForReview, setSubmittingForReview] = useState(false);
  const [profile, setProfile] = useState<CourseProfile>(emptyCourseProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [nostrProfile, setNostrProfile] = useState<CourseProfile | null>(null);
  const [nostrEvent, setNostrEvent] = useState<NostrEvent | null>(null);
  const [nostrStatus, setNostrStatus] = useState<
    "idle" | "missing" | "loading" | "loaded" | "not_found" | "error"
  >("idle");
  const [nostrError, setNostrError] = useState<string | null>(null);
  const [courseAccountMeta, setCourseAccountMeta] = useState<{
    lamports: number;
    owner: string;
    executable: boolean;
    rentEpoch?: number | null;
  } | null>(null);
  const [courseAccountError, setCourseAccountError] = useState<string | null>(
    null,
  );
  const [debugOpen, setDebugOpen] = useState(false);
  const [bindingNostr, setBindingNostr] = useState(false);
  const [closeSubmitting, setCloseSubmitting] = useState(false);

  const loadCourse = useCallback(async () => {
    if (!courseAddress) return;
    setLoading(true);
    try {
      const acc = await fetchMaybeCourse(rpc, address(courseAddress));
      if (acc?.exists) {
        setCourse(acc.data);
      } else {
        setCourse(null);
      }
    } catch (e) {
      console.error("Failed to load course:", e);
      toast({
        title: "Failed to load course",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [rpc, courseAddress, toast]);

  const loadCourseAccountRaw = useCallback(async () => {
    if (!courseAddress) return;
    setCourseAccountError(null);
    try {
      const accountInfo = await rpc
        .getAccountInfo(address(courseAddress), { encoding: "base64" } as any)
        .send();
      const value: any = accountInfo?.value ?? null;
      if (!value) {
        setCourseAccountMeta(null);
        return;
      }
      setCourseAccountMeta({
        lamports: Number(value.lamports ?? 0),
        owner: String(value.owner),
        executable: Boolean(value.executable),
        rentEpoch:
          typeof value.rentEpoch === "number" ||
          typeof value.rentEpoch === "bigint"
            ? Number(value.rentEpoch)
            : null,
      });
    } catch (e) {
      setCourseAccountError(e instanceof Error ? e.message : String(e));
      setCourseAccountMeta(null);
    }
  }, [rpc, courseAddress]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  useEffect(() => {
    setIsEditing(false);
  }, [courseAddress]);

  useEffect(() => {
    loadCourseAccountRaw();
  }, [loadCourseAccountRaw]);

  useEffect(() => {
    if (!course) return;
    setProfile({
      ...emptyCourseProfile,
      title: course.name || "",
      description: course.description || "",
      durationValue:
        course.workloadRequired > 0 ? String(course.workloadRequired) : "",
    });
  }, [course]);

  const nostrDTag =
    course?.nostrDTag?.__option === "Some" ? course.nostrDTag.value : null;
  const nostrAuthorHex = useMemo(() => {
    const b = course?.nostrAuthorPubkey;
    if (!b) return null;
    const allZero = (b as Uint8Array).every((x: number) => x === 0);
    if (allZero) return null;
    return Array.from(b as Uint8Array)
      .map((x: number) => x.toString(16).padStart(2, "0"))
      .join("");
  }, [course?.nostrAuthorPubkey]);

  useEffect(() => {
    if (!nostrDTag || !nostrAuthorHex) {
      setNostrStatus("missing");
      setNostrEvent(null);
      setNostrProfile(null);
      setNostrError(null);
      return;
    }
    let active = true;
    setNostrStatus("loading");
    setNostrError(null);
    (async () => {
      try {
        const event = await fetchLatestCourseEvent({
          dTag: nostrDTag,
          authorPubkey: nostrAuthorHex,
        });
        if (!active) return;
        if (!event) {
          setNostrStatus("not_found");
          setNostrEvent(null);
          setNostrProfile(null);
          return;
        }
        setNostrEvent(event);
        setNostrStatus("loaded");
        const payload = parseCourseMetadataPayload(event.content);
        if (!payload || !active) {
          setNostrProfile(null);
          return;
        }
        setNostrProfile(applyCourseMetadataToProfile(profile, payload));
      } catch (e) {
        if (!active) return;
        console.error("Failed to load course metadata from Nostr:", e);
        setNostrStatus("error");
        setNostrError(e instanceof Error ? e.message : String(e));
        setNostrProfile(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [nostrAuthorHex, nostrDTag, profile]);

  const neventId = useMemo(() => {
    if (!nostrEvent) return null;
    try {
      return nip19.neventEncode({
        id: nostrEvent.id,
        author: nostrEvent.pubkey,
        kind: nostrEvent.kind,
        relays: DEFAULT_RELAYS.map((relay) => relay.url),
      });
    } catch {
      return null;
    }
  }, [nostrEvent]);

  const courseDebugJson = useMemo(
    () => serializeCourseForDebug(course),
    [course],
  );

  const isProvider =
    isConnected &&
    walletAddress &&
    course &&
    String(course.provider).toLowerCase() ===
      String(walletAddress).toLowerCase();

  const handleToggleEdit = () => {
    setIsEditing((prev) => !prev);
  };

  const handleQuickBindNostr = async () => {
    if (!course || !courseAddress) return;
    if (!walletAddress || !isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Connect your wallet to bind Nostr references.",
        variant: "destructive",
      });
      return;
    }
    if (!isProvider) {
      toast({
        title: "Provider wallet required",
        description:
          "Only the course provider can bind Nostr references on-chain.",
        variant: "destructive",
      });
      return;
    }
    if (course?.nostrDTag?.__option === "Some") {
      toast({
        title: "Nostr pointer already set",
        description: "Use the editor with Force rebind to overwrite.",
        variant: "destructive",
      });
      return;
    }
    setBindingNostr(true);
    try {
      const creationTimestamp = Number(course.creationTimestamp);
      const dTag = buildCourseDTag({
        coursePubkey: address(courseAddress),
        creationTimestamp,
      });
      const payload = buildCourseMetadataPayload(profile, {
        courseAddress,
        creationTimestamp,
      });
      const published = await publishCourseEvent({
        dTag,
        content: JSON.stringify(payload),
        walletAddress,
        signMessage: walletProvider?.signMessage
          ? (message) => walletProvider.signMessage(message)
          : undefined,
      });
      const authorBytes = hexToBytes32(published.authorPubkey);
      const ix = await getSetCourseNostrRefInstructionAsync({
        course: address(courseAddress),
        providerAuthority: createPlaceholderSigner(walletAddress),
        nostrDTag: dTag,
        nostrAuthorPubkey: authorBytes,
        force: false,
      });
      await sendTransaction([ix]);
      toast({
        title: "Nostr pointer bound",
        description: `dTag/pubkey updated (event=${published.eventId.slice(
          0,
          8,
        )}…).`,
      });
      await loadCourse();
    } catch (e) {
      console.error("Quick bind failed:", e);
      toast({
        title: "Quick bind failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBindingNostr(false);
    }
  };

  const handleSubmitForHubReview = async () => {
    if (!walletAddress || !courseAddress) return;
    setSubmittingForReview(true);
    try {
      const ix = await getUpdateCourseStatusInstructionAsync({
        course: address(courseAddress),
        providerAuthority: createPlaceholderSigner(walletAddress),
        status: CourseStatus.InReview,
        rejectionReason: null,
      });
      await sendTransaction([ix]);
      toast({
        title: "Course submitted for Hub review",
        description: "Hub can now accept this course.",
      });
      await loadCourse();
    } catch (e) {
      console.error("Submit for review failed:", e);
      toast({
        title: "Submit failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSubmittingForReview(false);
    }
  };

  const handleCloseCourse = async () => {
    if (!courseAddress || !walletAddress || !isProvider) {
      return;
    }
    const confirmed = window.confirm(
      "This will close the course account on-chain and return its rent to your provider wallet. This action cannot be undone. Continue?",
    );
    if (!confirmed) return;

    try {
      setCloseSubmitting(true);
      transactionQueue.enqueue({
        module: "Courses",
        label: "Close course",
        build: async () =>
          getCloseCourseInstructionAsync({
            course: address(courseAddress),
            providerAuthority: createPlaceholderSigner(walletAddress),
          }),
      });
      toast({
        title: "Close queued",
        description:
          "Course close operation has been added to the transaction queue.",
      });
    } finally {
      setCloseSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <Card>
            <CardContent className="pt-8">
              <p className="text-muted-foreground text-center">
                Course not found.
              </p>
              <div className="flex justify-center mt-4">
                <Link href="/courses">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Courses
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const displayProfile = nostrProfile ?? profile;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/courses">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
          {isProvider && (
            <Button variant="outline" size="sm" onClick={handleToggleEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              {isEditing ? "Close Editor" : "Edit Course"}
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">
                  {course.name || "Untitled Course"}
                </CardTitle>
                <CardDescription className="mt-1">
                  Created {formatTimestamp(course.created)}
                  {course.collegeId ? ` · ${course.collegeId}` : ""}
                </CardDescription>
                {isEditing && (
                  <CardDescription className="mt-1">
                    Editing course metadata
                  </CardDescription>
                )}
              </div>
              {getStatusBadge(course.status as CourseStatus)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isEditing && courseAddress ? (
              <CourseProfileEditor
                variant="embedded"
                course={course}
                courseAddress={courseAddress}
                initialProfile={nostrProfile ?? profile}
                nostrDTag={nostrDTag}
                nostrAuthorHex={nostrAuthorHex}
                hasNostrEvent={nostrStatus === "loaded"}
                isProvider={Boolean(isProvider ?? false)}
                walletAddress={walletAddress ?? null}
                isConnected={isConnected}
                isSending={isSending}
                walletProvider={walletProvider}
                sendTransaction={sendTransaction}
                onCourseReload={loadCourse}
                onProfileChange={(next) => setNostrProfile(next)}
                showDangerZone={Boolean(isProvider ?? false)}
                onCloseCourse={handleCloseCourse}
                closeSubmitting={closeSubmitting}
              />
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Description
                  </h3>
                  <p className="text-sm">
                    {displayProfile.description ||
                      course.description ||
                      "No description provided."}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Workload</p>
                    <p className="font-medium">{course.workloadRequired}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Modules</p>
                    <p className="font-medium">{course.modules?.length ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Approved Credentials
                    </p>
                    <p className="font-medium">
                      {course.approvedCredentials?.length ?? 0}
                    </p>
                  </div>
                  {unwrapOption<string>(course.degreeId) && (
                    <div>
                      <p className="text-xs text-muted-foreground">Degree</p>
                      <p className="font-medium text-sm">
                        {unwrapOption<string>(course.degreeId)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-6 space-y-4">
                  <h3 className="font-medium">Course Profile</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="font-medium">
                        {displayProfile.category || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-medium">
                        {displayProfile.durationValue
                          ? `${displayProfile.durationValue} ${displayProfile.durationUnit}`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Supervisor
                      </p>
                      <p className="font-medium">
                        {displayProfile.supervisorName || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {displayProfile.supervisorInstitution || ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Contact</p>
                      <p className="font-medium">
                        {displayProfile.supervisorEmail || "—"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Learning Objectives
                    </p>
                    <p className="text-sm mt-1">
                      {displayProfile.learningObjectives || "Not provided."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Methodology</p>
                    <p className="text-sm mt-1">
                      {displayProfile.methodology || "Not provided."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Assessment Criteria
                    </p>
                    <p className="text-sm mt-1">
                      {displayProfile.assessmentCriteria || "Not provided."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Deliverables
                    </p>
                    <p className="text-sm mt-1">
                      {displayProfile.deliverables || "Not provided."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Prerequisites
                    </p>
                    <p className="text-sm mt-1">
                      {displayProfile.prerequisites || "Not provided."}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Skills</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {displayProfile.skills.length > 0 ? (
                        displayProfile.skills.map((skill) => (
                          <Badge key={skill} variant="secondary">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No skills added.
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Requirements
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {displayProfile.requirements.length > 0 ? (
                        displayProfile.requirements.map((req) => (
                          <Badge key={req} variant="secondary">
                            {req}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No requirements added.
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Tags</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {displayProfile.tags.length > 0 ? (
                        displayProfile.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No tags added.
                        </span>
                      )}
                    </div>
                  </div>

                  {displayProfile.updatedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last updated{" "}
                      {new Date(displayProfile.updatedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {isProvider && (
                  <div className="border-t pt-6 space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-medium">Provider Actions</h3>
                      {course.status === CourseStatus.Draft && (
                        <Button
                          onClick={handleSubmitForHubReview}
                          disabled={isSending || submittingForReview}
                        >
                          {submittingForReview ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Submit for Hub Review
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setDebugOpen((prev) => !prev)}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Debugging Info</CardTitle>
                <CardDescription>
                  Nostr metadata status and decoded on-chain fields.
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
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Course Address
                  </p>
                  <p className="font-mono break-all">{courseAddress ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nostr dTag</p>
                  <p className="font-mono break-all">
                    {nostrDTag ?? "(not set)"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Nostr Author Pubkey (hex)
                  </p>
                  <p className="font-mono break-all">
                    {nostrAuthorHex ?? "(not set)"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Nostr Event Status
                  </p>
                  <p className="font-medium">
                    {formatNostrStatus(nostrStatus)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Nostr Event ID (hex)
                  </p>
                  <p className="font-mono break-all">{nostrEvent?.id ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">nevent</p>
                  <p className="font-mono break-all">{neventId ?? "—"}</p>
                </div>
              </div>

              {isProvider && (!nostrDTag || !nostrAuthorHex) && (
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleQuickBindNostr}
                    disabled={bindingNostr || isSending}
                  >
                    {bindingNostr ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Quick Bind dTag/pubkey
                  </Button>
                </div>
              )}

              {nostrError && (
                <p className="text-xs text-destructive">{nostrError}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Lamports</p>
                  <p className="font-mono">
                    {courseAccountMeta?.lamports ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Owner</p>
                  <p className="font-mono break-all">
                    {courseAccountMeta?.owner ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Executable</p>
                  <p className="font-mono">
                    {courseAccountMeta
                      ? courseAccountMeta.executable
                        ? "true"
                        : "false"
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rent Epoch</p>
                  <p className="font-mono">
                    {courseAccountMeta?.rentEpoch ?? "—"}
                  </p>
                </div>
              </div>

              {courseAccountError && (
                <p className="text-xs text-destructive">{courseAccountError}</p>
              )}

              <div>
                <p className="text-xs text-muted-foreground">
                  Course Account Decoded (JSON)
                </p>
                <pre className="text-xs bg-muted/40 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
                  {courseDebugJson ?? "—"}
                </pre>
              </div>
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  );
}
