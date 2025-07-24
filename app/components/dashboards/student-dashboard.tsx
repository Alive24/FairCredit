"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, FileText, Clock, CheckCircle, Search, Eye, Share } from "lucide-react"
import Link from "next/link"

export function StudentDashboard() {
  const stats = [
    { title: "Applications Submitted", value: "5", icon: FileText, color: "text-blue-600" },
    { title: "Under Review", value: "2", icon: Clock, color: "text-yellow-600" },
    { title: "Credentials Earned", value: "3", icon: CheckCircle, color: "text-green-600" },
    { title: "Total Verifications", value: "47", icon: Eye, color: "text-purple-600" },
  ]

  const applications = [
    {
      id: "1",
      course: "Advanced Quantum Computing Research",
      provider: "Scholar Bridge Initiative (SBI)",
      status: "under-review",
      submittedDate: "2024-01-20",
      progress: 60,
      nextStep: "Provider reviewing application",
    },
    {
      id: "2",
      course: "Machine Learning in Healthcare",
      provider: "MedTech Research Institute",
      status: "supervisor-review",
      submittedDate: "2024-01-15",
      progress: 80,
      nextStep: "Awaiting supervisor endorsement",
    },
    {
      id: "3",
      course: "Digital Innovation Workshop",
      provider: "Tech Skills Academy",
      status: "completed",
      submittedDate: "2023-12-10",
      progress: 100,
      nextStep: "Credential issued",
    },
  ]

  const recentCredentials = [
    {
      id: "1",
      title: "Machine Learning in Healthcare",
      provider: "MedTech Research Institute",
      issueDate: "2024-01-10",
      verifications: 12,
      verificationUrl: "https://faircredit.app/verify/ml-healthcare-456",
    },
    {
      id: "2",
      title: "Digital Innovation Workshop",
      provider: "Tech Skills Academy",
      issueDate: "2023-12-15",
      verifications: 8,
      verificationUrl: "https://faircredit.app/verify/digital-innovation-789",
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "under-review":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Under Review</Badge>
        )
      case "supervisor-review":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Supervisor Review</Badge>
        )
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Student Dashboard</h1>
            <p className="text-muted-foreground">Track your applications and manage your credentials</p>
          </div>
          <Link href="/apply">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Apply to Course
            </Button>
          </Link>
        </div>

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
          {/* Application Status */}
          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
              <CardDescription>Track the progress of your credential applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {applications.map((application) => (
                  <div key={application.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">{application.course}</h3>
                        <p className="text-sm text-muted-foreground">{application.provider}</p>
                        <p className="text-xs text-muted-foreground">Submitted: {application.submittedDate}</p>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{application.progress}%</span>
                      </div>
                      <Progress value={application.progress} className="h-2" />
                      <p className="text-sm text-muted-foreground">{application.nextStep}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Credentials */}
          <Card>
            <CardHeader>
              <CardTitle>My Credentials</CardTitle>
              <CardDescription>Your verified academic credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCredentials.map((credential) => (
                  <div key={credential.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{credential.title}</h3>
                        <p className="text-sm text-muted-foreground">{credential.provider}</p>
                        <p className="text-xs text-muted-foreground">Issued: {credential.issueDate}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Verified
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Verified {credential.verifications} times</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <Share className="h-3 w-3 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Link href="/credentials">
                  <Button variant="outline" className="w-full bg-transparent">
                    View All Credentials
                  </Button>
                </Link>
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
              <Link href="/apply">
                <Button className="w-full h-20 flex flex-col gap-2">
                  <Plus className="h-6 w-6" />
                  Apply to New Course
                </Button>
              </Link>
              <Link href="/courses">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <Search className="h-6 w-6" />
                  Browse Courses
                </Button>
              </Link>
              <Link href="/credentials">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <FileText className="h-6 w-6" />
                  Manage Credentials
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
