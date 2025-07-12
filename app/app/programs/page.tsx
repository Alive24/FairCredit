"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Eye, Users, FileText, Calendar, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"

export default function ProgramsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const programs = [
    {
      id: "1",
      title: "Advanced Quantum Computing Research",
      description: "Comprehensive research program in quantum algorithms and applications",
      category: "Research",
      duration: "6 months",
      status: "active",
      applications: 12,
      enrolled: 8,
      completions: 3,
      requirements: ["Bachelor's in Computer Science or Physics", "Linear Algebra proficiency", "Research proposal"],
      skills: ["Quantum Algorithms", "Research Methodology", "Academic Writing"],
      supervisor: "Dr. Sarah Chen",
      createdDate: "2024-01-10",
    },
    {
      id: "2",
      title: "Machine Learning in Healthcare",
      description: "Applied ML techniques for medical diagnosis and treatment optimization",
      category: "Applied Research",
      duration: "4 months",
      status: "active",
      applications: 18,
      enrolled: 12,
      completions: 7,
      requirements: ["Programming experience in Python", "Statistics background", "Healthcare interest"],
      skills: ["Machine Learning", "Healthcare Analytics", "Python", "Data Science"],
      supervisor: "Prof. Michael Roberts",
      createdDate: "2023-12-15",
    },
    {
      id: "3",
      title: "Sustainable Energy Systems",
      description: "Research and development in renewable energy technologies",
      category: "Engineering",
      duration: "8 months",
      status: "draft",
      applications: 0,
      enrolled: 0,
      completions: 0,
      requirements: ["Engineering background", "Environmental science knowledge", "Project proposal"],
      skills: ["Renewable Energy", "Systems Analysis", "Sustainability", "Engineering Design"],
      supervisor: "Dr. Lisa Anderson",
      createdDate: "2024-01-20",
    },
    {
      id: "4",
      title: "Digital Innovation in Finance",
      description: "Exploring blockchain and fintech applications in modern banking",
      category: "Technology",
      duration: "5 months",
      status: "paused",
      applications: 5,
      enrolled: 3,
      completions: 0,
      requirements: ["Finance or CS background", "Blockchain basics", "Innovation mindset"],
      skills: ["Blockchain", "Fintech", "Innovation", "Financial Analysis"],
      supervisor: "Dr. James Wilson",
      createdDate: "2023-11-30",
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">Draft</Badge>
      case "paused":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Paused</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredPrograms = programs.filter((program) => {
    const matchesSearch =
      program.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || program.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Credential Programs</h1>
            <p className="text-muted-foreground">Design and manage your academic credential programs</p>
          </div>
          <Link href="/programs/create">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create Program
            </Button>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Programs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{programs.length}</div>
              <p className="text-xs text-muted-foreground">+2 from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
              <Badge className="h-4 w-4 bg-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{programs.filter((p) => p.status === "active").length}</div>
              <p className="text-xs text-muted-foreground">Currently accepting applications</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{programs.reduce((sum, p) => sum + p.applications, 0)}</div>
              <p className="text-xs text-muted-foreground">Across all programs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{programs.reduce((sum, p) => sum + p.completions, 0)}</div>
              <p className="text-xs text-muted-foreground">Credentials issued</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search programs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Programs Grid */}
        <div className="grid gap-6">
          {filteredPrograms.map((program) => (
            <Card key={program.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{program.title}</CardTitle>
                      {getStatusBadge(program.status)}
                    </div>
                    <CardDescription className="text-base mb-3">{program.description}</CardDescription>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>Category: {program.category}</span>
                      <span>Duration: {program.duration}</span>
                      <span>Supervisor: {program.supervisor}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/programs/${program.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/programs/${program.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Program
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/programs/${program.id}/applications`}>
                          <Users className="h-4 w-4 mr-2" />
                          View Applications
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Program Stats */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{program.applications}</div>
                      <div className="text-xs text-muted-foreground">Applications</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{program.enrolled}</div>
                      <div className="text-xs text-muted-foreground">Enrolled</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{program.completions}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <p className="text-sm font-medium mb-2">Skills Developed:</p>
                    <div className="flex flex-wrap gap-1">
                      {program.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Requirements Preview */}
                  <div>
                    <p className="text-sm font-medium mb-2">Requirements:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {program.requirements.slice(0, 2).map((req, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
                          <span>{req}</span>
                        </li>
                      ))}
                      {program.requirements.length > 2 && (
                        <li className="text-xs text-muted-foreground/70">
                          +{program.requirements.length - 2} more requirements
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-4">
                    <Link href={`/programs/${program.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                    <Link href={`/programs/${program.id}/applications`}>
                      <Button size="sm" variant="outline">
                        <Users className="h-4 w-4 mr-2" />
                        Applications ({program.applications})
                      </Button>
                    </Link>
                    {program.status === "draft" && <Button size="sm">Publish Program</Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPrograms.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Programs Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "No programs match your current filters."
                  : "You haven't created any credential programs yet."}
              </p>
              <Link href="/programs/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Program
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
