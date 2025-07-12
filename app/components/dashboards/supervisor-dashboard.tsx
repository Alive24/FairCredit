"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, Eye, FileText, Award } from "lucide-react"
import Link from "next/link"

export function SupervisorDashboard() {
  const stats = [
    { title: "Pending Endorsements", value: "4", icon: Clock, color: "text-yellow-600" },
    { title: "Endorsed This Month", value: "12", icon: CheckCircle, color: "text-green-600" },
    { title: "Total Endorsements", value: "89", icon: Award, color: "text-purple-600" },
    { title: "Active Programs", value: "6", icon: FileText, color: "text-blue-600" },
  ]

  const pendingEndorsements = [
    {
      id: "1",
      studentName: "Alex Johnson",
      credentialTitle: "Advanced Quantum Computing Research",
      provider: "Scholar Bridge Initiative (SBI)",
      submittedDate: "2024-01-20",
      priority: "high",
    },
    {
      id: "2",
      studentName: "Sarah Chen",
      credentialTitle: "Machine Learning in Healthcare",
      provider: "MedTech Research Institute",
      submittedDate: "2024-01-19",
      priority: "medium",
    },
    {
      id: "3",
      studentName: "Michael Roberts",
      credentialTitle: "Sustainable Energy Systems",
      provider: "Green Energy Consortium",
      submittedDate: "2024-01-18",
      priority: "low",
    },
  ]

  const recentEndorsements = [
    {
      id: "1",
      studentName: "Emma Thompson",
      credentialTitle: "Digital Innovation Workshop",
      provider: "Tech Skills Academy",
      endorsedDate: "2024-01-15",
      status: "completed",
    },
    {
      id: "2",
      studentName: "James Wilson",
      credentialTitle: "Data Science Fundamentals",
      provider: "Analytics Institute",
      endorsedDate: "2024-01-12",
      status: "completed",
    },
  ]

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">High Priority</Badge>
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Medium</Badge>
      case "low":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Low Priority</Badge>
      default:
        return <Badge variant="secondary">{priority}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Supervisor Dashboard</h1>
            <p className="text-muted-foreground">Review and endorse student academic achievements</p>
          </div>
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
          {/* Pending Endorsements */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Endorsements</CardTitle>
              <CardDescription>Student credentials awaiting your review and endorsement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingEndorsements.map((endorsement) => (
                  <div key={endorsement.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">{endorsement.studentName}</h3>
                        <p className="text-sm text-muted-foreground">{endorsement.credentialTitle}</p>
                        <p className="text-xs text-muted-foreground">Provider: {endorsement.provider}</p>
                        <p className="text-xs text-muted-foreground">Submitted: {endorsement.submittedDate}</p>
                      </div>
                      {getPriorityBadge(endorsement.priority)}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/supervisor-endorsement/${endorsement.id}`}>
                        <Button size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Quick Approve
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingEndorsements.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending endorsements</p>
                    <p className="text-sm">All caught up!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Endorsements</CardTitle>
              <CardDescription>Your recently completed endorsements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEndorsements.map((endorsement) => (
                  <div key={endorsement.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{endorsement.studentName}</h3>
                        <p className="text-sm text-muted-foreground">{endorsement.credentialTitle}</p>
                        <p className="text-xs text-muted-foreground">Provider: {endorsement.provider}</p>
                        <p className="text-xs text-muted-foreground">Endorsed: {endorsement.endorsedDate}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Completed
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full bg-transparent">
                  View All Endorsements
                </Button>
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
              <Link href="/supervisor-endorsement/demo">
                <Button className="w-full h-20 flex flex-col gap-2">
                  <Eye className="h-6 w-6" />
                  Review Endorsements
                </Button>
              </Link>
              <Link href="/supervisor-guide">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <FileText className="h-6 w-6" />
                  Supervisor Guide
                </Button>
              </Link>
              <Link href="/endorsement-history">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <Award className="h-6 w-6" />
                  Endorsement History
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
