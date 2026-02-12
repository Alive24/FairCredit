import { ActivityList } from "@/components/activities/activity-list";
import { ActivityDebugPanel } from "@/components/activities/activity-debug-panel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course } = await params;

  return (
    <div className="container py-8 max-w-5xl">
      <div className="mb-6">
        <Link
          href={`/courses/${course}`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Course
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Activity Manager</h1>
            <p className="text-muted-foreground mt-2">
              Track your progress and submit evidence for this course.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Modules and activities */}
        <ActivityList courseAddress={course} />

        <ActivityDebugPanel courseAddress={course} />

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Perform the required activity.</p>
            <p>2. Prepare your evidence (documents, links, etc.).</p>
            <p>3. Use the module sections above to log your activity.</p>
            <p>4. Wait for supervisor endorsement.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
