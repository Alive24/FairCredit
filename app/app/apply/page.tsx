"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Upload, Send, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function ApplyForCredential() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [applicationSubmitted, setApplicationSubmitted] = useState(false)

  const [formData, setFormData] = useState({
    studentName: "",
    studentEmail: "",
    studentWallet: "",
    provider: "",
    credentialType: "",
    workTitle: "",
    workDescription: "",
    completionDate: "",
    supportingDocuments: "",
  })

  const providers = [
    "Scholar Bridge Initiative (SBI)",
    "MedTech Research Institute",
    "Green Energy Consortium",
    "Digital Innovation Academy",
    "Global Skills Certification",
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    // Simulate application submission
    setTimeout(() => {
      setIsSubmitting(false)
      setApplicationSubmitted(true)
      toast({
        title: "Application Submitted Successfully!",
        description: "The educational provider will review your application.",
      })
    }, 2000)
  }

  if (applicationSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardContent className="pt-8">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-4">Application Submitted Successfully!</h1>
                <p className="text-muted-foreground mb-6">
                  Your credential application has been submitted to <strong>{formData.provider}</strong>. They will
                  review your work and contact you with their decision.
                </p>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">What happens next:</h3>
                    <ul className="text-sm text-left space-y-1">
                      <li>• Educational provider reviews your application</li>
                      <li>• If approved, they'll send it to an academic supervisor</li>
                      <li>• Supervisor provides cryptographic endorsement</li>
                      <li>• NFT credential is minted to your wallet</li>
                    </ul>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <Link href="/credentials">
                      <Button>Track My Applications</Button>
                    </Link>
                    <Link href="/apply">
                      <Button variant="outline">Submit Another</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Apply for Academic Credential</h1>
              <p className="text-muted-foreground">Submit your academic work for verification and credentialing</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Credential Application</CardTitle>
              <CardDescription>
                Complete this form to apply for a blockchain-verified academic credential
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Student Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Student Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentName">Full Name *</Label>
                    <Input
                      id="studentName"
                      value={formData.studentName}
                      onChange={(e) => handleInputChange("studentName", e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentEmail">Email Address *</Label>
                    <Input
                      id="studentEmail"
                      type="email"
                      value={formData.studentEmail}
                      onChange={(e) => handleInputChange("studentEmail", e.target.value)}
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentWallet">Wallet Address *</Label>
                  <Input
                    id="studentWallet"
                    value={formData.studentWallet}
                    onChange={(e) => handleInputChange("studentWallet", e.target.value)}
                    placeholder="Your Solana wallet address"
                  />
                </div>
              </div>

              {/* Application Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Application Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Educational Provider *</Label>
                    <Select value={formData.provider} onValueChange={(value) => handleInputChange("provider", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider} value={provider}>
                            {provider}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credentialType">Credential Type *</Label>
                    <Select
                      value={formData.credentialType}
                      onValueChange={(value) => handleInputChange("credentialType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="research">Research Project</SelectItem>
                        <SelectItem value="internship">Academic Internship</SelectItem>
                        <SelectItem value="publication">Research Publication</SelectItem>
                        <SelectItem value="conference">Conference Presentation</SelectItem>
                        <SelectItem value="thesis">Thesis Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Work Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Academic Work Details</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="workTitle">Work Title *</Label>
                    <Input
                      id="workTitle"
                      value={formData.workTitle}
                      onChange={(e) => handleInputChange("workTitle", e.target.value)}
                      placeholder="Title of your academic work"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workDescription">Work Description *</Label>
                    <Textarea
                      id="workDescription"
                      value={formData.workDescription}
                      onChange={(e) => handleInputChange("workDescription", e.target.value)}
                      placeholder="Detailed description of your academic work, methodology, and outcomes..."
                      rows={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="completionDate">Completion Date *</Label>
                    <Input
                      id="completionDate"
                      type="date"
                      value={formData.completionDate}
                      onChange={(e) => handleInputChange("completionDate", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Supporting Documents */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Supporting Documents</h3>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">Upload your supporting documents</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Include research papers, presentations, certificates, or other relevant materials
                  </p>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="w-full">
                  {isSubmitting ? (
                    <>
                      <Send className="h-4 w-4 mr-2 animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
