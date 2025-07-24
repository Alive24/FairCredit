"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFairCredit } from "@/lib/solana/context";
import { Calendar, Clock, User } from "lucide-react";

interface Course {
  id: string;
  name: string;
  description: string;
  status: any;
  workloadRequired: number;
  provider: string;
  providerName: string;
  providerEmail: string;
  created: Date;
  updated: Date;
}

export function CourseList() {
  const { client } = useFairCredit();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      if (!client) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const coursesData = await client.getAllAcceptedCoursesWithDetails();
        setCourses(coursesData);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setError("Failed to load courses. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, [client]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!client) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Unable to connect to FairCredit program</p>
        </CardContent>
      </Card>
    );
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No courses available at the moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <Card key={course.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{course.name}</CardTitle>
                <CardDescription className="mt-1">{course.id}</CardDescription>
              </div>
              <Badge variant="secondary">
                {course.status?.draft ? "Draft" : 
                 course.status?.published ? "Published" : 
                 course.status?.archived ? "Archived" : "Unknown"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{course.description}</p>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{course.providerName}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{course.workloadRequired} hours workload</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Created {course.created.toLocaleDateString()}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button className="w-full" size="sm">
                View Details
              </Button>
              <Button variant="outline" size="sm">
                Enroll
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}