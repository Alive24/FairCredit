"use client";

import { useState } from "react";
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
import { ArrowLeft, Plus, X, Send, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useAppKitAccount } from "@reown/appkit/react";
import { useCourses } from "@/hooks/use-courses";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import { useIsHubAuthority } from "@/hooks/use-is-hub-authority";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { getCreateCredentialInstructionAsync } from "@/lib/solana/generated/instructions/createCredential";
import type { CourseEntry } from "@/hooks/use-courses";
import { CourseStatus } from "@/lib/solana/generated/types/courseStatus";

export default function CreateCredential() {
  const { toast } = useToast();
  const { address: walletAddress, isConnected } = useAppKitAccount();
  const { sendTransaction, isSending } = useAppKitTransaction();
  const { hubData } = useIsHubAuthority();
  const acceptedProviderWallets =
    hubData?.acceptedProviders?.map((p: unknown) => String(p)) ?? [];
  const { courses, loading: coursesLoading } = useCourses(
    acceptedProviderWallets.length > 0 ? acceptedProviderWallets : null,
  );
  const acceptedCourses = courses.filter(
    (c) => c.course.status === CourseStatus.Accepted,
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentialCreated, setCredentialCreated] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseEntry | null>(
    null,
  );

  const [formData, setFormData] = useState({
    // Student Information
    studentName: "",
    studentEmail: "",
    studentWallet: "",

    // Academic Supervisor Information
    supervisorName: "",
    supervisorEmail: "",
    supervisorInstitution: "",
    supervisorTitle: "",
    mentorWallet: "",

    // Credential Details
    credentialTitle: "",
    credentialDescription: "",
    researchArea: "",
    credentialType: "",
    duration: "",

    // Research Details
    researchObjectives: "",
    methodology: "",
    outcomes: "",
    publications: "",
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!walletAddress || !selectedCourse) {
      toast({
        title: "Missing required fields",
        description: "Connect your wallet and select a verified course.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const ix = await getCreateCredentialInstructionAsync({
        credential: undefined,
        course: selectedCourse.address,
        provider: selectedCourse.course.provider,
        hub: undefined,
        student: createPlaceholderSigner(walletAddress),
        systemProgram: undefined,
      });

      await sendTransaction([ix]);
      setCredentialCreated(true);
      toast({
        title: "Credential Created Successfully!",
        description:
          "Your credential request has been created. Next: mentor endorsement → provider approval → you can mint the NFT.",
      });
    } catch (e) {
      console.error("Create credential failed:", e);
      toast({
        title: "Failed to create credential",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    {
      number: 1,
      title: "Student Information",
      description: "Basic student details",
    },
    {
      number: 2,
      title: "Academic Supervisor",
      description: "Supervisor information",
    },
    {
      number: 3,
      title: "Credential Details",
      description: "Achievement information",
    },
    { number: 4, title: "Research Details", description: "Research specifics" },
    { number: 5, title: "Review & Submit", description: "Final review" },
  ];

  if (credentialCreated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardContent className="pt-8">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-4">
                  Credential Created Successfully!
                </h1>
                <p className="text-muted-foreground mb-6">
                  The academic credential has been created and a secure
                  endorsement link has been sent to{" "}
                  <strong>{formData.supervisorEmail}</strong> for verification.
                </p>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Next Steps:</h3>
                    <ul className="text-sm text-left space-y-1">
                      <li>• Mentor endorses the credential on-chain</li>
                      <li>
                        • Provider approves the endorsed credential (Verified)
                      </li>
                      <li>
                        • Student mints an NFT after the credential is Verified
                      </li>
                      <li>• Mint address is written back to the credential</li>
                    </ul>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <Link href="/dashboard">
                      <Button>Return to Dashboard</Button>
                    </Link>
                    <Link href="/create-credential">
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
          <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Create Academic Credential</h1>
              <p className="text-muted-foreground">
                Step {currentStep} of {steps.length}:{" "}
                {steps[currentStep - 1].description}
              </p>
            </div>
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
              {/* Step 1: Student Information */}
              {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="studentName">Student Full Name *</Label>
                    <Input
                      id="studentName"
                      value={formData.studentName}
                      onChange={(e) =>
                        handleInputChange("studentName", e.target.value)
                      }
                      placeholder="Alex Kingsley"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentEmail">Student Email *</Label>
                    <Input
                      id="studentEmail"
                      type="email"
                      value={formData.studentEmail}
                      onChange={(e) =>
                        handleInputChange("studentEmail", e.target.value)
                      }
                      placeholder="alex.kingsley@email.com"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="studentWallet">
                      Student Wallet Address *
                    </Label>
                    <Input
                      id="studentWallet"
                      value={formData.studentWallet}
                      onChange={(e) =>
                        handleInputChange("studentWallet", e.target.value)
                      }
                      placeholder="7xKXtg2CW9to3QyvkstNQtUTdLBqkF9vamLhTukF9mNp"
                    />
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
                  <div className="space-y-2">
                    <Label htmlFor="supervisorInstitution">Institution *</Label>
                    <Input
                      id="supervisorInstitution"
                      value={formData.supervisorInstitution}
                      onChange={(e) =>
                        handleInputChange(
                          "supervisorInstitution",
                          e.target.value,
                        )
                      }
                      placeholder="Imperial College London"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supervisorTitle">Academic Title *</Label>
                    <Input
                      id="supervisorTitle"
                      value={formData.supervisorTitle}
                      onChange={(e) =>
                        handleInputChange("supervisorTitle", e.target.value)
                      }
                      placeholder="Professor of Quantum Computing"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="mentorWallet">
                      Mentor (Supervisor) Wallet Address *
                    </Label>
                    <Input
                      id="mentorWallet"
                      value={formData.mentorWallet}
                      onChange={(e) =>
                        handleInputChange("mentorWallet", e.target.value)
                      }
                      placeholder="Mentor Solana wallet for endorsement"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Credential Details */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Course *</Label>
                    <Select
                      value={selectedCourse?.address ?? ""}
                      onValueChange={(addr) => {
                        const c = acceptedCourses.find(
                          (x) => x.address === addr,
                        );
                        setSelectedCourse(c ?? null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            coursesLoading
                              ? "Loading courses…"
                              : "Select a verified course"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {acceptedCourses.map((c) => (
                          <SelectItem key={c.address} value={c.address}>
                            {c.course.name} (ts=
                            {String(c.course.creationTimestamp)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!coursesLoading &&
                      acceptedCourses.length === 0 &&
                      isConnected && (
                        <p className="text-sm text-muted-foreground">
                          No verified courses. Create and get a course accepted
                          first.
                        </p>
                      )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="credentialTitle">
                        Credential Title *
                      </Label>
                      <Input
                        id="credentialTitle"
                        value={formData.credentialTitle}
                        onChange={(e) =>
                          handleInputChange("credentialTitle", e.target.value)
                        }
                        placeholder="Advanced Quantum Computing Research"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="credentialType">Credential Type *</Label>
                      <Select
                        value={formData.credentialType}
                        onValueChange={(value) =>
                          handleInputChange("credentialType", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select credential type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="research">
                            Research Project
                          </SelectItem>
                          <SelectItem value="internship">
                            Academic Internship
                          </SelectItem>
                          <SelectItem value="publication">
                            Research Publication
                          </SelectItem>
                          <SelectItem value="conference">
                            Conference Presentation
                          </SelectItem>
                          <SelectItem value="thesis">Thesis Project</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credentialDescription">Description *</Label>
                    <Textarea
                      id="credentialDescription"
                      value={formData.credentialDescription}
                      onChange={(e) =>
                        handleInputChange(
                          "credentialDescription",
                          e.target.value,
                        )
                      }
                      placeholder="Detailed description of the academic achievement..."
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="researchArea">Research Area *</Label>
                      <Input
                        id="researchArea"
                        value={formData.researchArea}
                        onChange={(e) =>
                          handleInputChange("researchArea", e.target.value)
                        }
                        placeholder="Quantum Computing, Machine Learning"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration *</Label>
                      <Input
                        id="duration"
                        value={formData.duration}
                        onChange={(e) =>
                          handleInputChange("duration", e.target.value)
                        }
                        placeholder="6 months"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Skills Demonstrated</Label>
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
                </div>
              )}

              {/* Step 4: Research Details */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="researchObjectives">
                      Research Objectives *
                    </Label>
                    <Textarea
                      id="researchObjectives"
                      value={formData.researchObjectives}
                      onChange={(e) =>
                        handleInputChange("researchObjectives", e.target.value)
                      }
                      placeholder="Describe the research objectives and goals..."
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
                      placeholder="Describe the research methodology used..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="outcomes">Key Outcomes *</Label>
                    <Textarea
                      id="outcomes"
                      value={formData.outcomes}
                      onChange={(e) =>
                        handleInputChange("outcomes", e.target.value)
                      }
                      placeholder="Describe the key outcomes and achievements..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="publications">
                      Publications/Presentations
                    </Label>
                    <Textarea
                      id="publications"
                      value={formData.publications}
                      onChange={(e) =>
                        handleInputChange("publications", e.target.value)
                      }
                      placeholder="List any publications, presentations, or other outputs..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Step 5: Review & Submit */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Student Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p>
                          <strong>Name:</strong> {formData.studentName}
                        </p>
                        <p>
                          <strong>Email:</strong> {formData.studentEmail}
                        </p>
                        <p>
                          <strong>Wallet:</strong> {formData.studentWallet}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Academic Supervisor
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p>
                          <strong>Name:</strong> {formData.supervisorName}
                        </p>
                        <p>
                          <strong>Email:</strong> {formData.supervisorEmail}
                        </p>
                        <p>
                          <strong>Institution:</strong>{" "}
                          {formData.supervisorInstitution}
                        </p>
                        <p>
                          <strong>Title:</strong> {formData.supervisorTitle}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Credential Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p>
                        <strong>Title:</strong> {formData.credentialTitle}
                      </p>
                      <p>
                        <strong>Type:</strong> {formData.credentialType}
                      </p>
                      <p>
                        <strong>Description:</strong>{" "}
                        {formData.credentialDescription}
                      </p>
                      <p>
                        <strong>Research Area:</strong> {formData.researchArea}
                      </p>
                      <p>
                        <strong>Duration:</strong> {formData.duration}
                      </p>
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
                {currentStep < 5 ? (
                  <Button onClick={() => setCurrentStep(currentStep + 1)}>
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || isSending || !selectedCourse}
                  >
                    {isSubmitting || isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Credential...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Create & Send for Endorsement
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
