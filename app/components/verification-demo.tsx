"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ExternalLink, Search, User, GraduationCap, Calendar, Loader2 } from "lucide-react"

export function VerificationDemo() {
  const [verificationUrl, setVerificationUrl] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)

  const handleVerification = async () => {
    setIsVerifying(true)
    setVerificationResult(null)

    setTimeout(() => {
      setVerificationResult({
        isValid: true,
        credential: {
          title: "Advanced Quantum Computing Research",
          student: "Alex Kingsley",
          provider: "Scholar Bridge Initiative (SBI)",
          supervisor: "Dr. Sarah Chen, Imperial College London",
          issueDate: "2024-01-15",
          skills: ["Quantum Algorithms", "Research Methodology", "Academic Writing"],
          verificationCount: 12,
        },
      })
      setIsVerifying(false)
    }, 2000)
  }

  const handleDemoClick = () => {
    setVerificationUrl("https://faircredit.app/verify/demo-credential-123")
    handleVerification()
  }

  return (
    <section id="verify" className="py-20 px-4 bg-muted/50">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Try It Now
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Verify Academic Credentials</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience instant credential verification. Enter a FairCredit URL or try our demo.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
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
                <Button onClick={handleVerification} disabled={isVerifying || !verificationUrl}>
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

              <Button
                variant="outline"
                onClick={handleDemoClick}
                className="w-full bg-transparent"
                disabled={isVerifying}
              >
                Try Demo Credential
              </Button>

              {verificationResult && (
                <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <CardTitle className="text-green-800 dark:text-green-200">Credential Verified</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{verificationResult.credential.title}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Student: {verificationResult.credential.student}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Issued: {verificationResult.credential.issueDate}</span>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Provider:</p>
                        <p className="text-sm text-muted-foreground">{verificationResult.credential.provider}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Academic Supervisor:</p>
                        <p className="text-sm text-muted-foreground">{verificationResult.credential.supervisor}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Skills Demonstrated:</p>
                        <div className="flex flex-wrap gap-1">
                          {verificationResult.credential.skills.map((skill: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Blockchain
                      </Button>
                      <Button variant="outline" size="sm">
                        Download Certificate
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Verified {verificationResult.credential.verificationCount} times
                    </p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
