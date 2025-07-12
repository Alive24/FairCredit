"use client"

import React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, GraduationCap, UserCheck, Search, ArrowRight, FileText, Send, CheckCircle, Eye } from "lucide-react"
import Link from "next/link"

export function HowItWorksSection() {
  const [activeRole, setActiveRole] = useState(0)

  const roleWorkflows = [
    {
      role: "Provider",
      shortDesc: "Review applications & issue credentials",
      icon: Users,
      color: "border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800",
      iconColor: "text-blue-600 dark:text-blue-400",
      steps: [
        {
          icon: FileText,
          title: "Receive Student Applications",
          description: "Students submit applications with academic work and supporting documents",
          image: "/placeholder.svg?height=150&width=200&text=Application+Inbox",
        },
        {
          icon: CheckCircle,
          title: "Review & Verify Work",
          description: "Evaluate student submissions and verify academic achievements",
          image: "/placeholder.svg?height=150&width=200&text=Review+Process",
        },
        {
          icon: Send,
          title: "Send for Supervisor Endorsement",
          description: "Forward approved applications to academic supervisors for final validation",
          image: "/placeholder.svg?height=150&width=200&text=Supervisor+Email",
        },
        {
          icon: Eye,
          title: "Track & Manage Status",
          description: "Monitor endorsement progress and manage credential lifecycle",
          image: "/placeholder.svg?height=150&width=200&text=Status+Dashboard",
        },
      ],
      link: "/dashboard",
      linkText: "Start Reviewing Applications",
    },
    {
      role: "Student",
      shortDesc: "Apply for credentials & manage portfolio",
      icon: GraduationCap,
      color: "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800",
      iconColor: "text-green-600 dark:text-green-400",
      steps: [
        {
          icon: Send,
          title: "Submit Application",
          description: "Apply to educational providers with your academic work and achievements",
          image: "/placeholder.svg?height=150&width=200&text=Submit+Application",
        },
        {
          icon: Eye,
          title: "Track Application Status",
          description: "Monitor your application progress through the review process",
          image: "/placeholder.svg?height=150&width=200&text=Application+Status",
        },
        {
          icon: CheckCircle,
          title: "Receive NFT Credential",
          description: "Get blockchain-verified credential minted to your wallet upon approval",
          image: "/placeholder.svg?height=150&width=200&text=NFT+Wallet",
        },
        {
          icon: FileText,
          title: "Share & Showcase",
          description: "Generate verification URLs and share your achievements with employers",
          image: "/placeholder.svg?height=150&width=200&text=Share+Portfolio",
        },
      ],
      link: "/credentials",
      linkText: "View My Applications",
    },
    {
      role: "Supervisor",
      shortDesc: "Endorse student academic work",
      icon: UserCheck,
      color: "border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800",
      iconColor: "text-purple-600 dark:text-purple-400",
      steps: [
        {
          icon: Send,
          title: "Receive Endorsement Request",
          description: "Get secure email invitation from educational provider to review student work",
          image: "/placeholder.svg?height=150&width=200&text=Email+Invitation",
        },
        {
          icon: FileText,
          title: "Review Student Work",
          description: "Examine comprehensive details of student's academic achievements",
          image: "/placeholder.svg?height=150&width=200&text=Review+Interface",
        },
        {
          icon: CheckCircle,
          title: "Connect Wallet",
          description: "Authenticate with your wallet to provide cryptographic endorsement",
          image: "/placeholder.svg?height=150&width=200&text=Wallet+Connect",
        },
        {
          icon: UserCheck,
          title: "Endorse or Reject",
          description: "Provide blockchain signature to validate or reject the credential",
          image: "/placeholder.svg?height=150&width=200&text=Digital+Signature",
        },
      ],
      link: "/supervisor-endorsement/demo",
      linkText: "Try Demo Review",
    },
    {
      role: "Verifier",
      shortDesc: "Instantly verify credentials",
      icon: Search,
      color: "border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800",
      iconColor: "text-orange-600 dark:text-orange-400",
      steps: [
        {
          icon: Send,
          title: "Receive Verification URL",
          description: "Student shares credential verification link in job or university application",
          image: "/placeholder.svg?height=150&width=200&text=Verification+Link",
        },
        {
          icon: Search,
          title: "One-Click Verification",
          description: "Click the link for instant blockchain-based credential verification",
          image: "/placeholder.svg?height=150&width=200&text=Click+Verify",
        },
        {
          icon: FileText,
          title: "View Complete Details",
          description: "Access comprehensive credential information, skills, and achievements",
          image: "/placeholder.svg?height=150&width=200&text=Credential+Details",
        },
        {
          icon: CheckCircle,
          title: "Blockchain Proof",
          description: "View cryptographic proof and transaction details on blockchain explorer",
          image: "/placeholder.svg?height=150&width=200&text=Blockchain+Explorer",
        },
      ],
      link: "/verify",
      linkText: "Try Verification",
    },
  ]

  return (
    <section id="how-it-works" className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            How It Works
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple Workflows for Every Role</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Each stakeholder has a streamlined process designed specifically for their needs and responsibilities
          </p>

          {/* Role Selector - Larger Buttons with Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 max-w-6xl mx-auto">
            {roleWorkflows.map((workflow, index) => (
              <Button
                key={index}
                variant={index === activeRole ? "default" : "outline"}
                size="lg"
                onClick={() => setActiveRole(index)}
                className={`flex flex-col items-center gap-3 h-auto py-4 px-4 ${
                  index === activeRole ? "" : "bg-transparent"
                }`}
              >
                {React.createElement(workflow.icon, { className: "h-6 w-6" })}
                <div className="text-center">
                  <div className="font-semibold text-sm">{workflow.role}</div>
                  <div className="text-xs opacity-80 mt-1 leading-tight">{workflow.shortDesc}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Active Workflow */}
        <div className="max-w-6xl mx-auto">
          <Card className={`${roleWorkflows[activeRole].color} hover:shadow-lg transition-shadow`}>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-background/50">
                  {React.createElement(roleWorkflows[activeRole].icon, {
                    className: `h-8 w-8 ${roleWorkflows[activeRole].iconColor}`,
                  })}
                </div>
                <div>
                  <CardTitle className="text-xl">{roleWorkflows[activeRole].role} Workflow</CardTitle>
                  <CardDescription>{roleWorkflows[activeRole].shortDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Steps with Images */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {roleWorkflows[activeRole].steps.map((step, stepIndex) => (
                  <div key={stepIndex} className="text-center space-y-4">
                    <div className="relative">
                      <img
                        src={step.image || "/placeholder.svg"}
                        alt={step.title}
                        className="w-full h-32 object-cover rounded-lg border-2 border-background/20"
                      />
                      <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {stepIndex + 1}
                      </div>
                      <div className="absolute bottom-2 right-2 p-2 bg-background/80 rounded-full">
                        <step.icon className={`h-4 w-4 ${roleWorkflows[activeRole].iconColor}`} />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-sm">{step.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center pt-4">
                <Link href={roleWorkflows[activeRole].link}>
                  <Button size="lg">
                    {roleWorkflows[activeRole].linkText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
