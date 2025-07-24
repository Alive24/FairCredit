"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  GraduationCap,
  UserCheck,
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  Send,
  CheckCircle,
  Eye,
  ClipboardCheck,
} from "lucide-react"
import Link from "next/link"

export function RoleSlideshowSection() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const roles = [
    {
      title: "Students",
      subtitle: "Apply for Academic Credentials",
      shortDesc: "Apply for credentials",
      icon: GraduationCap,
      description:
        "Students apply to educational providers for academic credential verification. Submit your work, track applications, and receive blockchain-verified credentials.",
      color:
        "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800",
      iconColor: "text-green-600 dark:text-green-400",
      workflow: [
        {
          icon: Send,
          title: "Submit Application",
          description: "Apply to educational providers with your academic work and achievements",
        },
        {
          icon: Eye,
          title: "Track Application",
          description: "Monitor your application status through the provider review process",
        },
        {
          icon: CheckCircle,
          title: "Receive Credential",
          description: "Get blockchain-verified NFT credential minted to your wallet upon approval",
        },
        {
          icon: FileText,
          title: "Share & Showcase",
          description: "Generate verification URLs and share achievements with employers",
        },
      ],
      link: "/apply",
      linkText: "Apply for Credential",
      stats: { students: "1000+", applications: "2000+", verifications: "15000+" },
    },
    {
      title: "Educational Providers",
      subtitle: "Design Courses & Review Applications",
      shortDesc: "Design courses & review",
      icon: Users,
      description:
        "Educational providers first design credential courses, then review student applications for those courses, verify academic work quality, and forward approved applications to supervisors for endorsement.",
      color:
        "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800",
      iconColor: "text-blue-600 dark:text-blue-400",
      workflow: [
        {
          icon: FileText,
          title: "Design Courses",
          description: "Create credential courses with requirements and learning outcomes for students to apply to",
        },
        {
          icon: Send,
          title: "Receive Applications",
          description: "Students discover and apply to your published credential courses",
        },
        {
          icon: ClipboardCheck,
          title: "Review & Verify Work",
          description: "Evaluate student submissions against course requirements and verify academic achievements",
        },
        {
          icon: UserCheck,
          title: "Send for Endorsement",
          description: "Forward approved applications to academic supervisors for final validation",
        },
      ],
      link: "/courses",
      linkText: "Manage Courses",
      stats: { courses: "150+", applications: "500+", providers: "50+" },
    },
    {
      title: "Academic Supervisors",
      subtitle: "Endorse Provider-Approved Work",
      shortDesc: "Endorse work",
      icon: UserCheck,
      description:
        "Academic supervisors review provider-approved student work and provide cryptographic endorsements to validate credentials for blockchain minting.",
      color:
        "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800",
      iconColor: "text-purple-600 dark:text-purple-400",
      workflow: [
        {
          icon: Send,
          title: "Receive Review Request",
          description: "Get secure email link from educational provider for approved applications",
        },
        {
          icon: FileText,
          title: "Review Approved Work",
          description: "Examine provider-verified student work and academic achievements",
        },
        {
          icon: CheckCircle,
          title: "Connect Wallet",
          description: "Authenticate with wallet for cryptographic signature",
        },
        {
          icon: UserCheck,
          title: "Endorse or Reject",
          description: "Provide blockchain signature to validate or reject credentials",
        },
      ],
      link: "/supervisor-endorsement/demo",
      linkText: "Try Demo Review",
      stats: { supervisors: "200+", endorsements: "800+", institutions: "30+" },
    },
    {
      title: "Verifiers",
      subtitle: "Instant Credential Verification",
      shortDesc: "Verify credentials",
      icon: Search,
      description:
        "Employers and admissions officers can instantly verify the authenticity of issued student credentials using blockchain-backed proof.",
      color:
        "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800",
      iconColor: "text-orange-600 dark:text-orange-400",
      workflow: [
        {
          icon: Send,
          title: "Receive URL",
          description: "Student shares verification link in job or university application",
        },
        {
          icon: Search,
          title: "One-Click Verify",
          description: "Click link for instant blockchain verification of issued credentials",
        },
        {
          icon: FileText,
          title: "View Details",
          description: "Access complete credential information and endorsement history",
        },
        {
          icon: CheckCircle,
          title: "Blockchain Proof",
          description: "View cryptographic proof and transaction details on explorer",
        },
      ],
      link: "/verify",
      linkText: "Verify Credentials",
      stats: { verifications: "15000+", employers: "100+", "avg-time": "< 5 sec" },
    },
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % roles.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + roles.length) % roles.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  const currentRole = roles[currentSlide]

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Complete Workflow
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How FairCredit Works</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            From student application to credential verification - explore each role in the academic credentialing
            ecosystem
          </p>

          {/* Role Navigation Buttons - Fixed Overflow */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 max-w-4xl mx-auto">
            {roles.map((role, index) => (
              <Button
                key={index}
                variant={index === currentSlide ? "default" : "outline"}
                size="sm"
                onClick={() => goToSlide(index)}
                className={`flex flex-col items-center gap-2 h-auto py-3 px-2 text-center ${
                  index === currentSlide ? "" : "bg-transparent"
                }`}
              >
                <role.icon className="h-5 w-5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-xs truncate">{role.title}</div>
                  <div className="text-xs opacity-75 leading-tight">{role.shortDesc}</div>
                </div>
              </Button>
            ))}
          </div>

          {/* Slide Controls */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <Button variant="outline" size="icon" onClick={prevSlide} className="h-10 w-10 bg-transparent">
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Slide Indicators */}
            <div className="flex items-center gap-2">
              {roles.map((role, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "bg-primary scale-125"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  aria-label={`Go to ${role.title} slide`}
                />
              ))}
            </div>

            <Button variant="outline" size="icon" onClick={nextSlide} className="h-10 w-10 bg-transparent">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Slideshow Content */}
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {roles.map((role, index) => (
              <div key={index} className="w-full flex-shrink-0">
                <Card className={`${role.color} hover:shadow-xl transition-all duration-300 max-w-6xl mx-auto`}>
                  <CardHeader className="text-center pb-6">
                    <div className="mx-auto mb-6 p-4 rounded-full bg-background/50 w-fit">
                      <role.icon className={`h-12 w-12 ${role.iconColor}`} />
                    </div>
                    <CardTitle className="text-2xl md:text-3xl mb-2">{role.title}</CardTitle>
                    <CardDescription className="text-lg font-medium">{role.subtitle}</CardDescription>
                    <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">{role.description}</p>
                  </CardHeader>

                  <CardContent className="space-y-8">
                    {/* Workflow Steps with Icons Only */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {role.workflow.map((step, stepIndex) => (
                        <div key={stepIndex} className="text-center space-y-4">
                          <div className="relative mx-auto w-24 h-24 rounded-full bg-background/30 flex items-center justify-center">
                            <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                              {stepIndex + 1}
                            </div>
                            <step.icon className={`h-10 w-10 ${role.iconColor}`} />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">{step.title}</h4>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 py-6 border-t border-background/20">
                      {Object.entries(role.stats).map(([key, value], statIndex) => (
                        <div key={statIndex} className="text-center">
                          <div className="text-2xl font-bold">{value}</div>
                          <div className="text-xs text-muted-foreground capitalize">{key.replace("-", " ")}</div>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <div className="text-center pt-4">
                      <Link href={role.link}>
                        <Button size="lg" className="text-lg px-8">
                          {role.linkText}
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>
              Step {currentSlide + 1} of {roles.length}
            </span>
            <span>Use arrows or buttons to navigate</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentSlide + 1) / roles.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
