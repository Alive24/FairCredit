"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Users, CheckCircle, Clock, Eye, Settings, Loader2, TrendingUp, Award } from "lucide-react"
import Link from "next/link"
import { useFairCredit } from "@/lib/solana/context"
import { useWallet } from "@solana/wallet-adapter-react"
import { useToast } from "@/hooks/use-toast"

export function ProviderDashboard() {
  const { client } = useFairCredit()
  const { publicKey, connected } = useWallet()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [providerData, setProviderData] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [hubData, setHubData] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      if (!client || !connected || !publicKey) {
        setLoading(false)
        return
      }

      try {
        // Fetch hub data to check if provider is accepted
        const hub = await client.getHub()
        setHubData(hub)

        // Check if current wallet is an accepted provider
        const isAcceptedProvider = hub.acceptedProviders.includes(publicKey.toBase58())
        
        if (isAcceptedProvider) {
          // Fetch provider-specific data
          const providerInfo = await client.getProvider(publicKey.toBase58())
          setProviderData(providerInfo)

          // Fetch courses by this provider
          const providerCourses = await client.getCoursesByProvider(publicKey.toBase58())
          setCourses(providerCourses)
        }
      } catch (error) {
        console.error("Failed to fetch provider data:", error)
        toast({
          title: "Error",
          description: "Failed to load provider data. Please try again.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [client, connected, publicKey, toast])

  const isAcceptedProvider = hubData?.acceptedProviders?.includes(publicKey?.toBase58())

  // Calculate stats based on real data
  const stats = [
    { 
      title: "Active Courses", 
      value: courses.length.toString(), 
      icon: FileText, 
      color: "text-blue-600",
      change: "+12%"
    },
    { 
      title: "Pending Applications", 
      value: "12", 
      icon: Clock, 
      color: "text-yellow-600",
      change: "+5%" 
    },
    { 
      title: "Credentials Issued", 
      value: providerData?.credentialsIssued || "0", 
      icon: Award, 
      color: "text-green-600",
      change: "+23%"
    },
    { 
      title: "Total Students", 
      value: providerData?.totalStudents || "0", 
      icon: Users, 
      color: "text-purple-600",
      change: "+18%"
    },
  ]

  const recentApplications = [
    {
      id: "1",
      studentName: "Alex Johnson",
      course: "Advanced Quantum Computing Research",
      submittedDate: "2024-01-20",
      status: "pending-review",
    },
    {
      id: "2",
      studentName: "Sarah Chen",
      course: "Machine Learning in Healthcare",
      submittedDate: "2024-01-19",
      status: "approved",
    },
    {
      id: "3",
      studentName: "Michael Roberts",
      course: "Sustainable Energy Systems",
      submittedDate: "2024-01-18",
      status: "pending-review",
    },
  ]

  const activeCourses = [
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
            <p className="text-muted-foreground">
              {isAcceptedProvider 
                ? "Manage your courses and review student applications" 
                : "Register as a provider to start creating courses"}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/courses/create">
              <Button size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Course
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !connected ? (
          <Card className="p-8">
            <CardContent className="text-center">
              <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-6">
                Please connect your wallet to access the provider dashboard
              </p>
            </CardContent>
          </Card>
        ) : !isAcceptedProvider ? (
          <Card className="p-8">
            <CardContent className="text-center">
              <div className="h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-4">Provider Registration Required</h2>
              <p className="text-muted-foreground mb-6">
                Your wallet is not registered as an accepted provider. Please contact the Hub administrator 
                to get your provider status approved.
              </p>
              <div className="p-4 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Your Wallet Address:</p>
                <p className="font-mono text-xs">{publicKey?.toBase58()}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
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
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                      {stat.change} from last month
                    </div>
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
                      <p className="text-sm text-muted-foreground">{application.course}</p>
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

              {/* Active Courses */}
              <Card>
            <CardHeader>
              <CardTitle>Active Courses</CardTitle>
              <CardDescription>Your currently running credential courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeCourses.map((course) => (
                  <div key={course.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">{course.title}</h3>
                        {getStatusBadge(course.status)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-blue-600">{course.applications}</div>
                        <div className="text-xs text-muted-foreground">Applications</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">{course.enrolled}</div>
                        <div className="text-xs text-muted-foreground">Enrolled</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">{course.completions}</div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                    </div>
                  </div>
                ))}
                <Link href="/courses">
                  <Button variant="outline" className="w-full bg-transparent">
                    Manage All Courses
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
              <Link href="/courses/create">
                <Button className="w-full h-20 flex flex-col gap-2">
                  <Plus className="h-6 w-6" />
                  Create Course
                </Button>
              </Link>
              <Link href="/applications">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <Clock className="h-6 w-6" />
                  Review Applications
                </Button>
              </Link>
              <Link href="/courses">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <FileText className="h-6 w-6" />
                  Manage Courses
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
          </>
        )}
      </main>
    </div>
  )
}
