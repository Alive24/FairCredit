"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExternalLink, Search, Download, Share, Eye } from "lucide-react"
import Link from "next/link"

export default function MyCredentials() {
  const credentials = [
    {
      id: "1",
      title: "Advanced Quantum Computing Research",
      provider: "Scholar Bridge Initiative (SBI)",
      supervisor: "Dr. Sarah Chen",
      status: "verified",
      date: "2024-01-15",
      verificationUrl: "https://faircredit.app/verify/qc-research-123",
      verificationCount: 12,
      skills: ["Quantum Algorithms", "Research Methodology", "Academic Writing"],
    },
    {
      id: "2",
      title: "Machine Learning in Healthcare",
      provider: "MedTech Research Institute",
      supervisor: "Prof. Michael Roberts",
      status: "verified",
      date: "2023-12-10",
      verificationUrl: "https://faircredit.app/verify/ml-healthcare-456",
      verificationCount: 8,
      skills: ["Machine Learning", "Healthcare Analytics", "Python"],
    },
    {
      id: "3",
      title: "Sustainable Energy Systems",
      provider: "Green Energy Consortium",
      supervisor: "Dr. Lisa Anderson",
      status: "pending",
      date: "2024-01-13",
      verificationUrl: null,
      verificationCount: 0,
      skills: ["Renewable Energy", "Systems Analysis", "Sustainability"],
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Verified</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">Draft</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Credentials</h1>
            <p className="text-muted-foreground">Manage and share your verified academic achievements</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input placeholder="Search credentials..." className="w-full" icon={<Search className="h-4 w-4" />} />
              </div>
              <Select>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="title">Title A-Z</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Credentials Grid */}
        <div className="grid gap-6">
          {credentials.map((credential) => (
            <Card key={credential.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{credential.title}</CardTitle>
                    <CardDescription className="space-y-1">
                      <p>Provider: {credential.provider}</p>
                      <p>Supervisor: {credential.supervisor}</p>
                      <p>Issued: {credential.date}</p>
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(credential.status)}
                    {credential.status === "verified" && (
                      <p className="text-xs text-muted-foreground">Verified {credential.verificationCount} times</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Skills Demonstrated:</p>
                    <div className="flex flex-wrap gap-1">
                      {credential.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {credential.status === "verified" && credential.verificationUrl && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Verification URL:</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-background px-2 py-1 rounded flex-1 truncate">
                          {credential.verificationUrl}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(credential.verificationUrl!)}
                        >
                          <Share className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {credential.status === "verified" && credential.verificationUrl && (
                      <>
                        <Link href={`/verify?url=${encodeURIComponent(credential.verificationUrl)}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            View Public Page
                          </Button>
                        </Link>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on Blockchain
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Download Certificate
                        </Button>
                      </>
                    )}
                    {credential.status === "pending" && (
                      <Badge variant="outline" className="text-xs">
                        Awaiting supervisor endorsement
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {credentials.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No Credentials Found</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any credentials yet. Contact your educational provider to get started.
              </p>
              <Link href="/">
                <Button>Learn More</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
