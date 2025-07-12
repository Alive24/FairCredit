import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Users, GraduationCap, UserCheck, Search } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        {/* Main Hero Content */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Built on Solana Blockchain
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Academic Credentials
            <br />
            Made Verifiable
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            From student application to instant verification - FairCredit provides blockchain-backed academic
            credentials that can be trusted by universities and employers worldwide.
          </p>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/apply">
              <Button size="lg" className="text-lg px-8">
                Apply for Credential
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/verify">
              <Button variant="outline" size="lg" className="text-lg px-8 bg-transparent">
                Verify Credential
              </Button>
            </Link>
          </div>
        </div>

        {/* Role-Based Navigation */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Choose Your Role</h2>
            <p className="text-muted-foreground">
              Select your role to access the tools and workflows designed specifically for you
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Student Card */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 rounded-full bg-green-100 dark:bg-green-900">
                  <GraduationCap className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-xl text-green-800 dark:text-green-200">I'm a Student</CardTitle>
                <CardDescription className="text-green-700 dark:text-green-300">
                  Apply for academic credentials and manage your achievements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span>Submit credential applications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span>Track application status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span>Share verified credentials</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link href="/apply" className="block">
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      Apply for Credential
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/credentials" className="block">
                    <Button
                      variant="outline"
                      className="w-full bg-transparent border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                    >
                      View My Credentials
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Provider Card */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 rounded-full bg-blue-100 dark:bg-blue-900">
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl text-blue-800 dark:text-blue-200">I'm a Provider</CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-300">
                  Educational organization designing programs and issuing credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Design credential programs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Review student applications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Send for supervisor endorsement</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link href="/programs" className="block">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Manage Programs
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/dashboard" className="block">
                    <Button
                      variant="outline"
                      className="w-full bg-transparent border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                    >
                      Provider Dashboard
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Supervisor Card */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 rounded-full bg-purple-100 dark:bg-purple-900">
                  <UserCheck className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-xl text-purple-800 dark:text-purple-200">I'm a Supervisor</CardTitle>
                <CardDescription className="text-purple-700 dark:text-purple-300">
                  Academic supervisor endorsing student achievements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span>Review provider-approved work</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span>Provide cryptographic endorsement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span>Validate academic achievements</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link href="/supervisor-endorsement/demo" className="block">
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      Try Demo Review
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/supervisor-guide" className="block">
                    <Button
                      variant="outline"
                      className="w-full bg-transparent border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950"
                    >
                      Supervisor Guide
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Verifier Card */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 rounded-full bg-orange-100 dark:bg-orange-900">
                  <Search className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-xl text-orange-800 dark:text-orange-200">I'm a Verifier</CardTitle>
                <CardDescription className="text-orange-700 dark:text-orange-300">
                  Employer or admissions officer verifying credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    <span>Instant credential verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    <span>View blockchain proof</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    <span>Access complete credential details</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link href="/verify" className="block">
                    <Button className="w-full bg-orange-600 hover:bg-orange-700">
                      Verify Credential
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/verify?demo=true" className="block">
                    <Button
                      variant="outline"
                      className="w-full bg-transparent border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                    >
                      Try Demo Verification
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
