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
import { ArrowLeft, Plus, X, Save, Eye, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function CreateCourse() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [skills, setSkills] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [newRequirement, setNewRequirement] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [programCreated, setProgramCreated] = useState(false);

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (isDraft = false) => {
    setIsSubmitting(true);

    // Simulate course creation
    setTimeout(() => {
      setIsSubmitting(false);
      setProgramCreated(true);
      toast({
        title: `Course ${
          isDraft ? "Saved as Draft" : "Published"
        } Successfully!`,
        description: isDraft
          ? "You can continue editing and publish when ready."
          : "Students can now discover and apply to your course.",
      });
    }, 2000);
  };

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
      description: "Final review and publication",
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
                  Your credential course "<strong>{formData.title}</strong>" has
                  been created and is now available for student applications.
                </p>
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
          <div className="flex items-center gap-4 mb-8">
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
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(v: "draft" | "published") =>
                          setFormData((prev) => ({ ...prev, status: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">
                            Draft (inactive)
                          </SelectItem>
                          <SelectItem value="published">
                            Published (active)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Admin can change to active or pause later.
                      </p>
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
                          e.target.value,
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
                          <strong>Status:</strong>{" "}
                          {formData.status === "published"
                            ? "Published (active)"
                            : "Draft (inactive)"}
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
                  {currentStep === 5 && (
                    <Button
                      variant="outline"
                      onClick={() => handleSubmit(true)}
                      disabled={isSubmitting}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save as Draft
                    </Button>
                  )}
                  {currentStep < 5 ? (
                    <Button onClick={() => setCurrentStep(currentStep + 1)}>
                      Next
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubmit(false)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Eye className="h-4 w-4 mr-2 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Publish Course
                        </>
                      )}
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
