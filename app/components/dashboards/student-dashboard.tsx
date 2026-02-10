"use client";

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";

export function StudentDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Student Dashboard</h1>
            <p className="text-muted-foreground">
              Browse courses, register, and track your credentials
            </p>
          </div>
        </div>

        {/* Getting Started */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              How It Works
            </CardTitle>
            <CardDescription>
              Your academic credentials, verified on the blockchain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center p-4 rounded-lg border bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <span className="text-lg font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold mb-1">Browse & Register</h3>
                <p className="text-sm text-muted-foreground">
                  Find an accepted course and register directly from its detail
                  page.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-lg border bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <span className="text-lg font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold mb-1">Complete Activities</h3>
                <p className="text-sm text-muted-foreground">
                  Record learning activities and get endorsement from your
                  supervisor.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-lg border bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <span className="text-lg font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold mb-1">Earn Credential</h3>
                <p className="text-sm text-muted-foreground">
                  Once approved, your credential is recorded on-chain and can be
                  verified by anyone.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/courses">
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col gap-2 bg-transparent"
                >
                  <Search className="h-6 w-6" />
                  Browse Courses
                </Button>
              </Link>
              <Link href="/credentials">
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col gap-2 bg-transparent"
                >
                  <BookOpen className="h-6 w-6" />
                  My Credentials
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
