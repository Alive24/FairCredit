"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Eye, CheckCircle, Clock, FileText, TrendingUp } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export function VerifierDashboard() {
  const [verificationUrl, setVerificationUrl] = useState("")

  const stats = [
    { title: "Verifications Today", value: "23", icon: CheckCircle, color: "text-green-600" },
    { title: "This Month", value: "156", icon: TrendingUp, color: "text-blue-600" },
    { title: "Total Verified", value: "1,247", icon: Eye, color: "text-purple-600" },
    { title: "Unique Credentials", value: "89", icon: FileText, color: "text-orange-600" },
  ]

  const recentVerifications = [
    {
      id: "1",
      studentName: "Alex Johnson",
      credentialTitle: "Advanced Quantum Computing Research",
      provider: "Scholar Bridge Initiative (SBI)",
      verifiedDate: "2024-01-20",
      status: "verified",
      verificationId: "qc-research-123",
    },
    {
      id: "2",
      studentName: "Sarah Chen",
      credentialTitle: "Machine Learning in Healthcare",
      provider: "MedTech Research Institute",
      verifiedDate: "2024-01-20",
      status: "verified",
      verificationId: "ml-healthcare-456",
    },
    {
      id: "3",
      studentName: "Michael Roberts",
      credentialTitle: "Digital Innovation Workshop",
      provider: "Tech Skills Academy",
      verifiedDate: "2024-01-19",
      status: "verified",
      verificationId: "digital-innovation-789",
    },
  ]

  const popularCredentials = [
    {
      title: "Machine Learning in Healthcare",
      provider: "MedTech Research Institute",
      verifications: 45,
      trend: "+12%",
    },
    {
      title: "Advanced Quantum Computing Research",
      provider: "Scholar Bridge Initiative (SBI)",
      verifications: 38,
      trend: "+8%",
    },
    {
      title: "Digital Innovation Workshop",
      provider: "Tech Skills Academy",
      verifications: 32,
      trend: "+15%",
    },
  ]

  const handleQuickVerify = () => {
    if (verificationUrl) {
      window.open(`/verify?url=${encodeURIComponent(verificationUrl)}`, "_blank")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Verifier Dashboard</h1>
            <p className="text-muted-foreground">Verify academic credentials and track verification history</p>
          </div>
        </div>

        {/* Quick Verification */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Quick Verification
            </CardTitle>
            <CardDescription>Enter a FairCredit verification URL to instantly verify a credential</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="https://faircredit.app/verify/..."
                value={verificationUrl}
                onChange={(e) => setVerificationUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleQuickVerify} disabled={!verificationUrl}>
                <Search className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setVerificationUrl("https://faircredit.app/verify/demo-credential-123")
                  handleQuickVerify()
                }}
              >
                Try Demo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setVerificationUrl("https://faircredit.app/verify/ml-healthcare-456")
                  handleQuickVerify()
                }}
              >
                Try ML Demo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Verifications */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Verifications</CardTitle>
              <CardDescription>Your latest credential verification activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentVerifications.map((verification) => (
                  <div key={verification.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{verification.studentName}</h3>
                        <p className="text-sm text-muted-foreground">{verification.credentialTitle}</p>
                        <p className="text-xs text-muted-foreground">Provider: {verification.provider}</p>
                        <p className="text-xs text-muted-foreground">Verified: {verification.verifiedDate}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Verified ✓
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/verify?url=https://faircredit.app/verify/${verification.verificationId}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full bg-transparent">
                  View All Verifications
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Popular Credentials */}
          <Card>
            <CardHeader>
              <CardTitle>Popular Credentials</CardTitle>
              <CardDescription>Most frequently verified credentials this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {popularCredentials.map((credential, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{credential.title}</h3>
                        <p className="text-sm text-muted-foreground">{credential.provider}</p>
                      </div>
                      <Badge variant="outline" className="text-green-600">
                        {credential.trend}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{credential.verifications} verifications</span>
                      <div className="text-lg font-bold text-blue-600">#{index + 1}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/verify">
                <Button className="w-full h-20 flex flex-col gap-2">
                  <Search className="h-6 w-6" />
                  Verify Credential
                </Button>
              </Link>
              <Link href="/verification-history">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <Clock className="h-6 w-6" />
                  Verification History
                </Button>
              </Link>
              <Link href="/verification-guide">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <FileText className="h-6 w-6" />
                  Verification Guide
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
