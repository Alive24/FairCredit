"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, 
  FileText, 
  Award, 
  Shield, 
  Activity,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Loader2
} from "lucide-react"
import { useFairCredit } from "@/lib/solana/context"
import { useToast } from "@/hooks/use-toast"

export function HubDashboard() {
  const { client } = useFairCredit()
  const { toast } = useToast()
  const [hubData, setHubData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("providers")

  useEffect(() => {
    async function fetchHubData() {
      if (!client) {
        setLoading(false)
        return
      }

      try {
        const hub = await client.getHub()
        setHubData(hub)
      } catch (error) {
        console.error("Failed to fetch hub data:", error)
        toast({
          title: "Error",
          description: "Failed to fetch hub data. Please try again.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchHubData()
  }, [client, toast])

  const stats = [
    { 
      title: "Accepted Providers", 
      value: hubData?.acceptedProviders?.length || 0, 
      icon: Users, 
      color: "text-blue-600",
      description: "Educational organizations"
    },
    { 
      title: "Accepted Courses", 
      value: hubData?.acceptedCourses?.length || 0, 
      icon: FileText, 
      color: "text-green-600",
      description: "Available for credentials"
    },
    { 
      title: "Accepted Endorsers", 
      value: hubData?.acceptedEndorsers?.length || 0, 
      icon: Award, 
      color: "text-purple-600",
      description: "Academic supervisors"
    },
    { 
      title: "System Status", 
      value: "Active", 
      icon: Activity, 
      color: "text-yellow-600",
      description: "Hub operational"
    },
  ]

  const filterData = (data: any[], term: string) => {
    if (!term) return data
    return data.filter(item => 
      item.toLowerCase().includes(term.toLowerCase())
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Hub Management</h2>
          <p className="text-muted-foreground">
            Central control for FairCredit platform curation
          </p>
        </div>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Hub Settings
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hub Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Hub Configuration</CardTitle>
          <CardDescription>Current hub settings and requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Provider Requirements</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Minimum 2 endorsements required</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Auto-approval enabled</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Course Requirements</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Provider must be accepted</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Manual review required</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Management Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registry Management</CardTitle>
              <CardDescription>Manage accepted entities in the FairCredit ecosystem</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="providers">
                Providers ({hubData?.acceptedProviders?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="courses">
                Courses ({hubData?.acceptedCourses?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="endorsers">
                Endorsers ({hubData?.acceptedEndorsers?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="providers" className="space-y-4">
              <div className="space-y-2">
                {filterData(hubData?.acceptedProviders || [], searchTerm).map((provider, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Provider #{index + 1}</p>
                        <p className="text-xs text-muted-foreground">{provider.toString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Active</Badge>
                      <Button variant="ghost" size="sm">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!hubData?.acceptedProviders || hubData.acceptedProviders.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No accepted providers yet
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="courses" className="space-y-4">
              <div className="space-y-2">
                {filterData(hubData?.acceptedCourses || [], searchTerm).map((course, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Course ID</p>
                        <p className="text-xs text-muted-foreground">{course.toString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Active</Badge>
                      <Button variant="ghost" size="sm">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!hubData?.acceptedCourses || hubData.acceptedCourses.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No accepted courses yet
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="endorsers" className="space-y-4">
              <div className="space-y-2">
                {filterData(hubData?.acceptedEndorsers || [], searchTerm).map((endorser, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <Award className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Endorser #{index + 1}</p>
                        <p className="text-xs text-muted-foreground">{endorser.toString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Verified</Badge>
                      <Button variant="ghost" size="sm">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!hubData?.acceptedEndorsers || hubData.acceptedEndorsers.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No accepted endorsers yet
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions in the hub</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Plus className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">New provider added</p>
                <p className="text-xs text-muted-foreground">Scholar Bridge Initiative joined • 2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Course approved</p>
                <p className="text-xs text-muted-foreground">Advanced Quantum Computing Research • 5 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Award className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">New endorser verified</p>
                <p className="text-xs text-muted-foreground">Dr. Sarah Chen added as endorser • 1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}