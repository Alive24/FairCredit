"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAppKitAccount } from "@reown/appkit/react";
import { useFairCredit } from "@/hooks/use-fair-credit";
import {
  fetchMaybeCourse,
  type Course,
} from "@/lib/solana/generated/accounts/course";
import { getCreateActivityInstructionAsync } from "@/lib/solana/generated/instructions/createActivity";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import { Loader2, Send } from "lucide-react";
import { address as toAddress } from "@solana/kit";
import { getProviderPDA } from "@/lib/solana/pda";
import type {
  ActivityData,
  AddFeedbackData,
  AttendMeetingData,
  SubmitAssignmentData,
} from "@/lib/types/activity-data";
import {
  ACTIVITY_KIND_LABEL,
  ACTIVITY_KIND_TO_ENUM,
  RESOURCE_KIND_LABEL,
  RESOURCE_KIND_OPTIONS,
  RESOURCE_KIND_TO_ENUM,
  type ActivityKindKey,
  type ResourceKindKey,
  activityCreateSchemaByKind,
  parseCsvIdList,
} from "@/lib/activities/activity-form-schema";
import type { ResourceKind } from "@/lib/solana/generated/types/resourceKind";
import {
  canPerformActivityAction,
  getCreateActivityKindsForRole,
  ROLE_INTENT_NOTICE,
} from "@/lib/activities/activity-policy";
import { useUserRole } from "@/hooks/use-user-role";

const rawFormSchema = z.object({
  kind: z.string(),
  moduleId: z.string(),
  title: z.string(),
  description: z.string(),
  evidenceLinks: z.string(),
  content: z.string(),
  assetIds: z.string(),
  evidenceAssetIds: z.string(),
  timestamp: z.string(),
  note: z.string(),
  resourceId: z.string(),
  resourceKind: z.string(),
  progress: z.string(),
  reflection: z.string(),
});

type CreateActivityFormValues = z.infer<typeof rawFormSchema>;

