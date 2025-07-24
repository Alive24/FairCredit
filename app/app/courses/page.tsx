"use client"

import { Header } from "@/components/header"
import { CourseList } from "@/components/courses/course-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFairCredit } from "@/lib/solana/context"
import { useEffect, useState } from "react"
import { FileText, Users, Award, Loader2 } from "lucide-react"

export default function ProgramsPage() {
  const { client } = useFairCredit()
  const [hubData, setHubData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
      } finally {
        setLoading(false)
      }
    }

    fetchHubData()
  }, [client])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">FairCredit Courses</h1>
          <p className="text-muted-foreground">
            Browse available courses from accepted providers on the FairCredit platform
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted Courses</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-2xl font-bold">
                  {hubData?.acceptedCourses?.length || 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Curated by Hub</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted Providers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-2xl font-bold">
                  {hubData?.acceptedProviders?.length || 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Verified educators</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted Endorsers</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-2xl font-bold">
                  {hubData?.acceptedEndorsers?.length || 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Qualified mentors</p>
            </CardContent>
          </Card>
        </div>

        {/* Course List */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Available Courses</h2>
          <CourseList />
        </div>
      </main>
    </div>
  )
}