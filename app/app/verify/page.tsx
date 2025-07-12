"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  ExternalLink,
  Search,
  User,
  GraduationCap,
  Calendar,
  Loader2,
  AlertCircle,
  Shield,
} from "lucide-react"
import { useSearchParams } from "next/navigation"

export default function VerifyCredential() {
  const searchParams = useSearchParams()
  const [verificationUrl, setVerificationUrl] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const urlParam = searchParams.get("url")
    if (urlParam) {
      setVerificationUrl(urlParam)
      handleVerification(urlParam)
    }
  }, [searchParams])

  const handleVerification = async (url?: string) => {
    const urlToVerify = url || verificationUrl
    if (!urlToVerify) return

    setIsVerifying(true)
    setVerificationResult(null)
    setError("")

    // Simulate verification process
    setTimeout(() => {
      if (
        urlToVerify.includes("demo") ||
        urlToVerify.includes("qc-research") ||
        urlToVerify.includes("ml-healthcare")
      ) {
        setVerificationResult({
          isValid: true,
          credential: {
            id: "qc-research-123",
            title: "Advanced Quantum Computing Research",
            student: "Alex Kingsley",
            provider: "Scholar Bridge Initiative (SBI)",
            supervisor: "Dr. Sarah Chen, Imperial College London",
            issueDate: "2024-01-15",
            skills: ["Quantum Algorithms", "Research Methodology", "Academic Writing", "Data Analysis"],
            verificationCount: 12,
            blockchainTxId: "5KJp9c2GVuPvqDqydgXc2HJUV4C3nEHVp1xPtUPiHMbN",
            nftAddress: "7xKXtg2CW9to3QyvkstNQtUTdLBqkF9vamLhTukF9mNp",
            description:
              "A comprehensive research project exploring quantum algorithms and their applications in cryptography and optimization problems.",
            researchArea: "Quantum Computing, Cryptography",
            duration: "6 months",
            objectives: "To develop and analyze novel quantum algorithms for solving complex optimization problems.",
            outcomes:
              "Successfully developed three new quantum algorithms with improved efficiency over classical counterparts.",
          },
        })
      } else {
        setError("Invalid verification URL or credential not found.")
      }
      setIsVerifying(false)
    }, 2000)
  }

  const handleDemoClick = () => {
    setVerificationUrl("https://faircredit.app/verify/demo-credential-123")
    handleVerification("https://faircredit.app/verify/demo-credential-123")
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Verify Academic Credentials</h1>
            <p className="text-muted-foreground">
              Enter a FairCredit verification URL to instantly verify academic credentials on the blockchain
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Credential Verification
              </CardTitle>
              <CardDescription>
                Enter a FairCredit verification URL to instantly verify academic credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://faircredit.app/verify/..."
                  value={verificationUrl}
                  onChange={(e) => setVerificationUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={() => handleVerification()} disabled={isVerifying || !verificationUrl}>
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={handleDemoClick}
                  className="flex-1 bg-transparent"
                  disabled={isVerifying}
                >
                  Try Demo Credential
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setVerificationUrl("https://faircredit.app/verify/ml-healthcare-456")
                    handleVerification("https://faircredit.app/verify/ml-healthcare-456")
                  }}
                  className="flex-1 bg-transparent"
                  disabled={isVerifying}
                >
                  Try ML Healthcare Demo
                </Button>
              </div>

              {error && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <p className="text-red-800 dark:text-red-200">{error}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {verificationResult && (
                <div className="space-y-6">
                  <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <CardTitle className="text-green-800 dark:text-green-200">Credential Verified ✓</CardTitle>
                      </div>
                      <CardDescription className="text-green-700 dark:text-green-300">
                        This credential has been cryptographically verified on the Solana blockchain
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Credential Details */}
                    <div className="lg:col-span-2 space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5" />
                            {verificationResult.credential.title}
                          </CardTitle>
                          <CardDescription>{verificationResult.credential.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Research Area</p>
                              <p className="text-muted-foreground">{verificationResult.credential.researchArea}</p>
                            </div>
                            <div>
                              <p className="font-medium">Duration</p>
                              <p className="text-muted-foreground">{verificationResult.credential.duration}</p>
                            </div>
                          </div>
                          <div>
                            <p className="font-medium mb-2">Skills Demonstrated</p>
                            <div className="flex flex-wrap gap-1">
                              {verificationResult.credential.skills.map((skill: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="font-medium">Research Objectives</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {verificationResult.credential.objectives}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">Key Outcomes</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {verificationResult.credential.outcomes}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Student Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div>
                            <p className="font-medium">Name</p>
                            <p>{verificationResult.credential.student}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Issued: {verificationResult.credential.issueDate}</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Provider & Supervisor</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div>
                            <p className="font-medium">Provider</p>
                            <p>{verificationResult.credential.provider}</p>
                          </div>
                          <div>
                            <p className="font-medium">Academic Supervisor</p>
                            <p>{verificationResult.credential.supervisor}</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Blockchain Verification
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div>
                            <p className="font-medium">NFT Address</p>
                            <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                              {verificationResult.credential.nftAddress}
                            </code>
                          </div>
                          <div>
                            <p className="font-medium">Transaction ID</p>
                            <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                              {verificationResult.credential.blockchainTxId}
                            </code>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Verified {verificationResult.credential.verificationCount} times
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Solana Explorer
                    </Button>
                    <Button variant="outline">
                      <Shield className="h-4 w-4 mr-2" />
                      Download Certificate
                    </Button>
                    <Button variant="outline" onClick={() => navigator.clipboard.writeText(verificationUrl)}>
                      <Search className="h-4 w-4 mr-2" />
                      Copy Verification URL
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Information Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instant Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Credentials are verified instantly using blockchain technology, providing immediate trust and
                  authenticity.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cryptographic Proof</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Each credential is backed by cryptographic signatures from academic supervisors, ensuring
                  authenticity.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Immutable Records</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Stored on the Solana blockchain, credentials cannot be altered or forged, providing permanent
                  verification.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
