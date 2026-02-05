"use client";

import { useCallback, useEffect, useState } from "react";
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
  Eye,
  CheckCircle,
  Wand2,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import {
  createPlaceholderSigner,
  DEFAULT_PLACEHOLDER_SIGNER,
} from "@/lib/solana/placeholder-signer";
import { getUpdateHubConfigInstructionAsync } from "@/lib/solana/generated/instructions/updateHubConfig";
import { getInitializeProviderInstructionAsync } from "@/lib/solana/generated/instructions/initializeProvider";
import { getCreateCourseInstructionAsync } from "@/lib/solana/generated/instructions/createCourse";
import type { Address } from "@solana/kit";
import { type CourseProfile } from "@/lib/course-profile";
import { buildCourseMetadataPayload } from "@/lib/course-metadata";
import {
  buildCourseDTag,
  DEFAULT_RELAYS,
  fetchLatestCourseEvent,
  publishCourseEvent,
} from "@/lib/nostr/client";
import { nip19 } from "nostr-tools";
import { useTransactionQueue } from "@/hooks/use-transaction-queue";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { fetchMaybeCourse } from "@/lib/solana/generated/accounts/course";

export default function CreateCourse() {
  const { toast } = useToast();
  const { rpc } = useFairCredit();
  const { address: walletAddress, isConnected } = useAppKitAccount();
  const { sendTransaction, isSending, walletProvider } =
    useAppKitTransaction();
  const transactionQueue = useTransactionQueue();
  const [currentStep, setCurrentStep] = useState(1);
  const [skills, setSkills] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [newRequirement, setNewRequirement] = useState("");
  const [newTag, setNewTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [programCreated, setProgramCreated] = useState(false);
  const [createdCourseAddress, setCreatedCourseAddress] = useState<
    string | null
  >(null);
  const [nostrPublishStatus, setNostrPublishStatus] = useState<
    "idle" | "publishing" | "published" | "error"
  >("idle");
  const [nostrPublishError, setNostrPublishError] = useState<string | null>(
    null,
  );
  const [nostrEventId, setNostrEventId] = useState<string | null>(null);
  const [nostrDTag, setNostrDTag] = useState<string | null>(null);
  const [nostrNevent, setNostrNevent] = useState<string | null>(null);
  const [nostrVerifyUrl, setNostrVerifyUrl] = useState<string | null>(null);
  const [nostrDraft, setNostrDraft] = useState<{
    courseAddress: Address<string>;
    creationTimestamp: number;
    profile: CourseProfile;
    workloadRequired: number;
    dTag: string;
    authorPubkey: string;
    eventId: string;
  } | null>(null);
  const [hubAddress, setHubAddress] = useState<Address | null>(null);
  const [providerPda, setProviderPda] = useState<Address | null>(null);
  const [resolvingProvider, setResolvingProvider] = useState(false);
  const [isConfirmingOnChain, setIsConfirmingOnChain] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    durationValue: "",
    durationUnit: "weeks" as "weeks" | "months" | "years",
    supervisorName: "",
    supervisorEmail: "",
    supervisorInstitution: "",
    learningObjectives: "",
    methodology: "",
    assessmentCriteria: "",
    deliverables: "",
    status: "draft" as "draft" | "published",
    prerequisites: "",
  });

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  const addRequirement = () => {
    if (
      newRequirement.trim() &&
      !requirements.includes(newRequirement.trim())
    ) {
      setRequirements([...requirements, newRequirement.trim()]);
      setNewRequirement("");
    }
  };

  const removeRequirement = (reqToRemove: string) => {
    setRequirements(requirements.filter((req) => req !== reqToRemove));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = useCallback(async () => {
    if (!walletAddress || !hubAddress || !providerPda) {
      toast({
        title: "Wallet or provider not ready",
        description:
          "Connect your provider wallet and make sure the provider account exists on-chain.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title || !formData.description) {
      toast({
        title: "Missing required fields",
        description: "Please provide at least a course title and description.",
        variant: "destructive",
      });
      return;
    }

    setNostrPublishStatus("publishing");
    setNostrPublishError(null);
    setNostrEventId(null);
    setNostrDTag(null);
    setNostrNevent(null);
    setNostrVerifyUrl(null);
    setNostrDraft(null);
    setCreatedCourseAddress(null);
    setIsSubmitting(true);
    try {
      const creationTimestamp = BigInt(Math.floor(Date.now() / 1000));
      const workloadRequired = Number(formData.durationValue) || 0;
      const createIx = await getCreateCourseInstructionAsync({
        provider: providerPda,
        hub: hubAddress,
        providerAuthority: createPlaceholderSigner(walletAddress),
        creationTimestamp,
        name: formData.title,
        description: formData.description,
        workloadRequired,
        degreeId: null,
        nostrDTag: null,
        nostrAuthorPubkey: null,
      });
      const derivedAddress = createIx.accounts[0].address;
      const creationTimestampNum = Number(creationTimestamp);
      const profileSnapshot: CourseProfile = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        durationValue: formData.durationValue,
        durationUnit: formData.durationUnit,
        supervisorName: formData.supervisorName,
        supervisorEmail: formData.supervisorEmail,
        supervisorInstitution: formData.supervisorInstitution,
        learningObjectives: formData.learningObjectives,
        methodology: formData.methodology,
        assessmentCriteria: formData.assessmentCriteria,
        deliverables: formData.deliverables,
        prerequisites: formData.prerequisites,
        status: formData.status,
        skills,
        requirements,
        tags,
        updatedAt: null,
      };
      const dTag = buildCourseDTag({
        coursePubkey: derivedAddress,
        creationTimestamp: creationTimestampNum,
      });
      const payload = buildCourseMetadataPayload(profileSnapshot, {
        courseAddress: String(derivedAddress),
        creationTimestamp: creationTimestampNum,
      });
      const published = await publishCourseEvent({
        dTag,
        content: JSON.stringify(payload),
        walletAddress,
        signMessage: walletProvider?.signMessage
          ? (message) => walletProvider.signMessage(message)
          : undefined,
      });

      setNostrEventId(published.eventId);
      setNostrDTag(dTag);
      let neventValue: string | null = null;
      try {
        neventValue = nip19.neventEncode({
          id: published.eventId,
          author: published.authorPubkey,
          relays: DEFAULT_RELAYS.map((relay) => relay.url),
        });
        setNostrNevent(neventValue);
      } catch {
        setNostrNevent(null);
      }

      const confirmed = await confirmNostrEvent({
        dTag,
        authorPubkey: published.authorPubkey,
        eventId: published.eventId,
      });
      if (!confirmed) {
        throw new Error(
          "Nostr event not confirmed on relays yet. Please retry.",
        );
      }
      if (neventValue) {
        setNostrVerifyUrl(`https://njump.me/${neventValue}`);
      }

      setNostrDraft({
        courseAddress: derivedAddress,
        creationTimestamp: creationTimestampNum,
        profile: profileSnapshot,
        workloadRequired,
        dTag,
        authorPubkey: published.authorPubkey,
        eventId: published.eventId,
      });
      setNostrPublishStatus("published");
      toast({
        title: "Nostr event published",
        description: "Review the event, then confirm to create on-chain.",
      });
    } catch (error) {
      console.error("Nostr publish failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Wallet-derived Nostr signing unavailable.";
      setNostrPublishStatus("error");
      setNostrPublishError(message);
      toast({
        title: "Nostr publish failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    formData,
    hubAddress,
    providerPda,
    requirements,
    sendTransaction,
    skills,
    tags,
    toast,
    walletAddress,
    walletProvider,
  ]);

  const confirmNostrEvent = async (params: {
    dTag: string;
    authorPubkey: string;
    eventId: string;
  }) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const event = await fetchLatestCourseEvent({
        dTag: params.dTag,
        authorPubkey: params.authorPubkey,
      });
      if (event?.id === params.eventId) return true;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return false;
  };

  const handleConfirmCreate = async () => {
    if (!nostrDraft) return;
    if (!walletAddress || !hubAddress || !providerPda) {
      toast({
        title: "Wallet or provider not ready",
        description:
          "Connect your provider wallet and make sure the provider account exists on-chain.",
        variant: "destructive",
      });
      return;
    }
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Connect your wallet to submit the on-chain transaction.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      transactionQueue.enqueue({
        module: "Courses",
        label: "Create course",
        build: async () => {
          const authorBytes = hexToBytes32(nostrDraft.authorPubkey);
          const createIx = await getCreateCourseInstructionAsync({
            course: nostrDraft.courseAddress,
            provider: providerPda,
            hub: hubAddress,
            providerAuthority: createPlaceholderSigner(walletAddress),
            creationTimestamp: nostrDraft.creationTimestamp,
            name: nostrDraft.profile.title,
            description: nostrDraft.profile.description,
            workloadRequired: nostrDraft.workloadRequired,
            degreeId: null,
            nostrDTag: nostrDraft.dTag,
            nostrAuthorPubkey: authorBytes,
          });
          return [createIx];
        },
      });
      setCreatedCourseAddress(String(nostrDraft.courseAddress));
      toast({
        title: "Course creation enqueued",
        description:
          "Approve the transaction in your wallet and wait for it to land on-chain.",
      });
    } catch (error) {
      console.error("Create course failed:", error);
      toast({
        title: "Failed to enqueue course creation",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillTestData = () => {
    const prefix = `[${formatTimestamp(new Date())}]`;
    setFormData({
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
      status: "draft",
      prerequisites:
        "Statement of intent plus prior Rust or TypeScript experience.",
    });
    setSkills([
      "Quantum algorithm analysis",
      "Reproducible research",
      "Technical writing",
    ]);
    setRequirements(["Supervisor reference", "Motivation letter"]);
    setTags(["research", "quantum", "fellowship"]);
    toast({
      title: "Test data populated",
      description: "Fields have been filled with sample content.",
    });
  };

  const isActionDisabled =
    isSubmitting || isSending || resolvingProvider || !isConnected;

  useEffect(() => {
    if (currentStep !== 5) return;
    if (nostrPublishStatus !== "idle") return;
    if (isActionDisabled) return;
    handleSubmit();
  }, [currentStep, handleSubmit, isActionDisabled, nostrPublishStatus]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ix = await getUpdateHubConfigInstructionAsync({
          hub: undefined,
          authority: DEFAULT_PLACEHOLDER_SIGNER,
          config: {
            requireProviderApproval: false,
            minReputationScore: 0,
          },
        });
        if (mounted) {
          setHubAddress(ix.accounts[0].address);
        }
      } catch (error) {
        console.error("Failed to resolve hub PDA", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!walletAddress) {
      setProviderPda(null);
      return;
    }
    let mounted = true;
    setResolvingProvider(true);
    (async () => {
      try {
        const ix = await getInitializeProviderInstructionAsync({
          providerAccount: undefined,
          providerAuthority: createPlaceholderSigner(walletAddress),
          name: "",
          description: "",
          website: "",
          email: "",
          providerType: "",
        });
        if (mounted) {
          setProviderPda(ix.accounts[0].address);
        }
      } catch (error) {
        console.error("Failed to resolve provider PDA", error);
        if (mounted) {
          setProviderPda(null);
        }
      } finally {
        if (mounted) {
          setResolvingProvider(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [walletAddress]);

  useEffect(() => {
    if (!createdCourseAddress || !rpc || programCreated) return;
    let cancelled = false;
    setIsConfirmingOnChain(true);

    (async () => {
      try {
        for (let attempt = 0; attempt < 10; attempt++) {
          if (cancelled) return;
          const maybe = await fetchMaybeCourse(
            rpc,
            createdCourseAddress as Address<string>,
          );
          if (maybe.exists) {
            if (!cancelled) {
              setProgramCreated(true);
              toast({
                title: "Course created on-chain",
                description:
                  "The course account now exists on-chain and is ready in your dashboard.",
              });
            }
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } catch (error) {
        console.error("Failed to confirm course creation on-chain", error);
      } finally {
        if (!cancelled) {
          setIsConfirmingOnChain(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [createdCourseAddress, rpc, programCreated, toast]);

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
      title: "Requirements & Skills",
      description: "Prerequisites and outcomes",
    },
    {
      number: 5,
      title: "Review & Publish",
      description: "Publish Nostr first, then confirm on-chain",
    },
  ];

  if (programCreated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardContent className="pt-8">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-4">
                  Course Created Successfully!
                </h1>
                <p className="text-muted-foreground mb-6">
                  Your credential course "<strong>{formData.title}</strong>" is
                  now available on-chain. You can submit it to the hub so
                  students can enroll once verified.
                </p>
                {createdCourseAddress && (
                  <p className="text-xs text-muted-foreground font-mono mb-4 break-all">
                    Course Address: {createdCourseAddress}
                  </p>
                )}
                {nostrDTag && (
                  <p className="text-xs text-muted-foreground font-mono mb-2 break-all">
                    Nostr dTag: {nostrDTag}
                  </p>
                )}
                {nostrNevent && (
                  <p className="text-xs text-muted-foreground font-mono mb-2 break-all">
                    Nostr nevent: {nostrNevent}
                  </p>
                )}
                {nostrEventId && (
                  <p className="text-xs text-muted-foreground font-mono mb-4 break-all">
                    Nostr Event: {nostrEventId}
                  </p>
                )}
                {nostrVerifyUrl && (
                  <p className="text-xs text-muted-foreground font-mono mb-4 break-all">
                    Verified URL:{" "}
                    <a
                      href={nostrVerifyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {nostrVerifyUrl}
                    </a>
                  </p>
                )}
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">What happens next:</h3>
                    <ul className="text-sm text-left space-y-1">
                      <li>• Students can discover and apply to your course</li>
                      <li>
                        • You'll receive notifications when applications are
                        submitted
                      </li>
                      <li>
                        • Review applications through your provider dashboard
                      </li>
                      <li>
                        • Send approved applications to supervisors for
                        endorsement
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <Link href="/courses">
                      <Button>View All Courses</Button>
                    </Link>
                    <Link href="/courses/create">
                      <Button variant="outline">Create Another</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
              <Link href="/courses">
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Create Credential Course</h1>
                <p className="text-muted-foreground">
                  Step {currentStep} of {steps.length}:{" "}
                  {steps[currentStep - 1].description}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fillTestData}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Fill Test Data
            </Button>
          </div>

          {/* Progress Steps */}
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
                <p className="text-xs mt-2 text-center max-w-20">
                  {step.title}
                </p>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{steps[currentStep - 1].title}</CardTitle>
              <CardDescription>
                {steps[currentStep - 1].description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Course Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) =>
                          handleInputChange("title", e.target.value)
                        }
                        placeholder="Advanced Quantum Computing Research"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category}
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
                          <SelectItem value="engineering">
                            Engineering
                          </SelectItem>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="arts">
                            Arts & Humanities
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Course Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
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
                          value={formData.durationValue}
                          onChange={(e) =>
                            handleInputChange("durationValue", e.target.value)
                          }
                          placeholder="e.g. 12"
                        />
                        <Select
                          value={formData.durationUnit}
                          onValueChange={(v: "weeks" | "months" | "years") =>
                            setFormData((prev) => ({
                              ...prev,
                              durationUnit: v,
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

              {/* Step 2: Academic Supervisor */}
              {currentStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="supervisorName">
                      Supervisor Full Name *
                    </Label>
                    <Input
                      id="supervisorName"
                      value={formData.supervisorName}
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
                      value={formData.supervisorEmail}
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
                      value={formData.supervisorInstitution}
                      onChange={(e) =>
                        handleInputChange(
                          "supervisorInstitution",
                          e.target.value
                        )
                      }
                      placeholder="Imperial College London"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Course Structure */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="learningObjectives">
                      Learning Objectives *
                    </Label>
                    <Textarea
                      id="learningObjectives"
                      value={formData.learningObjectives}
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
                      value={formData.methodology}
                      onChange={(e) =>
                        handleInputChange("methodology", e.target.value)
                      }
                      placeholder="How will the course be delivered and what methods will be used..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assessmentCriteria">
                      Assessment Criteria *
                    </Label>
                    <Textarea
                      id="assessmentCriteria"
                      value={formData.assessmentCriteria}
                      onChange={(e) =>
                        handleInputChange("assessmentCriteria", e.target.value)
                      }
                      placeholder="How will student work be evaluated and assessed..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliverables">
                      Expected Deliverables *
                    </Label>
                    <Textarea
                      id="deliverables"
                      value={formData.deliverables}
                      onChange={(e) =>
                        handleInputChange("deliverables", e.target.value)
                      }
                      placeholder="What outputs and deliverables are expected from students..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Requirements & Skills */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Prerequisites & Requirements</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newRequirement}
                        onChange={(e) => setNewRequirement(e.target.value)}
                        placeholder="Add a requirement..."
                        onKeyPress={(e) =>
                          e.key === "Enter" && addRequirement()
                        }
                      />
                      <Button
                        type="button"
                        onClick={addRequirement}
                        size="icon"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {requirements.map((req, index) => (
                        <Badge
                          key={index}
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
                      {skills.map((skill, index) => (
                        <Badge
                          key={index}
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
                      {tags.map((tag, index) => (
                        <Badge
                          key={index}
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
                    <Label htmlFor="prerequisites">
                      Additional Prerequisites
                    </Label>
                    <Textarea
                      id="prerequisites"
                      value={formData.prerequisites}
                      onChange={(e) =>
                        handleInputChange("prerequisites", e.target.value)
                      }
                      placeholder="Any additional prerequisites or background knowledge required..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Step 5: Review & Publish */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Course Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Title:</strong> {formData.title}
                        </div>
                        <div>
                          <strong>Category:</strong> {formData.category}
                        </div>
                        <div>
                          <strong>Duration:</strong>{" "}
                          {formData.durationValue
                            ? `${formData.durationValue} ${formData.durationUnit}`
                            : "—"}
                        </div>
                        <div>
                          <strong>Status:</strong> Draft (default; submit for
                          Hub review from dashboard after creation)
                        </div>
                      </div>
                      <div>
                        <strong>Description:</strong>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formData.description}
                        </p>
                      </div>
                      <div>
                        <strong>Supervisor:</strong> {formData.supervisorName} (
                        {formData.supervisorInstitution})
                      </div>
                      {skills.length > 0 && (
                        <div>
                          <strong>Skills:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {skills.map((skill, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {requirements.length > 0 && (
                        <div>
                          <strong>Requirements:</strong>
                          <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                            {requirements.map((req, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-2"
                              >
                                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
                                <span>{req}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {tags.length > 0 && (
                        <div>
                          <strong>Tags:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tags.map((tag, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
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
                      <CardTitle className="text-lg">Nostr Event</CardTitle>
                      <CardDescription>
                        Publish the course metadata to Nostr first, then confirm
                        to write the pointer on-chain.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <strong>Status:</strong>{" "}
                        {nostrPublishStatus === "published"
                          ? "Published"
                          : nostrPublishStatus === "publishing"
                          ? "Publishing…"
                          : nostrPublishStatus === "error"
                          ? "Error"
                          : "Not published"}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <strong>Course Address (PDA):</strong>
                          <p className="font-mono text-xs break-all">
                            {nostrDraft?.courseAddress
                              ? String(nostrDraft.courseAddress)
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <strong>dTag:</strong>
                          <p className="font-mono text-xs break-all">
                            {nostrDTag ?? "—"}
                          </p>
                        </div>
                        <div>
                          <strong>Event ID:</strong>
                          <p className="font-mono text-xs break-all">
                            {nostrEventId ?? "—"}
                          </p>
                        </div>
                        <div>
                          <strong>nevent:</strong>
                          <p className="font-mono text-xs break-all">
                            {nostrNevent ?? "—"}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <strong>Verified URL:</strong>
                          {nostrVerifyUrl ? (
                            <a
                              href={nostrVerifyUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-xs break-all underline"
                            >
                              {nostrVerifyUrl}
                            </a>
                          ) : (
                            <p className="font-mono text-xs break-all">
                              {nostrNevent
                                ? "Pending confirmation…"
                                : "—"}
                            </p>
                          )}
                        </div>
                      </div>
                      {nostrPublishError && (
                        <p className="text-xs text-destructive">
                          {nostrPublishError}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Navigation Buttons */}
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
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleSubmit}
                        disabled={
                          isActionDisabled || nostrPublishStatus === "publishing"
                        }
                      >
                        {nostrPublishStatus === "publishing" ? (
                          <>
                            <Eye className="h-4 w-4 mr-2 animate-spin" />
                            Publishing Nostr…
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            {nostrPublishStatus === "published"
                              ? "Republish Nostr Event"
                              : "Publish Nostr Event"}
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleConfirmCreate}
                        disabled={
                          isActionDisabled || nostrPublishStatus !== "published"
                        }
                      >
                        {isSubmitting || isSending ? (
                          <>
                            <Eye className="h-4 w-4 mr-2 animate-spin" />
                            Creating…
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirm & Create Course
                          </>
                        )}
                      </Button>
                    </div>
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

function formatTimestamp(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
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
