"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Users, CheckCircle, Clock, Eye, Settings } from "lucide-react"
import Link from "next/link"

export function ProviderDashboard() {
  const stats = [
    { title: "Active Programs", value: "8", icon: FileText, color: "text-blue-600" },
    { title: "Pending Applications", value: "12", icon: Clock, color: "text-yellow-600" },
    { title: "Credentials Issued", value: "156", icon: CheckCircle, color: "text-green-600" },
    { title: "Total Students", value: "89", icon: Users, color: "text-purple-600" },
  ]

  const recentApplications = [
    {
      id: "1",
      studentName: "Alex Johnson",
      program: "Advanced Quantum Computing Research",
      submittedDate: "2024-01-20",
      status: "pending-review",
    },
    {
      id: "2",
      studentName: "Sarah Chen",
      program: "Machine Learning in Healthcare",
      submittedDate: "2024-01-19",
      status: "approved",
    },
    {
      id: "3",
      studentName: "Michael Roberts",
      program: "Sustainable Energy Systems",
      submittedDate: "2024-01-18",
      status: "pending-review",
    },
  ]

  const activePrograms = [
    {
      id: "1",
      title: "Advanced Quantum Computing Research",
      applications: 8,
      enrolled: 5,
      completions: 2,
      status: "active",
    },
    {
      id: "2",
      title: "Machine Learning in Healthcare",
      applications: 12,
      enrolled: 8,
      completions: 4,
      status: "active",
    },
    {
      id: "3",
      title: "Digital Innovation Workshop",
      applications: 6,
      enrolled: 4,
      completions: 3,
      status: "active",
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending-review":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Pending Review
          </Badge>
        )
      case "approved":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Approved</Badge>
      case "active":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Active</Badge>
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
            <h1 className="text-3xl font-bold">Provider Dashboard</h1>
            <p className="text-muted-foreground">Manage your programs and review student applications</p>
          </div>
          <div className="flex gap-3">
            <Link href="/programs/create">
              <Button size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Program
              </Button>
            </Link>
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
          {/* Recent Applications */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
              <CardDescription>Latest student applications requiring review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentApplications.map((application) => (
                  <div key={application.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold">{application.studentName}</h3>
                      <p className="text-sm text-muted-foreground">{application.program}</p>
                      <p className="text-xs text-muted-foreground">Submitted: {application.submittedDate}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(application.status)}
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
                <Link href="/applications">
                  <Button variant="outline" className="w-full bg-transparent">
                    View All Applications
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Active Programs */}
          <Card>
            <CardHeader>
              <CardTitle>Active Programs</CardTitle>
              <CardDescription>Your currently running credential programs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activePrograms.map((program) => (
                  <div key={program.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">{program.title}</h3>
                        {getStatusBadge(program.status)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-blue-600">{program.applications}</div>
                        <div className="text-xs text-muted-foreground">Applications</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">{program.enrolled}</div>
                        <div className="text-xs text-muted-foreground">Enrolled</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">{program.completions}</div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                    </div>
                  </div>
                ))}
                <Link href="/programs">
                  <Button variant="outline" className="w-full bg-transparent">
                    Manage All Programs
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link href="/programs/create">
                <Button className="w-full h-20 flex flex-col gap-2">
                  <Plus className="h-6 w-6" />
                  Create Program
                </Button>
              </Link>
              <Link href="/applications">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <Clock className="h-6 w-6" />
                  Review Applications
                </Button>
              </Link>
              <Link href="/programs">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <FileText className="h-6 w-6" />
                  Manage Programs
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <Settings className="h-6 w-6" />
                  Analytics
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
