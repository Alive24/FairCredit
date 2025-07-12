"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle, X, Shield, User, GraduationCap, Calendar, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SupervisorEndorsement({ params }: { params: { id: string } }) {
  const { toast } = useToast()
  const [isConnected, setIsConnected] = useState(false)
  const [endorsementNotes, setEndorsementNotes] = useState("")
  const [isEndorsing, setIsEndorsing] = useState(false)
  const [isEndorsed, setIsEndorsed] = useState(false)

  // Mock credential data
  const credential = {
    id: params.id,
    title: "Advanced Quantum Computing Research",
    student: {
      name: "Alex Kingsley",
      email: "alex.kingsley@email.com",
      wallet: "7xKXtg2CW9to3QyvkstNQtUTdLBqkF9vamLhTukF9mNp",
    },
    provider: "Scholar Bridge Initiative (SBI)",
    description:
      "A comprehensive research project exploring quantum algorithms and their applications in cryptography and optimization problems.",
    researchArea: "Quantum Computing, Cryptography",
    duration: "6 months",
    skills: ["Quantum Algorithms", "Research Methodology", "Academic Writing", "Data Analysis"],
    objectives: "To develop and analyze novel quantum algorithms for solving complex optimization problems.",
    methodology: "Theoretical analysis combined with quantum circuit simulation using Qiskit framework.",
    outcomes:
      "Successfully developed three new quantum algorithms with improved efficiency over classical counterparts.",
    createdDate: "2024-01-15",
  }

  const connectWallet = () => {
    setIsConnected(true)
    toast({
      title: "Wallet Connected",
      description: "You can now review and endorse this credential.",
    })
  }

  const handleEndorse = async () => {
    setIsEndorsing(true)

    // Simulate blockchain endorsement
    setTimeout(() => {
      setIsEndorsing(false)
      setIsEndorsed(true)
      toast({
        title: "Credential Endorsed Successfully!",
        description: "The NFT credential will be minted to the student's wallet.",
      })
    }, 3000)
  }

  const handleReject = () => {
    toast({
      title: "Credential Rejected",
      description: "The provider has been notified of your decision.",
      variant: "destructive",
    })
  }

  if (isEndorsed) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardContent className="pt-8">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-4">Credential Endorsed Successfully!</h1>
                <p className="text-muted-foreground mb-6">
                  Your cryptographic signature has been recorded on the blockchain. The NFT credential will be
                  automatically minted to the student's wallet.
                </p>
                <div className="p-4 bg-muted rounded-lg mb-6">
                  <h3 className="font-semibold mb-2">What happens next:</h3>
                  <ul className="text-sm text-left space-y-1">
                    <li>• Smart contract mints NFT credential to student wallet</li>
                    <li>• Student receives notification of successful credential creation</li>
                    <li>• Credential becomes instantly verifiable via public URL</li>
                    <li>• All parties receive confirmation of completion</li>
                  </ul>
                </div>
                <Button onClick={() => window.close()}>Close Window</Button>
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Academic Supervisor Endorsement</h1>
            <p className="text-muted-foreground">
              Please review the academic credential details and provide your endorsement
            </p>
          </div>

          {!isConnected && (
            <Card className="mb-8 border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Shield className="h-8 w-8 text-yellow-600" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Wallet Connection Required</h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Connect your wallet to provide cryptographic endorsement for this credential.
                    </p>
                  </div>
                  <Button onClick={connectWallet}>Connect Wallet</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Credential Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Credential Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{credential.title}</h3>
                    <p className="text-muted-foreground">{credential.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="font-medium">Research Area</Label>
                      <p>{credential.researchArea}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Duration</Label>
                      <p>{credential.duration}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium">Skills Demonstrated</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {credential.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Research Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="font-medium">Research Objectives</Label>
                    <p className="text-sm text-muted-foreground mt-1">{credential.objectives}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Methodology</Label>
                    <p className="text-sm text-muted-foreground mt-1">{credential.methodology}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Key Outcomes</Label>
                    <p className="text-sm text-muted-foreground mt-1">{credential.outcomes}</p>
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
                    <Label className="font-medium">Name</Label>
                    <p>{credential.student.name}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Email</Label>
                    <p>{credential.student.email}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Wallet Address</Label>
                    <p className="font-mono text-xs break-all">{credential.student.wallet}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Provider Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <Label className="font-medium">Organization</Label>
                    <p>{credential.provider}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {credential.createdDate}</span>
                  </div>
                </CardContent>
              </Card>

              {isConnected && (
                <Card>
                  <CardHeader>
                    <CardTitle>Endorsement</CardTitle>
                    <CardDescription>Provide your endorsement for this academic credential</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Endorsement Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={endorsementNotes}
                        onChange={(e) => setEndorsementNotes(e.target.value)}
                        placeholder="Additional comments about the student's work..."
                        rows={3}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button onClick={handleEndorse} disabled={isEndorsing} className="w-full">
                        {isEndorsing ? (
                          <>
                            <Shield className="h-4 w-4 mr-2 animate-spin" />
                            Endorsing on Blockchain...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Endorse Credential
                          </>
                        )}
                      </Button>
                      <Button variant="destructive" onClick={handleReject} className="w-full">
                        <X className="h-4 w-4 mr-2" />
                        Reject Credential
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
