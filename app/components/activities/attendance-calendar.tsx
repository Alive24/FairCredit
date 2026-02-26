"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  addMonths,
  differenceInCalendarMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type AttendanceUserRole =
  | "provider"
  | "student"
  | "supervisor"
  | "verifier"
  | null;

export type AttendanceStatus = "present" | "absent" | "late";

export type AttendanceRecord = {
  id: string;
  timestamp: Date;
  status: AttendanceStatus;
  note?: string;
  isQuestioned?: boolean;
  questionedBy?: string;
  questionedReason?: string;
};

export type AttendanceRequirement = {
  frequency: "weekly" | "biweekly" | "monthly";
  totalRequired: number;
  startDate: Date;
  endDate?: Date;
};

type AttendanceCalendarProps = {
  records: AttendanceRecord[];
  requirement?: AttendanceRequirement;
  userRole: AttendanceUserRole;
  onMarkAttendance?: (
    date: Date,
    status: AttendanceStatus,
    note?: string,
  ) => void | Promise<void>;
  onQuestionAttendance?: (
    recordId: string,
    reason: string,
  ) => void | Promise<void>;
};

function getStatusColor(
  status: AttendanceStatus,
  isQuestioned = false,
): string {
  if (isQuestioned) return "bg-amber-500";
  if (status === "present") return "bg-green-500";
  if (status === "late") return "bg-orange-500";
  return "bg-red-500";
}

function clampMonth(target: Date, minMonth: Date, maxMonth: Date): Date {
  const targetTs = startOfMonth(target).getTime();
  const minTs = startOfMonth(minMonth).getTime();
  const maxTs = startOfMonth(maxMonth).getTime();
  if (targetTs < minTs) return startOfMonth(minMonth);
  if (targetTs > maxTs) return startOfMonth(maxMonth);
  return startOfMonth(target);
}

function getCalendarDays(monthDate: Date): Date[] {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  return eachDayOfInterval({ start: calStart, end: calEnd });
}

