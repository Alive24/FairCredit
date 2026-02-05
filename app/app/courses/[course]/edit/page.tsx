"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  X,
  Loader2,
  CheckCircle,
  Wand2,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
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
} from "@/lib/nostr/client";
import { nip19 } from "nostr-tools";

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

function formatTimestamp(value: bigint | number) {
  const date = new Date(Number(value) * 1000);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function EditCoursePage() {
  const params = useParams<{ course: string }>();
  const router = useRouter();
  const courseAddressRaw = params?.course;
  const courseAddress = useMemo(
    () => (typeof courseAddressRaw === "string" ? courseAddressRaw : null),
    [courseAddressRaw]
  );

  const { toast } = useToast();
  const { rpc } = useFairCredit();
  const { address: walletAddress, isConnected } = useAppKitAccount();
  const { sendTransaction, isSending, walletProvider } =
    useAppKitTransaction();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingForReview, setSubmittingForReview] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<CourseProfile>(emptyCourseProfile);
  const [newSkill, setNewSkill] = useState("");
  const [newRequirement, setNewRequirement] = useState("");
  const [newTag, setNewTag] = useState("");
  const [profileInitialized, setProfileInitialized] = useState(false);
  const [nostrLoaded, setNostrLoaded] = useState(false);
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

  useEffect(() => {
    setProfileInitialized(false);
    setNostrLoaded(false);
    setNostrPublishStatus("idle");
    setNostrPublishError(null);
    setNostrPendingEvent(null);
  }, [courseAddress]);

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

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  useEffect(() => {
    if (!course || profileInitialized) return;
    setProfile({
      ...emptyCourseProfile,
      title: course.name || "",
      description: course.description || "",
      durationValue:
        course.workloadRequired > 0 ? String(course.workloadRequired) : "",
    });
    setProfileInitialized(true);
  }, [course, profileInitialized]);

  const nostrDTag =
    course?.nostrDTag?.__option === "Some" ? course.nostrDTag.value : null;
  const nostrAuthorHex = useMemo(() => {
    const b = course?.nostrAuthorPubkey;
    if (!b) return null;
    const allZero = b.every((x) => x === 0);
    if (allZero) return null;
    return Array.from(b)
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  }, [course?.nostrAuthorPubkey]);

  useEffect(() => {
    if (!nostrDTag || !nostrAuthorHex || nostrLoaded) return;
    (async () => {
      try {
        const event = await fetchLatestCourseEvent({
          dTag: nostrDTag,
          authorPubkey: nostrAuthorHex,
        });
        if (!event) return;
        const payload = parseCourseMetadataPayload(event.content);
        if (!payload) return;
        setProfile((prev) => applyCourseMetadataToProfile(prev, payload));
        setProfileInitialized(true);
        setNostrLoaded(true);
      } catch (e) {
        console.error("Failed to sync course metadata from Nostr:", e);
      }
    })();
  }, [nostrAuthorHex, nostrDTag, nostrLoaded]);

  const isProvider =
    isConnected &&
    walletAddress &&
    course &&
    String(course.provider).toLowerCase() === String(walletAddress).toLowerCase();

  const steps = [
    {
      number: 1,
      title: "Basic Information",
      description: "Course details and overview",
    },
    {
      number: 2,
      title: "Academic Supervisor",
      description: "Supervisor information",
    },
    {
      number: 3,
      title: "Course Structure",
      description: "Learning objectives and methodology",
    },
    {
      number: 4,
      title: "Requirements & Tags",
      description: "Prerequisites, skills, and tags",
    },
    {
      number: 5,
      title: "Review & Publish",
      description: "Confirm and publish to Nostr",
    },
  ];

  const handleInputChange = (field: keyof CourseProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    const value = newSkill.trim();
    if (!value || profile.skills.includes(value)) return;
    setProfile((prev) => ({ ...prev, skills: [...prev.skills, value] }));
    setNewSkill("");
  };

  const removeSkill = (skill: string) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const addRequirement = () => {
    const value = newRequirement.trim();
    if (!value || profile.requirements.includes(value)) return;
    setProfile((prev) => ({
      ...prev,
      requirements: [...prev.requirements, value],
    }));
    setNewRequirement("");
  };

  const removeRequirement = (req: string) => {
    setProfile((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((r) => r !== req),
    }));
  };

  const addTag = () => {
    const value = newTag.trim();
    if (!value || profile.tags.includes(value)) return;
    setProfile((prev) => ({ ...prev, tags: [...prev.tags, value] }));
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    setProfile((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await publishNostrEvent();
    } finally {
      setSaving(false);
    }
  };

  const publishNostrEvent = useCallback(async () => {
    if (!courseAddress || !course) return;
    if (!walletAddress || !isConnected) {
      toast({
        title: "Wallet not connected",
        description:
          "Connect your wallet to publish Nostr metadata.",
        variant: "destructive",
      });
      return;
    }
    if (!isProvider) {
      toast({
        title: "Provider wallet required",
        description:
          "Only the course provider can publish course metadata.",
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

      for (let attempt = 0; attempt < 3; attempt++) {
        const event = await fetchLatestCourseEvent({
          dTag,
          authorPubkey: published.authorPubkey,
        });
        if (event?.id === published.eventId) break;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      setNostrPendingEvent({
        dTag,
        authorPubkey: published.authorPubkey,
        eventId: published.eventId,
        nevent: neventValue,
        verifyUrl: neventValue ? `https://njump.me/${neventValue}` : null,
      });
      setNostrPublishStatus("published");

      const nextProfile = applyCourseMetadataToProfile(profile, payload);
      setProfile(nextProfile);
      toast({
        title: "Nostr event published",
        description: `Event ${published.eventId.slice(0, 8)}… is ready. Confirm to bind on-chain.`,
      });
    } catch (e) {
      console.error("Publish/bind failed:", e);
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
  }, [
    course,
    courseAddress,
    isConnected,
    isProvider,
    nostrDTag,
    profile,
    toast,
    walletAddress,
    walletProvider,
  ]);

  const confirmBindOnChain = useCallback(async () => {
    if (!courseAddress || !course) return;
    if (!walletAddress || !isConnected) {
      toast({
        title: "Wallet not connected",
        description:
          "Connect your wallet to bind the Nostr pointer on-chain.",
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
    if (!nostrPendingEvent) {
      toast({
        title: "No published event",
        description: "Publish a Nostr event first.",
        variant: "destructive",
      });
      return;
    }
    if (!forceRebind && course?.nostrDTag?.__option === "Some") {
      toast({
        title: "Nostr pointer already set",
        description: "Enable Force rebind to overwrite the existing pointer.",
        variant: "destructive",
      });
      return;
    }

    setBusy("bind");
    try {
      const authorBytes = hexToBytes32(nostrPendingEvent.authorPubkey);
      const ix = await getSetCourseNostrRefInstructionAsync({
        course: address(courseAddress),
        providerAuthority: createPlaceholderSigner(walletAddress),
        nostrDTag: nostrPendingEvent.dTag,
        nostrAuthorPubkey: authorBytes,
        force: forceRebind,
      });
      await sendTransaction([ix]);
      toast({
        title: "Pointer bound on-chain",
        description: "Nostr dTag/pubkey have been written to the course.",
      });
      await loadCourse();
      setNostrLoaded(true);
    } catch (e) {
      console.error("Bind failed:", e);
      toast({
        title: "Bind failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }, [
    course,
    courseAddress,
    forceRebind,
    isConnected,
    isProvider,
    loadCourse,
    nostrPendingEvent,
    sendTransaction,
    toast,
    walletAddress,
  ]);

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
      const nextProfile = applyCourseMetadataToProfile(profile, payload);
      setProfile(nextProfile);
      setNostrLoaded(true);
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
  }, [nostrAuthorHex, nostrDTag, profile, courseAddress, toast]);

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

  const fillTestData = () => {
    const prefix = `[${new Date().toLocaleString()}]`;
    setProfile((prev) => ({
      ...prev,
      title: `${prefix} Quantum Research Fellowship`,
      description:
        "Immersive mentorship-driven fellowship focusing on advanced quantum computing research and reproducible experiments.",
      category: "research",
      durationValue: "12",
      durationUnit: "weeks",
      supervisorName: "Dr. Hannah Watanabe",
      supervisorEmail: "h.watanabe@faircredit.dev",
      supervisorInstitution: "FairCredit Institute of Technology",
      learningObjectives:
        "Guide fellows through literature review, proposal creation, and small-scale experiments to reproduce a known quantum algorithm.",
      methodology:
        "Weekly seminars, async lab time, peer feedback, and supervisor office hours logged as on-chain resources.",
      assessmentCriteria:
        "Attendance, research logs, demo of reproduced algorithm, reflective write-up.",
      deliverables:
        "Research summary, reproducibility notebook, recorded presentation.",
      prerequisites:
        "Statement of intent plus prior Rust or TypeScript experience.",
      skills: [
        "Quantum algorithm analysis",
        "Reproducible research",
        "Technical writing",
      ],
      requirements: ["Supervisor reference", "Motivation letter"],
      tags: ["research", "quantum", "fellowship"],
    }));
    toast({
      title: "Test data populated",
      description: "Fields have been filled with sample content.",
    });
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Edit Course Profile</h1>
                <p className="text-muted-foreground">
                  {course.name || "Untitled Course"} · Created{" "}
                  {formatTimestamp(course.created)}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={fillTestData}>
              <Wand2 className="h-4 w-4 mr-2" />
              Fill Test Data
            </Button>
          </div>

          {!isProvider && (
            <Card className="mb-6 border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6 text-sm text-yellow-800">
                You are viewing this profile as a non-provider wallet. You can
                edit, but publishing to Nostr and on-chain updates require the
                provider wallet.
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between mb-8">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.number <= currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.number}
                </div>
                <p className="text-xs mt-2 text-center max-w-24">
                  {step.title}
                </p>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{steps[currentStep - 1].title}</CardTitle>
              <CardDescription>{steps[currentStep - 1].description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Course Title *</Label>
                      <Input
                        id="title"
                        value={profile.title}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                        placeholder="Advanced Quantum Computing Research"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={profile.category}
                        onValueChange={(value) =>
                          handleInputChange("category", value)
                        }
                      >
                        <SelectTrigger>
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
                    <Label htmlFor="description">Course Description *</Label>
                    <Textarea
                      id="description"
                      value={profile.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
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
                          id="durationValue"
                          type="number"
                          min={1}
                          value={profile.durationValue}
                          onChange={(e) =>
                            handleInputChange("durationValue", e.target.value)
                          }
                          placeholder="e.g. 12"
                        />
                        <Select
                          value={profile.durationUnit}
                          onValueChange={(value: "weeks" | "months" | "years") =>
                            setProfile((prev) => ({
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
              )}

              {currentStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="supervisorName">Supervisor Full Name *</Label>
                    <Input
                      id="supervisorName"
                      value={profile.supervisorName}
                      onChange={(e) =>
                        handleInputChange("supervisorName", e.target.value)
                      }
                      placeholder="Dr. Sarah Chen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supervisorEmail">Supervisor Email *</Label>
                    <Input
                      id="supervisorEmail"
                      type="email"
                      value={profile.supervisorEmail}
                      onChange={(e) =>
                        handleInputChange("supervisorEmail", e.target.value)
                      }
                      placeholder="s.chen@imperial.ac.uk"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="supervisorInstitution">Institution *</Label>
                    <Input
                      id="supervisorInstitution"
                      value={profile.supervisorInstitution}
                      onChange={(e) =>
                        handleInputChange("supervisorInstitution", e.target.value)
                      }
                      placeholder="Imperial College London"
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="learningObjectives">Learning Objectives *</Label>
                    <Textarea
                      id="learningObjectives"
                      value={profile.learningObjectives}
                      onChange={(e) =>
                        handleInputChange("learningObjectives", e.target.value)
                      }
                      placeholder="What will students learn and achieve in this course..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="methodology">Methodology *</Label>
                    <Textarea
                      id="methodology"
                      value={profile.methodology}
                      onChange={(e) =>
                        handleInputChange("methodology", e.target.value)
                      }
                      placeholder="How will the course be delivered and what methods will be used..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assessmentCriteria">Assessment Criteria *</Label>
                    <Textarea
                      id="assessmentCriteria"
                      value={profile.assessmentCriteria}
                      onChange={(e) =>
                        handleInputChange("assessmentCriteria", e.target.value)
                      }
                      placeholder="How will student work be evaluated and assessed..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliverables">Expected Deliverables *</Label>
                    <Textarea
                      id="deliverables"
                      value={profile.deliverables}
                      onChange={(e) =>
                        handleInputChange("deliverables", e.target.value)
                      }
                      placeholder="What outputs and deliverables are expected from students..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Prerequisites & Requirements</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newRequirement}
                        onChange={(e) => setNewRequirement(e.target.value)}
                        placeholder="Add a requirement..."
                        onKeyPress={(e) => e.key === "Enter" && addRequirement()}
                      />
                      <Button type="button" onClick={addRequirement} size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.requirements.map((req) => (
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
                        onKeyPress={(e) => e.key === "Enter" && addSkill()}
                      />
                      <Button type="button" onClick={addSkill} size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.skills.map((skill) => (
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
                        onKeyPress={(e) => e.key === "Enter" && addTag()}
                      />
                      <Button type="button" onClick={addTag} size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.tags.map((tag) => (
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
                    <Label htmlFor="prerequisites">Additional Prerequisites</Label>
                    <Textarea
                      id="prerequisites"
                      value={profile.prerequisites}
                      onChange={(e) =>
                        handleInputChange("prerequisites", e.target.value)
                      }
                      placeholder="Any additional prerequisites or background knowledge required..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Course Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Title:</strong> {profile.title || "—"}
                        </div>
                        <div>
                          <strong>Category:</strong> {profile.category || "—"}
                        </div>
                        <div>
                          <strong>Duration:</strong>{" "}
                          {profile.durationValue
                            ? `${profile.durationValue} ${profile.durationUnit}`
                            : "—"}
                        </div>
                        <div>
                          <strong>Status:</strong> {profile.status}
                        </div>
                      </div>
                      <div>
                        <strong>Description:</strong>
                        <p className="text-sm text-muted-foreground mt-1">
                          {profile.description || "—"}
                        </p>
                      </div>
                      <div>
                        <strong>Supervisor:</strong>{" "}
                        {profile.supervisorName || "—"} (
                        {profile.supervisorInstitution || "—"})
                      </div>
                      {profile.skills.length > 0 && (
                        <div>
                          <strong>Skills:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {profile.skills.map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {profile.requirements.length > 0 && (
                        <div>
                          <strong>Requirements:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {profile.requirements.map((req) => (
                              <Badge key={req} variant="secondary" className="text-xs">
                                {req}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {profile.tags.length > 0 && (
                        <div>
                          <strong>Tags:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {profile.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        On-Chain Metadata (Nostr)
                      </CardTitle>
                      <CardDescription>
                        Publish course metadata to a replaceable Nostr event and
                        bind the pointer on-chain.
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
                          {nostrAuthorHex
                            ? `${nostrAuthorHex.slice(0, 8)}…`
                            : "Not set"}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          onClick={syncFromNostr}
                          disabled={busy != null}
                        >
                          {busy === "sync"
                            ? "Syncing…"
                            : "Sync from Nostr"}
                        </Button>
                        <Button
                          onClick={publishToNostrAndBind}
                          disabled={busy != null || isSending}
                        >
                          {busy === "publish"
                            ? "Publishing…"
                            : "Publish to Nostr + Bind"}
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

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Publish to Nostr + Bind
                    </Button>
                    <Link href={`/courses/${courseAddress}`}>
                      <Button variant="outline">View Course</Button>
                    </Link>
                    {isProvider && course.status === CourseStatus.Draft && (
                      <Button
                        variant="secondary"
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

              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>
                <div className="flex gap-2">
                  {currentStep < 5 ? (
                    <Button onClick={() => setCurrentStep(currentStep + 1)}>
                      Next
                    </Button>
                  ) : (
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Publish to Nostr + Bind
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
