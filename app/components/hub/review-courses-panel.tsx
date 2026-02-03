"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { useProviders } from "@/hooks/use-providers";
import { useCourses } from "@/hooks/use-courses";
import { useIsHubAuthority } from "@/hooks/use-is-hub-authority";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import { getAddAcceptedCourseInstructionAsync } from "@/lib/solana/generated/instructions/addAcceptedCourse";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import {
  FileText,
  CheckCircle,
  Loader2,
  Eye,
  Calendar,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import type { CourseEntry } from "@/hooks/use-courses";
import { CourseStatus } from "@/lib/solana/generated/types/courseStatus";
import { resolveAcceptedCourses } from "@/lib/solana/course-ref-resolver";

export function ReviewCoursesPanel() {
  const { toast } = useToast();
  const { rpc } = useFairCredit();
  const { hubData, refreshHubData } = useIsHubAuthority();
  const { providers: allProviders } = useProviders();
  const acceptedProviderWallets =
    hubData?.acceptedProviders?.map((p: unknown) => String(p)) ?? [];
  const { courses, loading, refetch } = useCourses(
    acceptedProviderWallets.length > 0 ? acceptedProviderWallets : null
  );
  const {
    address: walletAddress,
    isConnected,
    sendTransaction,
    isSending,
  } = useAppKitTransaction();
  const [selectedCourse, setSelectedCourse] = useState<CourseEntry | null>(
    null
  );
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [acceptingCourseId, setAcceptingCourseId] = useState<string | null>(
    null
  );
  const [acceptedCourseSet, setAcceptedCourseSet] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    let cancelled = false;
    async function syncAcceptedCourses() {
      if (!hubData) {
        setAcceptedCourseSet(new Set());
        return;
      }
      const resolved = await resolveAcceptedCourses(
        rpc,
        hubData.acceptedCourses ?? []
      );
      if (!cancelled) {
        setAcceptedCourseSet(
          new Set(resolved.map(({ address }) => String(address)))
        );
      }
    }
    syncAcceptedCourses();
    return () => {
      cancelled = true;
    };
  }, [hubData, rpc]);

  const isCourseAccepted = (courseAddress: string) =>
    acceptedCourseSet.has(courseAddress);

  const pendingCourses = courses.filter(
    (entry) =>
      !isCourseAccepted(String(entry.address)) &&
      entry.course.status !== CourseStatus.Draft
  );

  const getProviderName = (providerWallet: string) => {
    const w = providerWallet.toLowerCase();
    const found = allProviders.find(({ provider }) => {
      const pw =
        typeof provider.wallet === "string"
          ? provider.wallet
          : String(provider.wallet);
      return pw.toLowerCase() === w;
    });
    return found?.provider.name ?? providerWallet.slice(0, 8) + "…";
  };

  const handleAcceptCourse = async (entry: CourseEntry) => {
    if (!isConnected || !walletAddress) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to accept courses.",
        variant: "destructive",
      });
      return;
    }

    const course = entry.course;
    setAcceptingCourseId(String(entry.address));
    try {
      const ix = await getAddAcceptedCourseInstructionAsync({
        hub: undefined,
        authority: createPlaceholderSigner(walletAddress),
        course: entry.address,
      });

      const signature = await sendTransaction([ix]);
      toast({
        title: "Course accepted",
        description: `Course "${
          course.name
        }" has been added to the hub. Transaction: ${signature.slice(0, 8)}...`,
      });

      await refreshHubData();
      refetch();
    } catch (error) {
      console.error("Failed to accept course:", error);
      toast({
        title: "Failed to accept course",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setAcceptingCourseId(null);
    }
  };

  const getStatusBadge = (status: unknown) => {
    switch (status) {
      case CourseStatus.Draft:
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            Draft
          </Badge>
        );
      case CourseStatus.Verified:
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Verified
          </Badge>
        );
      case CourseStatus.Archived:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Archived
          </Badge>
        );
      case CourseStatus.Rejected:
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{String(status)}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Courses</CardTitle>
          <CardDescription>
            Pending courses from accepted providers. Accept them to add to the
            hub.
          </CardDescription>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={loading}
              title="Refresh course list"
            >
              <RefreshCw
                className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {!loading && acceptedProviderWallets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No accepted providers yet. Accept providers first to see their
              courses here.
            </div>
          )}

          {!loading &&
            acceptedProviderWallets.length > 0 &&
            pendingCourses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No pending courses. All courses from accepted providers are
                already in the hub.
              </div>
            )}

          {!loading && pendingCourses.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">
                Pending Courses ({pendingCourses.length})
              </h3>
              {pendingCourses.map((entry) => {
                const course = entry.course;
                const providerWallet =
                  typeof course.provider === "string"
                    ? course.provider
                    : String(course.provider);
                const providerName = getProviderName(providerWallet);
                return (
                  <Card key={String(entry.address)} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="h-4 w-4 shrink-0" />
                          <h4 className="font-semibold">{course.name}</h4>
                          {getStatusBadge(course.status)}
                          <span className="text-xs text-muted-foreground">
                            by {providerName}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {course.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {course.workloadRequired} hours
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(
                              Number(course.created) * 1000
                            ).toLocaleDateString()}
                          </span>
                          <span>ts={String(course.creationTimestamp)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCourse(entry);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptCourse(entry)}
                          disabled={
                            isSending ||
                            acceptingCourseId === String(entry.address)
                          }
                        >
                          {acceptingCourseId === String(entry.address) ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Accepting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCourse?.course.name}</DialogTitle>
            <DialogDescription>Course Details</DialogDescription>
          </DialogHeader>
          {selectedCourse && (
            <CourseDetailContent
              entry={selectedCourse}
              getProviderName={getProviderName}
              getStatusBadge={getStatusBadge}
              isCourseAccepted={isCourseAccepted}
              onAccept={() => {
                handleAcceptCourse(selectedCourse);
                setDetailDialogOpen(false);
              }}
              onClose={() => setDetailDialogOpen(false)}
              isSending={isSending}
              acceptingCourseId={acceptingCourseId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CourseDetailContent({
  entry,
  getProviderName,
  getStatusBadge,
  isCourseAccepted,
  onAccept,
  onClose,
  isSending,
  acceptingCourseId,
}: {
  entry: CourseEntry;
  getProviderName: (w: string) => string;
  getStatusBadge: (status: unknown) => ReactNode;
  isCourseAccepted: (addr: string) => boolean;
  onAccept: () => void;
  onClose: () => void;
  isSending: boolean;
  acceptingCourseId: string | null;
}) {
  const course = entry.course;
  const providerWallet =
    typeof course.provider === "string"
      ? course.provider
      : String(course.provider);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Status</Label>
        <div className="mt-1">{getStatusBadge(course.status)}</div>
      </div>
      <div>
        <Label className="text-sm font-medium">Provider</Label>
        <p className="mt-1 text-sm">{getProviderName(providerWallet)}</p>
      </div>
      <div>
        <Label className="text-sm font-medium">Description</Label>
        <p className="mt-1 text-sm">{course.description}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Creation Timestamp</Label>
          <p className="mt-1 text-sm font-mono">
            {String(course.creationTimestamp)}
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium">Workload Required</Label>
          <p className="mt-1 text-sm">{course.workloadRequired} hours</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Created</Label>
          <p className="mt-1 text-sm">
            {new Date(Number(course.created) * 1000).toLocaleString()}
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium">Updated</Label>
          <p className="mt-1 text-sm">
            {new Date(Number(course.updated) * 1000).toLocaleString()}
          </p>
        </div>
        {course.degreeId &&
          typeof course.degreeId === "object" &&
          "__option" in course.degreeId &&
          (course.degreeId as { __option: string }).__option === "Some" && (
            <div>
              <Label className="text-sm font-medium">Degree ID</Label>
              <p className="mt-1 text-sm">
                {(course.degreeId as { value: string }).value}
              </p>
            </div>
          )}
        <div>
          <Label className="text-sm font-medium">College ID</Label>
          <p className="mt-1 text-sm">{course.collegeId}</p>
        </div>
      </div>
      {course.rejectionReason &&
        typeof course.rejectionReason === "object" &&
        "__option" in course.rejectionReason &&
        (course.rejectionReason as { __option: string }).__option ===
          "Some" && (
          <div>
            <Label className="text-sm font-medium">Rejection Reason</Label>
            <p className="mt-1 text-sm text-destructive">
              {(course.rejectionReason as { value: string }).value}
            </p>
          </div>
        )}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {!isCourseAccepted(String(entry.address)) && (
          <Button
            onClick={onAccept}
            disabled={isSending || acceptingCourseId === String(entry.address)}
          >
            {acceptingCourseId === String(entry.address) ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                Accept Course
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