export function AttendanceCalendar({
  records,
  requirement,
  userRole,
  onMarkAttendance,
  onQuestionAttendance,
}: AttendanceCalendarProps) {
  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      ),
    [records],
  );
  const firstAttendanceDate =
    sortedRecords.length > 0 ? sortedRecords[0].timestamp : null;
  const lastAttendanceDate =
    sortedRecords.length > 0
      ? sortedRecords[sortedRecords.length - 1].timestamp
      : null;

  const minMonthBound = useMemo(() => {
    const source = requirement?.startDate ?? firstAttendanceDate ?? new Date();
    return startOfMonth(source);
  }, [firstAttendanceDate, requirement?.startDate]);

  const maxMonthBound = useMemo(() => {
    const source = requirement?.endDate ?? lastAttendanceDate ?? minMonthBound;
    const month = startOfMonth(source);
    return month.getTime() < minMonthBound.getTime() ? minMonthBound : month;
  }, [lastAttendanceDate, minMonthBound, requirement?.endDate]);

  const hasAtLeastTwoMonths =
    differenceInCalendarMonths(maxMonthBound, minMonthBound) >= 1;
  const maxStartMonth = hasAtLeastTwoMonths
    ? subMonths(maxMonthBound, 1)
    : minMonthBound;

  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    clampMonth(new Date(), minMonthBound, maxStartMonth),
  );
  const [markDialogOpen, setMarkDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(
    null,
  );
  const [attendanceNote, setAttendanceNote] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<AttendanceStatus>("present");
  const [questionReason, setQuestionReason] = useState("");
  const [hoveredRecord, setHoveredRecord] = useState<AttendanceRecord | null>(
    null,
  );

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    setCurrentMonth((prev) => clampMonth(prev, minMonthBound, maxStartMonth));
  }, [maxStartMonth, minMonthBound]);

  const canGoPrev = currentMonth.getTime() > minMonthBound.getTime();
  const canGoNext = currentMonth.getTime() < maxStartMonth.getTime();

  const getRecordForDate = (date: Date): AttendanceRecord | undefined => {
    return sortedRecords.find((record) => isSameDay(record.timestamp, date));
  };

  const isRequiredDate = (date: Date): boolean => {
    if (!requirement) return false;
    if (date < requirement.startDate) return false;
    if (requirement.endDate && date > requirement.endDate) return false;

    if (requirement.frequency === "weekly") {
      return getDay(date) === getDay(requirement.startDate);
    }
    if (requirement.frequency === "biweekly") {
      if (getDay(date) !== getDay(requirement.startDate)) return false;
      const weeksDiff = Math.floor(
        (date.getTime() - requirement.startDate.getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      );
      return weeksDiff % 2 === 0;
    }
    return date.getDate() === requirement.startDate.getDate();
  };

  const openMarkDialog = (date: Date) => {
    setSelectedDate(date);
    setSelectedStatus("present");
    setAttendanceNote("");
    setMarkDialogOpen(true);
  };

  const openQuestionDialog = (record: AttendanceRecord, e: MouseEvent) => {
    e.stopPropagation();
    setSelectedRecord(record);
    setQuestionDialogOpen(true);
  };

  const handleMarkAttendance = async () => {
    if (!selectedDate || !onMarkAttendance) return;
    await onMarkAttendance(
      selectedDate,
      selectedStatus,
      attendanceNote.trim() || undefined,
    );
    setMarkDialogOpen(false);
    setAttendanceNote("");
    setSelectedDate(null);
  };

  const handleQuestionAttendance = async () => {
    if (!selectedRecord || !questionReason.trim() || !onQuestionAttendance)
      return;
    await onQuestionAttendance(selectedRecord.id, questionReason.trim());
    setQuestionDialogOpen(false);
    setQuestionReason("");
    setSelectedRecord(null);
  };

  const renderMonth = (monthDate: Date) => {
    const days = getCalendarDays(monthDate);
    return (
      <div key={monthDate.toISOString()}>
        <div className="text-center text-[10px] font-medium text-muted-foreground mb-1">
          {format(monthDate, "MMMM")}
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
            <div
              key={`${monthDate.toISOString()}-${day}-${idx}`}
              className="w-5 h-5 flex items-center justify-center text-[9px] font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day, idx) => {
            const record = getRecordForDate(day);
            const inMonth = isSameMonth(day, monthDate);
            const isToday = isSameDay(day, today);
            const isPast = day < today && !isToday;
            const canMark =
              userRole === "student" &&
              Boolean(onMarkAttendance) &&
              !record &&
              isPast &&
              inMonth;
            const required = isRequiredDate(day);
            const isFirstAttendance =
              firstAttendanceDate !== null &&
              isSameDay(day, firstAttendanceDate);
            const isLastAttendance =
              lastAttendanceDate !== null && isSameDay(day, lastAttendanceDate);

            return (
              <div
                key={`${monthDate.toISOString()}-${day.getTime()}-${idx}`}
                className={[
                  "w-5 h-5 flex items-center justify-center text-[9px] rounded transition-all relative",
                  !inMonth ? "text-muted-foreground/30" : "",
                  isToday ? "ring-1 ring-blue-500 font-semibold" : "",
                  canMark ? "hover:bg-blue-50 cursor-pointer" : "",
                  record ? "cursor-pointer" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  if (canMark) openMarkDialog(day);
                }}
                onMouseEnter={() => {
                  if (record) setHoveredRecord(record);
                }}
                onMouseLeave={() => setHoveredRecord(null)}
              >
                <span
                  className={
                    record ? "text-white relative z-10 font-medium" : ""
                  }
                >
                  {format(day, "d")}
                </span>

                {record && (
                  <div
                    className={[
                      "absolute inset-0 rounded z-0",
                      getStatusColor(record.status, record.isQuestioned),
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                )}

                {record?.isQuestioned && (
                  <AlertCircle className="size-2 text-white absolute top-0 right-0 z-10" />
                )}

                {required && inMonth && !record && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500 z-10" />
                )}

                {isFirstAttendance && (
                  <div className="absolute inset-0 rounded ring-1 ring-sky-500 z-20 pointer-events-none" />
                )}

                {isLastAttendance && (
                  <div className="absolute inset-0 rounded ring-1 ring-violet-600 z-20 pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const firstAttendanceLabel = firstAttendanceDate
    ? format(firstAttendanceDate, "MMM d, yyyy")
    : "Not recorded";
  const lastAttendanceLabel = lastAttendanceDate
    ? format(lastAttendanceDate, "MMM d, yyyy")
    : "Not recorded";

  return (
    <div className="relative h-full">
      <div className="h-full border rounded-md p-2 bg-white shadow-sm">
        <div className="flex h-full gap-2">
          <div className="w-32 shrink-0 rounded border bg-muted/20 p-2">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Legend
            </p>
            <div className="space-y-1 text-[9px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-green-500" />
                <p>Present</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-orange-500" />
                <p>Late</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-red-500" />
                <p>Absent</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-cyan-500" />
                <p>Approved Absence</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-amber-500" />
                <p>Questioned</p>
              </div>
              <div className="flex items-start gap-1.5 pt-1">
                <div className="mt-[1px] size-2 rounded ring-1 ring-sky-500" />
                <p>First: {firstAttendanceLabel}</p>
              </div>
              <div className="flex items-start gap-1.5">
                <div className="mt-[1px] size-2 rounded ring-1 ring-violet-600" />
                <p>Last: {lastAttendanceLabel}</p>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2 px-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                disabled={!canGoPrev}
                onClick={() => {
                  if (!canGoPrev) return;
                  setCurrentMonth((prev) =>
                    clampMonth(
                      subMonths(prev, 1),
                      minMonthBound,
                      maxStartMonth,
                    ),
                  );
                }}
              >
                <ChevronLeft className="size-3" />
              </Button>
              <span className="text-[10px] font-medium">
                {format(currentMonth, "MMM")} -{" "}
                {format(addMonths(currentMonth, 1), "MMM yyyy")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                disabled={!canGoNext}
                onClick={() => {
                  if (!canGoNext) return;
                  setCurrentMonth((prev) =>
                    clampMonth(
                      addMonths(prev, 1),
                      minMonthBound,
                      maxStartMonth,
                    ),
                  );
                }}
              >
                <ChevronRight className="size-3" />
              </Button>
            </div>

            <div className="flex gap-4 mt-0.5">
              {renderMonth(currentMonth)}
              <div className="self-stretch border-l border-dotted border-muted-foreground/40" />
              {renderMonth(addMonths(currentMonth, 1))}
            </div>
          </div>
        </div>
      </div>

      {hoveredRecord && (
        <div className="bg-white border shadow-lg rounded-lg p-3 text-sm absolute z-50 mt-2">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {hoveredRecord.status === "present" && (
                  <CheckCircle2 className="size-4 text-green-600" />
                )}
                {hoveredRecord.status === "absent" && (
                  <XCircle className="size-4 text-red-600" />
                )}
                {hoveredRecord.status === "late" && (
                  <Clock className="size-4 text-orange-600" />
                )}
                <span className="font-medium capitalize">
                  {hoveredRecord.status}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {format(hoveredRecord.timestamp, "EEEE, MMMM d, yyyy")}
              </div>
            </div>
            {userRole === "supervisor" &&
              !hoveredRecord.isQuestioned &&
              onQuestionAttendance && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={(e) => openQuestionDialog(hoveredRecord, e)}
                >
                  <MessageSquare className="size-3.5" />
                </Button>
              )}
          </div>

          {hoveredRecord.note && (
            <p className="text-xs text-muted-foreground mb-2 border-t pt-2">
              {hoveredRecord.note}
            </p>
          )}

          {hoveredRecord.isQuestioned && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs">
              <div className="flex items-start gap-1.5 mb-1">
                <AlertCircle className="size-3 text-amber-700 mt-0.5 shrink-0" />
                <span className="font-medium text-amber-900">
                  Questioned by {hoveredRecord.questionedBy || "supervisor"}
                </span>
              </div>
              <p className="text-amber-800">
                {hoveredRecord.questionedReason || "No reason provided."}
              </p>
            </div>
          )}
        </div>
      )}

      <Dialog open={markDialogOpen} onOpenChange={setMarkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
            <DialogDescription>
              {selectedDate &&
                `Record your attendance for ${format(
                  selectedDate,
                  "EEEE, MMMM d, yyyy",
                )}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Attendance Status</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStatus("present")}
                  className={[
                    "p-4 border-2 rounded-lg transition-all",
                    selectedStatus === "present"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <CheckCircle2 className="size-6 text-green-600 mx-auto mb-2" />
                  <div className="text-sm font-medium">Present</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus("late")}
                  className={[
                    "p-4 border-2 rounded-lg transition-all",
                    selectedStatus === "late"
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <Clock className="size-6 text-orange-600 mx-auto mb-2" />
                  <div className="text-sm font-medium">Late</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus("absent")}
                  className={[
                    "p-4 border-2 rounded-lg transition-all",
                    selectedStatus === "absent"
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-gray-300",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <XCircle className="size-6 text-red-600 mx-auto mb-2" />
                  <div className="text-sm font-medium">Absent</div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendance-note">Notes (Optional)</Label>
              <Textarea
                id="attendance-note"
                placeholder="Add any notes about this attendance..."
                value={attendanceNote}
                onChange={(e) => setAttendanceNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAttendance} disabled={!onMarkAttendance}>
              Mark Attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-amber-600" />
              <DialogTitle>Question Attendance</DialogTitle>
            </div>
            <DialogDescription>
              Raise a question or concern about this attendance record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedRecord && (
              <div className="bg-muted/50 rounded-lg p-3 border">
                <div className="flex items-center gap-2 mb-1">
                  {selectedRecord.status === "present" && (
                    <CheckCircle2 className="size-4 text-green-600" />
                  )}
                  {selectedRecord.status === "absent" && (
                    <XCircle className="size-4 text-red-600" />
                  )}
                  {selectedRecord.status === "late" && (
                    <Clock className="size-4 text-orange-600" />
                  )}
                  <span className="text-sm font-medium capitalize">
                    {selectedRecord.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(selectedRecord.timestamp, "EEEE, MMMM d, yyyy")}
                </p>
                {selectedRecord.note && (
                  <p className="text-sm mt-2">{selectedRecord.note}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="question-reason">Reason for Questioning</Label>
              <Textarea
                id="question-reason"
                placeholder="Explain why you're questioning this attendance record..."
                value={questionReason}
                onChange={(e) => setQuestionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuestionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuestionAttendance}
              disabled={!questionReason.trim() || !onQuestionAttendance}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Question Attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