function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseCsvUrlList(value: string): string[] {
  if (!value.trim()) return [];

  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function checkSerializedDataSize(data: string): boolean {
  return new TextEncoder().encode(data).length <= 512;
}

export function CreateActivityForm({
  courseAddress,
  initialModuleId,
  hasAttendanceTracker,
  onSubmitted,
}: {
  courseAddress: string;
  initialModuleId?: string;
  hasAttendanceTracker?: boolean;
  onSubmitted?: () => void | Promise<void>;
}) {
  const { address, isConnected } = useAppKitAccount();
  const { sendTransaction } = useAppKitTransaction();
  const { rpc } = useFairCredit();
  const { toast } = useToast();
  const { role } = useUserRole();

  const canCreate = canPerformActivityAction(role, "create");
  const allowedKinds = useMemo(
    () => getCreateActivityKindsForRole(role),
    [role],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);

  const form = useForm<CreateActivityFormValues>({
    resolver: zodResolver(rawFormSchema),
    defaultValues: {
      kind: "SubmitAssignment",
      moduleId: initialModuleId ?? "",
      title: "",
      description: "",
      evidenceLinks: "",
      content: "",
      assetIds: "",
      evidenceAssetIds: "",
      timestamp: toLocalDatetimeInputValue(new Date()),
      note: "",
      resourceId: "",
      resourceKind: "",
      progress: "",
      reflection: "",
    },
  });

  const selectedKind = (form.watch("kind") || "SubmitAssignment") as ActivityKindKey;

  useEffect(() => {
    fetchMaybeCourse(rpc, toAddress(courseAddress))
      .then((res) => {
        if (res.exists) {
          setCourse(res.data);
        } else {
          setCourse(null);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch course:", err);
        setCourse(null);
      });
  }, [rpc, courseAddress]);

  useEffect(() => {
    if (!allowedKinds.length) return;
    const currentKind = form.getValues("kind");
    if (!allowedKinds.includes(currentKind as ActivityKindKey)) {
      form.setValue("kind", allowedKinds[0], { shouldDirty: true });
    }
  }, [allowedKinds, form]);

  const moduleOptions = useMemo(() => {
    return (
      course?.modules?.map((m: any, index: number) => {
        const id = String(m.resource ?? m.id ?? index);
        const label =
          (m.title as string | undefined) ??
          (m.name as string | undefined) ??
          `${id.slice(0, 8)}…`;
        return { id, label };
      }) ?? []
    );
  }, [course]);

  async function onSubmit(values: CreateActivityFormValues) {
    if (!address || !isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to submit an activity.",
        variant: "destructive",
      });
      return;
    }

    if (!canCreate) {
      toast({
        title: "Action not allowed",
        description: ROLE_INTENT_NOTICE.create,
        variant: "destructive",
      });
      return;
    }

    const kind = values.kind as ActivityKindKey;
    if (kind === "ConsumeResource") {
      toast({
        title: "ConsumeResource disabled",
        description:
          "ConsumeResource is temporarily disabled until contract-side updates are complete.",
        variant: "destructive",
      });
      return;
    }

    if (!allowedKinds.includes(kind)) {
      toast({
        title: "Kind not allowed",
        description: "Your current role cannot create this activity kind.",
        variant: "destructive",
      });
      return;
    }

    if (kind === "AttendMeeting" && hasAttendanceTracker) {
      toast({
        title: "Attendance tracker already exists",
        description:
          "Use the existing attendance activity to add attendance logs instead of creating another one.",
        variant: "destructive",
      });
      return;
    }

    const modules = values.moduleId
      ? [
          {
            module_pubkey: values.moduleId,
          },
        ]
      : [];

    const evidenceLinks = parseCsvUrlList(values.evidenceLinks);
    const assetIds = parseCsvIdList(values.assetIds);
    const evidenceAssetIds = parseCsvIdList(values.evidenceAssetIds);

    const progressNumber = values.progress.trim()
      ? Number(values.progress)
      : undefined;

    const kindSchema = activityCreateSchemaByKind[kind];
    const schemaInputByKind = {
      SubmitAssignment: {
        kind,
        moduleId: values.moduleId,
        title: values.title,
        description: values.description,
        resourceId: values.resourceId || undefined,
        resourceKind: values.resourceKind
          ? (values.resourceKind as ResourceKindKey)
          : undefined,
        evidenceLinks,
      },
      AddFeedback: {
        kind,
        moduleId: values.moduleId,
        content: values.content,
        assetIds,
        evidenceAssetIds,
      },
      AddGrade: {
        kind,
        moduleId: values.moduleId,
        gradeValue: Number.NaN,
        feedback: undefined,
        assetIds,
        evidenceAssetIds,
      },
      AttendMeeting: {
        kind,
        moduleId: values.moduleId,
        timestamp: values.timestamp,
        note: values.note || undefined,
      },
      ConsumeResource: {
        kind,
        moduleId: values.moduleId,
        title: values.title,
        description: values.description,
        resourceId: values.resourceId,
        resourceKind: values.resourceKind as ResourceKindKey,
        progress: progressNumber,
        reflection: values.reflection || undefined,
      },
    } as const;

    const validation = kindSchema.safeParse(schemaInputByKind[kind] as never);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      const path = issue?.path?.[0];
      const fieldName =
        typeof path === "string" && path in values
          ? (path as keyof CreateActivityFormValues)
          : undefined;

      if (fieldName) {
        form.setError(fieldName, { message: issue.message });
      }

      toast({
        title: "Invalid form data",
        description: issue?.message || "Please check the form fields.",
        variant: "destructive",
      });
      return;
    }

    let activityData: ActivityData;
    let resourceIdForInstruction: string | null = null;
    let resourceKindForInstruction: ResourceKind | null = null;

    switch (validation.data.kind) {
      case "SubmitAssignment": {
        const payload: SubmitAssignmentData = {
          kind: "SubmitAssignment",
          title: validation.data.title,
          description: validation.data.description,
          evidenceLinks: validation.data.evidenceLinks,
          resourceId: validation.data.resourceId,
          resourceKind: validation.data.resourceKind,
          modules,
        };
        activityData = payload;
        resourceIdForInstruction = validation.data.resourceId ?? null;
        resourceKindForInstruction = validation.data.resourceKind
          ? RESOURCE_KIND_TO_ENUM[validation.data.resourceKind]
          : null;
        break;
      }
      case "AddFeedback": {
        const payload: AddFeedbackData = {
          kind: "AddFeedback",
          content: validation.data.content,
          assetIds: validation.data.assetIds,
          evidenceAssetIds: validation.data.evidenceAssetIds,
          modules,
        };
        activityData = payload;
        break;
      }
      case "AttendMeeting": {
        const payload: AttendMeetingData = {
          kind: "AttendMeeting",
          timestamp: new Date(validation.data.timestamp).toISOString(),
          note: validation.data.note,
          modules,
        };
        activityData = payload;
        break;
      }
      default: {
        toast({
          title: "Kind not allowed in create flow",
          description: "This kind must be updated on an existing activity.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const coursePubkey = toAddress(courseAddress);
      const courseAccount = await fetchMaybeCourse(rpc, coursePubkey);
      if (!courseAccount.exists) {
        throw new Error("Course not found");
      }

      const providerWalletAddress = courseAccount.data.provider as string;
      const providerPda = await getProviderPDA(providerWalletAddress as any);

      const serializedData = JSON.stringify(activityData);
      if (!checkSerializedDataSize(serializedData)) {
        throw new Error(
          "Activity payload is too large for on-chain storage. Please shorten your content.",
        );
      }

      const ix = await getCreateActivityInstructionAsync({
        activity: undefined,
        student: createPlaceholderSigner(address),
        provider: providerPda,
        hub: undefined,
        systemProgram: undefined,
        creationTimestamp: BigInt(Math.floor(Date.now() / 1000)),
        kind: ACTIVITY_KIND_TO_ENUM[kind],
        data: serializedData,
        degreeId: null,
        course: coursePubkey,
        resourceId: resourceIdForInstruction,
        resourceKind: resourceKindForInstruction,
      });

      await sendTransaction([ix]);

      toast({
        title: "Activity Submitted",
        description: "Your activity has been logged successfully.",
      });

      form.reset({
        ...form.getValues(),
        title: "",
        description: "",
        evidenceLinks: "",
        content: "",
        assetIds: "",
        evidenceAssetIds: "",
        note: "",
        resourceId: "",
        resourceKind: "",
        progress: "",
        reflection: "",
      });

      if (onSubmitted) {
        await onSubmitted();
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const fillTestData = () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0].substring(0, 5);

    const kind = form.getValues("kind") as ActivityKindKey;

    if (kind === "SubmitAssignment") {
      form.setValue("title", `[${dateStr} ${timeStr}] Assignment Progress`, {
        shouldDirty: true,
      });
      form.setValue(
        "description",
        "Completed coursework and prepared assignment materials for review.",
        { shouldDirty: true },
      );
      form.setValue("evidenceLinks", "https://example.com/evidence", {
        shouldDirty: true,
      });
    }

    if (kind === "AddFeedback") {
      form.setValue("content", "Great session, clear explanations and support.", {
        shouldDirty: true,
      });
      form.setValue("assetIds", "asset_1,asset_2", { shouldDirty: true });
      form.setValue("evidenceAssetIds", "evidence_1", { shouldDirty: true });
    }

    if (kind === "AttendMeeting") {
      form.setValue("timestamp", toLocalDatetimeInputValue(new Date()), {
        shouldDirty: true,
      });
      form.setValue("note", "Weekly sync attended with supervisor.", {
        shouldDirty: true,
      });
    }

    if (!form.getValues("moduleId") && moduleOptions.length > 0) {
      form.setValue("moduleId", moduleOptions[0].id, { shouldDirty: true });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fillTestData}
            disabled={isSubmitting}
          >
            Fill Test Data
          </Button>
          {!canCreate && (
            <p className="text-xs text-destructive text-right">
              {ROLE_INTENT_NOTICE.create}
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity Kind</FormLabel>
              <FormControl>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...field}
                >
                  {allowedKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {ACTIVITY_KIND_LABEL[kind]}
                    </option>
                  ))}
                  {allowedKinds.length === 0 && (
                    <option value="SubmitAssignment">Submit Assignment</option>
                  )}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="moduleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Related Module (Optional)</FormLabel>
              <FormControl>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...field}
                >
                  <option value="">Select a module...</option>
                  {moduleOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedKind === "SubmitAssignment" && (
          <>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Activity title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you did..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {selectedKind === "SubmitAssignment" && (
          <>
            <FormField
              control={form.control}
              name="resourceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource ID (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="resource-identifier" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="resourceKind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource Kind (Optional)</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      {...field}
                    >
                      <option value="">Select resource kind...</option>
                      {RESOURCE_KIND_OPTIONS.map((kind) => (
                        <option key={kind} value={kind}>
                          {RESOURCE_KIND_LABEL[kind]}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="evidenceLinks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Evidence Links (comma or newline separated)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="https://example.com/evidence-1"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {selectedKind === "AddFeedback" && (
          <>
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your feedback..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assetIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset IDs (comma separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="asset_1,asset_2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="evidenceAssetIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Evidence Asset IDs (comma separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="evidence_1,evidence_2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {selectedKind === "AttendMeeting" && (
          <>
            <FormField
              control={form.control}
              name="timestamp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Timestamp</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional meeting notes..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || !canCreate}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Activity
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
