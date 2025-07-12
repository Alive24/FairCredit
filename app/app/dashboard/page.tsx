"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { StudentDashboard } from "@/components/dashboards/student-dashboard"
import { ProviderDashboard } from "@/components/dashboards/provider-dashboard"
import { SupervisorDashboard } from "@/components/dashboards/supervisor-dashboard"
import { VerifierDashboard } from "@/components/dashboards/verifier-dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, GraduationCap, UserCheck, Search } from "lucide-react"

export default function Dashboard() {
  const [userRole, setUserRole] = useState<"student" | "provider" | "supervisor" | "verifier" | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Simulate checking wallet connection and user role
    // In real app, this would check actual wallet connection and stored role
    const checkConnection = () => {
      const connected = true // Simulate connected wallet
      setIsConnected(connected)
      if (connected) {
        // For demo, we'll let user select role if not set
        const storedRole = localStorage.getItem("userRole") as any
        setUserRole(storedRole)
      }
    }
    checkConnection()
  }, [])

  const selectRole = (role: "student" | "provider" | "supervisor" | "verifier") => {
    setUserRole(role)
    localStorage.setItem("userRole", role)
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardContent className="pt-8">
                <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
                <p className="text-muted-foreground mb-6">Please connect your wallet to access your dashboard.</p>
                <Button onClick={() => setIsConnected(true)}>Connect Wallet</Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  if (!userRole) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4">Select Your Role</h1>
              <p className="text-muted-foreground">Choose your role to access the appropriate dashboard and tools</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card
                className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800"
                onClick={() => selectRole("student")}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-4 rounded-full bg-green-100 dark:bg-green-900">
                    <GraduationCap className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-xl text-green-800 dark:text-green-200">Student</CardTitle>
                  <CardDescription className="text-green-700 dark:text-green-300">
                    Apply for academic credentials and track your applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span>Submit applications to programs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span>Track application status</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span>Manage verified credentials</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800"
                onClick={() => selectRole("provider")}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-4 rounded-full bg-blue-100 dark:bg-blue-900">
                    <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-xl text-blue-800 dark:text-blue-200">Educational Provider</CardTitle>
                  <CardDescription className="text-blue-700 dark:text-blue-300">
                    Design programs and review student applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span>Create credential programs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span>Review student applications</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span>Send for supervisor endorsement</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800"
                onClick={() => selectRole("supervisor")}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-4 rounded-full bg-purple-100 dark:bg-purple-900">
                    <UserCheck className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-xl text-purple-800 dark:text-purple-200">Academic Supervisor</CardTitle>
                  <CardDescription className="text-purple-700 dark:text-purple-300">
                    Review and endorse student academic work
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      <span>Review endorsement requests</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      <span>Provide cryptographic signatures</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      <span>Track endorsed credentials</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800"
                onClick={() => selectRole("verifier")}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-4 rounded-full bg-orange-100 dark:bg-orange-900">
                    <Search className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle className="text-xl text-orange-800 dark:text-orange-200">Verifier</CardTitle>
                  <CardDescription className="text-orange-700 dark:text-orange-300">
                    Verify academic credentials for hiring or admissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                      <span>Instant credential verification</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                      <span>View blockchain proof</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                      <span>Track verification history</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Render role-specific dashboard
  switch (userRole) {
    case "student":
      return <StudentDashboard />
    case "provider":
      return <ProviderDashboard />
    case "supervisor":
      return <SupervisorDashboard />
    case "verifier":
      return <VerifierDashboard />
    default:
      return null
  }
}
