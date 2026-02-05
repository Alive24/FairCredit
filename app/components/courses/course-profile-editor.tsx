"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Loader2, Plus, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { address } from "@solana/kit";
import type { Instruction } from "@solana/kit";
import type { Course } from "@/lib/solana/generated/accounts/course";
import { getSetCourseNostrRefInstructionAsync } from "@/lib/solana/generated/instructions/setCourseNostrRef";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
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
} from "@/lib/nostr/client";
import { nip19 } from "nostr-tools";

type WalletProvider = {
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
} | null;

type CourseProfileEditorProps = {
  course: Course;
  courseAddress: string;
  initialProfile: CourseProfile;
  nostrDTag: string | null;
  nostrAuthorHex: string | null;
  hasNostrEvent?: boolean;
  isProvider: boolean;
  walletAddress: string | null;
  isConnected: boolean;
  isSending: boolean;
  walletProvider: WalletProvider;
  sendTransaction: (instructions: Instruction[]) => Promise<string>;
  onCourseReload?: () => Promise<void>;
  onProfileChange?: (profile: CourseProfile) => void;
  showDangerZone?: boolean;
  onCloseCourse?: () => void;
  closeSubmitting?: boolean;
  variant?: "card" | "embedded";
  className?: string;
};

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

export function CourseProfileEditor({
  course,
  courseAddress,
  initialProfile,
  nostrDTag,
  nostrAuthorHex,
  hasNostrEvent = false,
  isProvider,
  walletAddress,
  isConnected,
  isSending,
  walletProvider,
  sendTransaction,
  onCourseReload,
  onProfileChange,
  showDangerZone = false,
  onCloseCourse,
  closeSubmitting = false,
  variant = "card",
  className,
}: CourseProfileEditorProps) {
  const { toast } = useToast();
  const [draftProfile, setDraftProfile] =
    useState<CourseProfile>(emptyCourseProfile);
  const [isDirty, setIsDirty] = useState(false);
  const [hasPublishedEvent, setHasPublishedEvent] =
    useState<boolean>(hasNostrEvent);
  const [newSkill, setNewSkill] = useState("");
  const [newRequirement, setNewRequirement] = useState("");
  const [newTag, setNewTag] = useState("");
  const [forceRebind, setForceRebind] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [nostrPublishStatus, setNostrPublishStatus] = useState<
    "idle" | "publishing" | "published" | "error"
  >("idle");
  const [nostrPublishError, setNostrPublishError] = useState<string | null>(
    null,
  );
  const [nostrPendingEvent, setNostrPendingEvent] = useState<{
    dTag: string;
    authorPubkey: string;
    eventId: string;
    nevent: string | null;
    verifyUrl: string | null;
  } | null>(null);
  const [dangerOpen, setDangerOpen] = useState(false);

  useEffect(() => {
    if (isDirty) return;
    setDraftProfile(initialProfile);
  }, [initialProfile, isDirty]);

  useEffect(() => {
    if (hasNostrEvent) {
      setHasPublishedEvent(true);
      return;
    }
    if (!nostrPendingEvent) {
      setHasPublishedEvent(false);
    }
  }, [hasNostrEvent, nostrPendingEvent]);

  const handleDraftChange = (field: keyof CourseProfile, value: string) => {
    setDraftProfile((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const addSkill = () => {
    const value = newSkill.trim();
    if (!value || draftProfile.skills.includes(value)) return;
    setDraftProfile((prev) => ({
      ...prev,
      skills: [...prev.skills, value],
    }));
    setNewSkill("");
    setIsDirty(true);
  };

  const removeSkill = (skill: string) => {
    setDraftProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((item) => item !== skill),
    }));
    setIsDirty(true);
  };

  const addRequirement = () => {
    const value = newRequirement.trim();
    if (!value || draftProfile.requirements.includes(value)) return;
    setDraftProfile((prev) => ({
      ...prev,
      requirements: [...prev.requirements, value],
    }));
    setNewRequirement("");
    setIsDirty(true);
  };

  const removeRequirement = (req: string) => {
    setDraftProfile((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((item) => item !== req),
    }));
    setIsDirty(true);
  };

  const addTag = () => {
    const value = newTag.trim();
    if (!value || draftProfile.tags.includes(value)) return;
    setDraftProfile((prev) => ({ ...prev, tags: [...prev.tags, value] }));
    setNewTag("");
    setIsDirty(true);
  };

  const removeTag = (tag: string) => {
    setDraftProfile((prev) => ({
      ...prev,
      tags: prev.tags.filter((item) => item !== tag),
    }));
    setIsDirty(true);
  };

  const publishNostrEvent = useCallback(async () => {
    if (!courseAddress || !course) return;
    if (!walletAddress || !isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Connect your wallet to publish Nostr metadata.",
        variant: "destructive",
      });
      return;
    }
    if (!isProvider) {
      toast({
        title: "Provider wallet required",
        description: "Only the course provider can publish course metadata.",
        variant: "destructive",
      });
      return;
    }

    setBusy("publish");
    setNostrPublishStatus("publishing");
    setNostrPublishError(null);
    try {
      const creationTimestamp = Number(course.creationTimestamp);
      const dTag =
        nostrDTag ??
        buildCourseDTag({
          coursePubkey: address(courseAddress),
          creationTimestamp,
        });
      const payload = buildCourseMetadataPayload(draftProfile, {
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
      let neventValue: string | null = null;
      try {
        neventValue = nip19.neventEncode({
          id: published.eventId,
          author: published.authorPubkey,
          relays: DEFAULT_RELAYS.map((relay) => relay.url),
        });
      } catch {
        neventValue = null;
      }

      let confirmed = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const event = await fetchLatestCourseEvent({
          dTag,
          authorPubkey: published.authorPubkey,
        });
        if (event?.id === published.eventId) {
          confirmed = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      if (!confirmed) {
        throw new Error(
          "Nostr event not confirmed on relays yet. Please retry.",
        );
      }

      setNostrPendingEvent({
        dTag,
        authorPubkey: published.authorPubkey,
        eventId: published.eventId,
        nevent: neventValue,
        verifyUrl: neventValue ? `https://njump.me/${neventValue}` : null,
      });
      setNostrPublishStatus("published");
      setHasPublishedEvent(true);

      const nextProfile = applyCourseMetadataToProfile(draftProfile, payload);
      setDraftProfile(nextProfile);
      setIsDirty(false);
      onProfileChange?.(nextProfile);
      toast({
        title: "Nostr event published",
        description: `Event ${published.eventId.slice(0, 8)}… is ready. Confirm to bind on-chain.`,
      });
      return {
        dTag,
        authorPubkey: published.authorPubkey,
        eventId: published.eventId,
        nevent: neventValue,
        verifyUrl: neventValue ? `https://njump.me/${neventValue}` : null,
      };
    } catch (e) {
      console.error("Publish failed:", e);
      setNostrPublishStatus("error");
      setNostrPublishError(e instanceof Error ? e.message : String(e));
      toast({
        title: "Publish failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
    return null;
  }, [
    course,
    courseAddress,
    draftProfile,
    isConnected,
    isProvider,
    nostrDTag,
    onProfileChange,
    toast,
    walletAddress,
    walletProvider,
  ]);

  const bindOnChain = useCallback(
    async (event: {
      dTag: string;
      authorPubkey: string;
      eventId: string;
      nevent: string | null;
      verifyUrl: string | null;
    }) => {
      if (!courseAddress || !course) return false;
      if (!walletAddress || !isConnected) {
        toast({
          title: "Wallet not connected",
          description: "Connect your wallet to bind the Nostr pointer on-chain.",
          variant: "destructive",
        });
        return false;
      }
      if (!isProvider) {
        toast({
          title: "Provider wallet required",
          description:
            "Only the course provider can bind Nostr references on-chain.",
          variant: "destructive",
        });
        return false;
      }
      if (!forceRebind && course?.nostrDTag?.__option === "Some") {
        toast({
          title: "Nostr pointer already set",
          description: "Enable Force rebind to overwrite the existing pointer.",
          variant: "destructive",
        });
        return false;
      }

      setBusy("bind");
      try {
        const authorBytes = hexToBytes32(event.authorPubkey);
        const ix = await getSetCourseNostrRefInstructionAsync({
          course: address(courseAddress),
          providerAuthority: createPlaceholderSigner(walletAddress),
          nostrDTag: event.dTag,
          nostrAuthorPubkey: authorBytes,
          force: forceRebind,
        });
        await sendTransaction([ix]);
        toast({
          title: "Pointer bound on-chain",
          description: "Nostr dTag/pubkey have been written to the course.",
        });
        if (onCourseReload) {
          await onCourseReload();
        }
        return true;
      } catch (e) {
        console.error("Bind failed:", e);
        toast({
          title: "Bind failed",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        });
        return false;
      } finally {
        setBusy(null);
      }
    },
    [
      course,
      courseAddress,
      forceRebind,
      isConnected,
      isProvider,
      onCourseReload,
      sendTransaction,
      toast,
      walletAddress,
    ],
  );

  const handlePublishAndBind = useCallback(async () => {
    if (nostrPendingEvent && !isDirty) {
      await bindOnChain(nostrPendingEvent);
      return;
    }
    const published = await publishNostrEvent();
    if (!published) return;
    await bindOnChain(published);
  }, [bindOnChain, isDirty, nostrPendingEvent, publishNostrEvent]);

  const syncFromNostr = useCallback(async () => {
    if (!nostrDTag || !nostrAuthorHex) {
      toast({
        title: "Nostr reference not set",
        description: "This course has no Nostr pointer on-chain yet.",
        variant: "destructive",
      });
      return;
    }

    setBusy("sync");
    try {
      const event = await fetchLatestCourseEvent({
        dTag: nostrDTag,
        authorPubkey: nostrAuthorHex,
      });
      if (!event) {
        toast({
          title: "No event found",
          description: "No matching Nostr event found on the default relays.",
          variant: "destructive",
        });
        return;
      }
      const payload = parseCourseMetadataPayload(event.content);
      if (!payload) {
        toast({
          title: "Invalid metadata",
          description: "Nostr event content could not be parsed.",
          variant: "destructive",
        });
        return;
      }
      const nextProfile = applyCourseMetadataToProfile(draftProfile, payload);
      setDraftProfile(nextProfile);
      setIsDirty(false);
      setHasPublishedEvent(true);
      onProfileChange?.(nextProfile);
      toast({
        title: "Synced from Nostr",
        description: `Loaded latest metadata (event=${event.id.slice(0, 8)}…).`,
      });
    } catch (e) {
      console.error("Nostr sync failed:", e);
      toast({
        title: "Nostr sync failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }, [
    draftProfile,
    nostrAuthorHex,
    nostrDTag,
    onProfileChange,
    toast,
  ]);

  const statusLabel =
    busy === "publish"
      ? "Publishing…"
      : nostrPublishStatus === "error"
      ? "Error"
      : hasPublishedEvent
      ? isDirty
        ? "Not Updated"
        : "Published"
      : "Not Published";

  const content = (
    <div className="space-y-8">
        <div className="space-y-6">
          <h3 className="text-sm font-medium">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="course-title">Course Title *</Label>
              <Input
                id="course-title"
                value={draftProfile.title}
                onChange={(e) => handleDraftChange("title", e.target.value)}
                placeholder="Advanced Quantum Computing Research"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-category">Category *</Label>
              <Select
                value={draftProfile.category}
                onValueChange={(value) => handleDraftChange("category", value)}
              >
                <SelectTrigger id="course-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="applied-research">
                    Applied Research
                  </SelectItem>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="arts">Arts & Humanities</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-description">Course Description *</Label>
            <Textarea
              id="course-description"
              value={draftProfile.description}
              onChange={(e) =>
                handleDraftChange("description", e.target.value)
              }
              placeholder="Comprehensive description of the credential course, its goals, and what students will achieve..."
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Duration *</Label>
              <div className="flex gap-2">
                <Input
                  id="course-duration-value"
                  type="number"
                  min={1}
                  value={draftProfile.durationValue}
                  onChange={(e) =>
                    handleDraftChange("durationValue", e.target.value)
                  }
                  placeholder="e.g. 12"
                />
                <Select
                  value={draftProfile.durationUnit}
                  onValueChange={(value: "weeks" | "months" | "years") =>
                    setDraftProfile((prev) => ({
                      ...prev,
                      durationUnit: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="years">Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 border-t pt-6">
          <h3 className="text-sm font-medium">Academic Supervisor</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="course-supervisor-name">
                Supervisor Full Name *
              </Label>
              <Input
                id="course-supervisor-name"
                value={draftProfile.supervisorName}
                onChange={(e) =>
                  handleDraftChange("supervisorName", e.target.value)
                }
                placeholder="Dr. Sarah Chen"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-supervisor-email">
                Supervisor Email *
              </Label>
              <Input
                id="course-supervisor-email"
                type="email"
                value={draftProfile.supervisorEmail}
                onChange={(e) =>
                  handleDraftChange("supervisorEmail", e.target.value)
                }
                placeholder="s.chen@imperial.ac.uk"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="course-supervisor-institution">
                Institution *
              </Label>
              <Input
                id="course-supervisor-institution"
                value={draftProfile.supervisorInstitution}
                onChange={(e) =>
                  handleDraftChange("supervisorInstitution", e.target.value)
                }
                placeholder="Imperial College London"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 border-t pt-6">
          <h3 className="text-sm font-medium">Course Structure</h3>
          <div className="space-y-2">
            <Label htmlFor="course-learning-objectives">
              Learning Objectives *
            </Label>
            <Textarea
              id="course-learning-objectives"
              value={draftProfile.learningObjectives}
              onChange={(e) =>
                handleDraftChange("learningObjectives", e.target.value)
              }
              placeholder="What will students learn and achieve in this course..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-methodology">Methodology *</Label>
            <Textarea
              id="course-methodology"
              value={draftProfile.methodology}
              onChange={(e) => handleDraftChange("methodology", e.target.value)}
              placeholder="How will the course be delivered and what methods will be used..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-assessment">Assessment Criteria *</Label>
            <Textarea
              id="course-assessment"
              value={draftProfile.assessmentCriteria}
              onChange={(e) =>
                handleDraftChange("assessmentCriteria", e.target.value)
              }
              placeholder="How will student work be evaluated and assessed..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-deliverables">
              Expected Deliverables *
            </Label>
            <Textarea
              id="course-deliverables"
              value={draftProfile.deliverables}
              onChange={(e) =>
                handleDraftChange("deliverables", e.target.value)
              }
              placeholder="What outputs and deliverables are expected from students..."
              rows={2}
            />
          </div>
        </div>

        <div className="space-y-6 border-t pt-6">
          <h3 className="text-sm font-medium">Requirements & Tags</h3>
          <div className="space-y-2">
            <Label>Prerequisites & Requirements</Label>
            <div className="flex gap-2">
              <Input
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                placeholder="Add a requirement..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRequirement();
                  }
                }}
              />
              <Button type="button" onClick={addRequirement} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {draftProfile.requirements.map((req) => (
                <Badge
                  key={req}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {req}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeRequirement(req)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Skills Students Will Develop</Label>
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a skill..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
              />
              <Button type="button" onClick={addSkill} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {draftProfile.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {skill}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeSkill(skill)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags for Discovery</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" onClick={addTag} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {draftProfile.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-prerequisites">
              Additional Prerequisites
            </Label>
            <Textarea
              id="course-prerequisites"
              value={draftProfile.prerequisites}
              onChange={(e) =>
                handleDraftChange("prerequisites", e.target.value)
              }
              placeholder="Any additional prerequisites or background knowledge required..."
              rows={2}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">On-Chain Metadata (Nostr)</CardTitle>
            <CardDescription>
              Publish course metadata to Nostr first, then confirm to bind the
              pointer on-chain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <div>
                <span className="text-muted-foreground">dTag:</span>{" "}
                {nostrDTag ?? "Not set"}
              </div>
              <div>
                <span className="text-muted-foreground">Author:</span>{" "}
                {nostrAuthorHex ? `${nostrAuthorHex.slice(0, 8)}…` : "Not set"}
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                {statusLabel}
              </div>
            </div>
            {nostrPendingEvent && (
              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-muted-foreground">Event ID:</span>{" "}
                  <span className="font-mono break-all">
                    {nostrPendingEvent.eventId}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">nevent:</span>{" "}
                  <span className="font-mono break-all">
                    {nostrPendingEvent.nevent ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Verified URL:</span>{" "}
                  {nostrPendingEvent.verifyUrl ? (
                    <a
                      href={nostrPendingEvent.verifyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono break-all underline"
                    >
                      {nostrPendingEvent.verifyUrl}
                    </a>
                  ) : (
                    <span className="font-mono break-all">—</span>
                  )}
                </div>
              </div>
            )}
            {nostrPublishError && (
              <p className="text-xs text-destructive">{nostrPublishError}</p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={syncFromNostr}
                disabled={busy != null}
              >
                {busy === "sync" ? "Syncing…" : "Sync from Nostr"}
              </Button>
              <Button
                onClick={handlePublishAndBind}
                disabled={
                  busy != null ||
                  isSending ||
                  (!isDirty && hasPublishedEvent && !nostrPendingEvent)
                }
              >
                {busy === "publish" || busy === "bind" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {nostrPendingEvent && !isDirty
                  ? "Confirm Bind on-chain"
                  : "Publish & Bind"}
              </Button>
              <label className="ml-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={forceRebind}
                  onChange={(e) => setForceRebind(e.target.checked)}
                />
                Force rebind Nostr pointer
              </label>
            </div>
          </CardContent>
        </Card>
        {showDangerZone && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setDangerOpen((prev) => !prev)}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base text-destructive">
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Closing a course will permanently remove it from the network.
                  </CardDescription>
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    dangerOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CardHeader>
            {dangerOpen && (
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <p>
                  Closing a course will permanently remove it from the network and
                  reclaim its rent to your wallet. Existing credentials and hub
                  references may become invalid.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onCloseCourse}
                  disabled={!onCloseCourse || closeSubmitting}
                >
                  {closeSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Close Course Account
                </Button>
              </CardContent>
            )}
          </Card>
        )}
    </div>
  );

  if (variant === "embedded") {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Edit Course Profile</CardTitle>
        <CardDescription>
          Update course metadata and publish to Nostr before binding on-chain.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
