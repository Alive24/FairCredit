"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { getAddFeedbackInstruction } from "@/lib/solana/generated/instructions/addFeedback";
import { getAddAttendanceInstruction } from "@/lib/solana/generated/instructions/addAttendance";
import { getAddGradeInstruction } from "@/lib/solana/generated/instructions/addGrade";
import {
  canPerformActivityAction,
  ROLE_INTENT_NOTICE,
} from "@/lib/activities/activity-policy";
import { useUserRole } from "@/hooks/use-user-role";
import { parseCsvIdList } from "@/lib/activities/activity-form-schema";
import { Loader2 } from "lucide-react";
import { address as toAddress } from "@solana/kit";
import type { ParsedActivityData } from "@/lib/types/activity-data";
import type { ActivityKindKey } from "@/lib/activities/activity-form-schema";

function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ActivityUpdateActions({
  activityAddress,
  activityKind,
  parsedData,
  moduleId,
  onUpdated,
}: {
  activityAddress: string;
  activityKind: ActivityKindKey | null;
  parsedData: ParsedActivityData;
  moduleId?: string;
  onUpdated?: () => void | Promise<void>;
}) {
  const activityAddressAsAddress = toAddress(activityAddress);
  const { address, isConnected } = useAppKitAccount();
  const { sendTransaction } = useAppKitTransaction();
  const { toast } = useToast();
  const { role } = useUserRole();

  const canAddFeedback = canPerformActivityAction(role, "add_feedback");
  const canAddAttendance = canPerformActivityAction(role, "add_attendance");
  const canAddGrade = canPerformActivityAction(role, "add_grade");

  const showAttendanceAction = activityKind === "AttendMeeting";
  const showFeedbackAction = activityKind === "AddFeedback";
  const showGradeAction = activityKind === "SubmitAssignment";

  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackAssetIds, setFeedbackAssetIds] = useState("");
  const [feedbackEvidenceIds, setFeedbackEvidenceIds] = useState("");

  const [attendanceTimestamp, setAttendanceTimestamp] = useState(
    toLocalDatetimeInputValue(new Date()),
  );

  const [gradeValue, setGradeValue] = useState("");
  const [gradeAssetIds, setGradeAssetIds] = useState("");
  const [gradeEvidenceIds, setGradeEvidenceIds] = useState("");

  const ensureWallet = () => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Connect your wallet to perform this action.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const runUpdated = async () => {
    if (onUpdated) {
      await onUpdated();
    }
  };

  const submitFeedback = async () => {
    if (!ensureWallet()) return;
    if (!canAddFeedback) {
      toast({
        title: "Action not allowed",
        description: ROLE_INTENT_NOTICE.add_feedback,
        variant: "destructive",
      });
      return;
    }

    const content = feedbackContent.trim();
    if (content.length < 2) {
      toast({
        title: "Invalid feedback",
        description: "Feedback content must be at least 2 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      const ix = getAddFeedbackInstruction({
        activity: activityAddressAsAddress,
        studentAuthority: createPlaceholderSigner(address!),
        content,
        assetIds: parseCsvIdList(feedbackAssetIds),
        evidenceAssetIds: parseCsvIdList(feedbackEvidenceIds),
      });

      await sendTransaction([ix]);

      setFeedbackContent("");
      setFeedbackAssetIds("");
      setFeedbackEvidenceIds("");

      toast({
        title: "Feedback added",
        description: "Activity feedback has been updated.",
      });

      await runUpdated();
    } catch (error) {
      toast({
        title: "Feedback failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const submitAttendance = async () => {
    if (!ensureWallet()) return;
    if (!canAddAttendance) {
      toast({
        title: "Action not allowed",
        description: ROLE_INTENT_NOTICE.add_attendance,
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingAttendance(true);
    try {
      const timestamp = attendanceTimestamp.trim()
        ? new Date(attendanceTimestamp).toISOString()
        : null;

      // For AttendMeeting activities, preserve module linkage in JSON and append attendance history.
      if (activityKind === "AttendMeeting" && timestamp) {
        const epoch = String(Math.floor(new Date(timestamp).getTime() / 1000));
        const parsedObject = (() => {
          try {
            return JSON.parse(parsedData.raw) as Record<string, unknown>;
          } catch {
            return {} as Record<string, unknown>;
          }
        })();

        const previousRecords = Array.isArray(parsedObject.attendanceRecords)
          ? parsedObject.attendanceRecords
              .filter((entry): entry is string => typeof entry === "string")
              .slice(-199)
          : [];

        const modules =
          parsedData.modules.length > 0
            ? parsedData.modules
            : moduleId
              ? [{ module_pubkey: moduleId }]
              : [];

        const nextPayload = {
          ...parsedObject,
          kind: "AttendMeeting",
          timestamp,
          note:
            typeof parsedObject.note === "string"
              ? parsedObject.note
              : parsedData.description,
          modules,
          attendanceRecords: [...previousRecords, epoch].slice(-120),
        };

        const content = JSON.stringify(nextPayload);

        const ix = getAddFeedbackInstruction({
          activity: activityAddressAsAddress,
          studentAuthority: createPlaceholderSigner(address!),
          content,
          assetIds: [],
          evidenceAssetIds: [],
        });

        await sendTransaction([ix]);

        toast({
          title: "Attendance recorded",
          description:
            "Attendance history was updated on the existing meeting activity.",
        });

        await runUpdated();
        return;
      }

      const ix = getAddAttendanceInstruction({
        activity: activityAddressAsAddress,
        studentAuthority: createPlaceholderSigner(address!),
        timestamp,
      });

      await sendTransaction([ix]);

      toast({
        title: "Attendance added",
        description: "Attendance timestamp has been updated.",
      });

      await runUpdated();
    } catch (error) {
      toast({
        title: "Attendance failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const submitGrade = async () => {
    if (!ensureWallet()) return;
    if (!canAddGrade) {
      toast({
        title: "Action not allowed",
        description: ROLE_INTENT_NOTICE.add_grade,
        variant: "destructive",
      });
      return;
    }

    const numericGrade = Number(gradeValue);
    if (!Number.isFinite(numericGrade) || numericGrade < 0 || numericGrade > 100) {
      toast({
        title: "Invalid grade",
        description: "Grade must be a number between 0 and 100.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingGrade(true);
    try {
      const ix = getAddGradeInstruction({
        activity: activityAddressAsAddress,
        teacher: createPlaceholderSigner(address!),
        gradeValue: numericGrade,
        assetIds: parseCsvIdList(gradeAssetIds),
        evidenceAssetIds: parseCsvIdList(gradeEvidenceIds),
      });

      await sendTransaction([ix]);

      setGradeValue("");
      setGradeAssetIds("");
      setGradeEvidenceIds("");

      toast({
        title: "Grade added",
        description: "Activity grade has been updated.",
      });

      await runUpdated();
    } catch (error) {
      toast({
        title: "Grade failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {showAttendanceAction && (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!canAddAttendance || isSubmittingAttendance}
            >
              {isSubmittingAttendance ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Saving
                </>
              ) : (
                "Add Attendance"
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Attendance</DialogTitle>
              <DialogDescription>
                Record attendance timestamp for this activity.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Timestamp</label>
                <Input
                  type="datetime-local"
                  value={attendanceTimestamp}
                  onChange={(e) => setAttendanceTimestamp(e.target.value)}
                />
              </div>
              <Button onClick={submitAttendance} disabled={isSubmittingAttendance}>
                Save Attendance
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}

        {showFeedbackAction && (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!canAddFeedback || isSubmittingFeedback}
            >
              {isSubmittingFeedback ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Saving
                </>
              ) : (
                "Add Feedback"
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Feedback</DialogTitle>
              <DialogDescription>
                Update feedback content and optional asset references.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  className="min-h-[90px]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Asset IDs (comma separated)</label>
                <Input
                  value={feedbackAssetIds}
                  onChange={(e) => setFeedbackAssetIds(e.target.value)}
                  placeholder="asset_1,asset_2"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Evidence Asset IDs (comma separated)
                </label>
                <Input
                  value={feedbackEvidenceIds}
                  onChange={(e) => setFeedbackEvidenceIds(e.target.value)}
                  placeholder="evidence_1"
                />
              </div>
              <Button onClick={submitFeedback} disabled={isSubmittingFeedback}>
                Save Feedback
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}

        {showGradeAction && (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!canAddGrade || isSubmittingGrade}
            >
              {isSubmittingGrade ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Saving
                </>
              ) : (
                "Add Grade"
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Grade</DialogTitle>
              <DialogDescription>
                Set grade and optional asset references for this activity.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Grade (0-100)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Asset IDs (comma separated)</label>
                <Input
                  value={gradeAssetIds}
                  onChange={(e) => setGradeAssetIds(e.target.value)}
                  placeholder="asset_1,asset_2"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Evidence Asset IDs (comma separated)
                </label>
                <Input
                  value={gradeEvidenceIds}
                  onChange={(e) => setGradeEvidenceIds(e.target.value)}
                  placeholder="evidence_1"
                />
              </div>
              <Button onClick={submitGrade} disabled={isSubmittingGrade}>
                Save Grade
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {role === "student" && (
        <p className="text-xs text-muted-foreground">
          Student role can add attendance and feedback.
        </p>
      )}
      {role === "supervisor" && (
        <p className="text-xs text-muted-foreground">
          Supervisor role can add grades.
        </p>
      )}
      {!role && (
        <p className="text-xs text-muted-foreground">
          Select a role to enable allowed activity actions.
        </p>
      )}
    </div>
  );
}
