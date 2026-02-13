"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wand2, Loader2 } from "lucide-react";
import {
  NostrPendingEvent,
  NostrStoragePanel,
} from "@/components/nostr-storage-panel";
import { ResourceFieldsEditor } from "@/components/resource-fields-editor";
import { ModuleResourceRichContentSection } from "@/components/module-resource-rich-content-section";
import { ModuleResourceDebugInfo } from "@/components/module-resource-debug-info";
import { useToast } from "@/hooks/use-toast";
import { address, some } from "@solana/kit";
import type { Provider } from "@reown/appkit-adapter-solana/react";
import {
  buildResourceDTag,
  publishResourceEvent,
  fetchResourceEvent,
} from "@/lib/nostr/client";
import { getAddResourceInstructionAsync } from "@/lib/solana/generated/instructions/addResource";
import { getAddCourseModuleInstructionAsync } from "@/lib/solana/generated/instructions/addCourseModule";
import { getUpdateCourseModuleInstructionAsync } from "@/lib/solana/generated/instructions/updateCourseModule";
import { getUpdateResourceDataInstruction } from "@/lib/solana/generated/instructions/updateResourceData";
import { getSetResourceNostrRefInstruction } from "@/lib/solana/generated/instructions/setResourceNostrRef";
import { getCloseResourceInstruction } from "@/lib/solana/generated/instructions/closeResource";
import { getRemoveCourseModuleInstructionAsync } from "@/lib/solana/generated/instructions/removeCourseModule";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { ResourceKind } from "@/lib/solana/generated/types/resourceKind";
import { nip19 } from "nostr-tools";
import {
  parseModuleRichData,
  serializeModuleRichData,
  type ModuleDefaultActivityTemplateKind,
} from "@/lib/resource-nostr-content";
import {
  buildDefaultActivityDraftMap,
  buildDefaultActivityTemplates,
  buildModuleRichSignature,
  hexToBytes,
  type DefaultActivityTemplateDraft,
  type DefaultActivityTemplateDraftMap,
} from "@/components/module-resource-editor-helpers";

export type ModuleResourceEditorProps = {
  courseAddress: string;
  walletAddress: string;
  walletProvider: Provider | undefined;
  isConnected: boolean;
  isSending: boolean;
  sendTransaction: (instructions: any[]) => Promise<string>;
  onSuccess?: (result?: { deleted?: string }) => void;
  onCancel?: () => void;
  totalWeight: number;
  initialData?: {
    resourceAddress: string;
    name: string;
    kind: ResourceKind;
    externalId: string;
    workload: string;
    tags: string[];
    content: string;
    percentage: number;
    isExternal: boolean;
    nostrDTag?: string;
    nostrAuthorPubkey?: string;
  };
  debugResource?: any;
  mode: "create" | "edit";
};

export function ModuleResourceEditor({
  courseAddress,
  walletAddress,
  walletProvider,
  isConnected,
  isSending,
  sendTransaction,
  onSuccess,
  onCancel,
  totalWeight,
  initialData,
  debugResource,
  mode,
}: ModuleResourceEditorProps) {
  const { toast } = useToast();
  const initialRich = parseModuleRichData(initialData?.content ?? "");

  // Resource fields
  const [resourceName, setResourceName] = useState(initialData?.name || "");
  const [resourceKind, setResourceKind] = useState(initialData?.kind || 0);
  const [resourceExternalId, setResourceExternalId] = useState(
    initialData?.externalId || "",
  );
  const [resourceWorkload, setResourceWorkload] = useState(
    initialData?.workload || "",
  );
  const [resourceTags, setResourceTags] = useState<string[]>(
    (initialData?.tags || []).filter(
      (tag) => !tag.startsWith("default_activity:"),
    ),
  );
  const [resourceTagInput, setResourceTagInput] = useState("");
  const [resourceContent, setResourceContent] = useState(
    initialRich.content || "",
  );
  const [moduleGuidance, setModuleGuidance] = useState(
    initialRich.guidance || "",
  );
  const [moduleMaterialsContent, setModuleMaterialsContent] = useState(
    initialRich.materialsRich || "",
  );
  const [defaultActivityDrafts, setDefaultActivityDrafts] =
    useState<DefaultActivityTemplateDraftMap>(
      buildDefaultActivityDraftMap(initialRich.defaultActivities),
    );
  const [loadedModuleRichSignature, setLoadedModuleRichSignature] = useState(
    buildModuleRichSignature({
      content: initialRich.content || "",
      guidance: initialRich.guidance || "",
      materialsRich: initialRich.materialsRich || "",
      defaultActivityDrafts: buildDefaultActivityDraftMap(
        initialRich.defaultActivities,
      ),
    }),
  );

  // Module weight
  const [modulePercentage, setModulePercentage] = useState(
    initialData?.percentage?.toString() || "10",
  );

  // Nostr state
  const [nostrStatus, setNostrStatus] = useState<
    "idle" | "publishing" | "published" | "error"
  >(
    initialData?.nostrDTag
      ? initialData.content
        ? "published"
        : "idle"
      : "idle",
  );
  const [nostrError, setNostrError] = useState<string | null>(null);
  const [nostrPending, setNostrPending] = useState<NostrPendingEvent | null>(
    initialData?.nostrDTag
      ? {
          dTag: initialData.nostrDTag,
          authorPubkey: initialData.nostrAuthorPubkey || "",
          neventId: null,
          verifyUrl: null,
        }
      : null,
  );

  const [parsedNeventId, setParsedNeventId] = useState<string | null>(null);

  // Draft state
  const [draftAddress, setDraftAddress] = useState<string | null>(
    initialData?.resourceAddress || null,
  );
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);

  // Loading state
  const [busy, setBusy] = useState<
    null | "publishing" | "creating" | "saving" | "loading"
  >(null);

  const isExternal = initialData?.isExternal || false;

  useEffect(() => {
    const parsed = parseModuleRichData(initialData?.content ?? "");
    const nextDrafts = buildDefaultActivityDraftMap(parsed.defaultActivities);

    setResourceName(initialData?.name || "");
    setResourceKind(initialData?.kind || 0);
    setResourceExternalId(initialData?.externalId || "");
    setResourceWorkload(initialData?.workload || "");
    setResourceTags(
      (initialData?.tags || []).filter(
        (tag) => !tag.startsWith("default_activity:"),
      ),
    );
    setResourceTagInput("");
    setResourceContent(parsed.content || "");
    setModuleGuidance(parsed.guidance || "");
    setModuleMaterialsContent(parsed.materialsRich || "");
    setDefaultActivityDrafts(nextDrafts);
    setLoadedModuleRichSignature(
      buildModuleRichSignature({
        content: parsed.content || "",
        guidance: parsed.guidance || "",
        materialsRich: parsed.materialsRich || "",
        defaultActivityDrafts: nextDrafts,
      }),
    );
    setModulePercentage(initialData?.percentage?.toString() || "10");
    setNostrError(null);
    setNostrPending(
      initialData?.nostrDTag
        ? {
            dTag: initialData.nostrDTag,
            authorPubkey: initialData.nostrAuthorPubkey || "",
            neventId: null,
            verifyUrl: null,
          }
        : null,
    );
    setNostrStatus(
      initialData?.nostrDTag
        ? initialData.content
          ? "published"
          : "idle"
        : "idle",
    );
    setParsedNeventId(null);
    setDraftAddress(initialData?.resourceAddress || null);
    setDraftTimestamp(null);
  }, [initialData, mode]);

  useEffect(() => {
    if (
      mode === "edit" &&
      initialData?.nostrDTag &&
      initialData?.nostrAuthorPubkey
    ) {
      setBusy("loading");
      // Only fetch if content is missing
      if (!initialData.content) {
        setNostrStatus("idle");
        fetchResourceEvent(initialData.nostrAuthorPubkey, initialData.nostrDTag)
          .then((event) => {
            if (event) {
              const moduleRich = parseModuleRichData(event.content);
              const nextDrafts = buildDefaultActivityDraftMap(
                moduleRich.defaultActivities,
              );
              setResourceContent(moduleRich.content);
              setModuleGuidance(moduleRich.guidance);
              setModuleMaterialsContent(moduleRich.materialsRich || "");
              setDefaultActivityDrafts(nextDrafts);
              setLoadedModuleRichSignature(
                buildModuleRichSignature({
                  content: moduleRich.content,
                  guidance: moduleRich.guidance,
                  materialsRich: moduleRich.materialsRich || "",
                  defaultActivityDrafts: nextDrafts,
                }),
              );
              setNostrStatus("published");
              setNostrPending((prev) =>
                prev ? { ...prev, eventId: event.id } : null,
              );
              try {
                const nevent = nip19.neventEncode({
                  id: event.id,
                  author: event.pubkey,
                  kind: event.kind,
                });
                setParsedNeventId(nevent);
              } catch {
                // best effort only
              }
            }
          })
          .catch((e) => {
            console.error("Fetch nostr failed", e);
          })
          .finally(() => setBusy(null));
      } else {
        setBusy(null);
      }
    }
  }, [mode, initialData]);

  const handleTagInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = resourceTagInput.trim();
        if (trimmed && !resourceTags.includes(trimmed)) {
          setResourceTags([...resourceTags, trimmed]);
          setResourceTagInput("");
        }
      }
    },
    [resourceTagInput, resourceTags],
  );

  const publishEventHelper = async () => {
    if (!walletAddress || !isConnected) throw new Error("Wallet not connected");
    const guidance = moduleGuidance.trim() || resourceName.trim();

    let targetAddress = draftAddress;
    let targetTimestamp = draftTimestamp;

    if (mode === "create" && (!targetAddress || !targetTimestamp)) {
      const creationTimestamp = Math.floor(Date.now() / 1000);
      const signer = createPlaceholderSigner(walletAddress);
      const ix = await getAddResourceInstructionAsync({
        course: address(courseAddress),
        providerAuthority: signer,
        creationTimestamp,
        kind: resourceKind,
        name: resourceName,
        externalId: resourceExternalId.trim() || null,
        workload:
          resourceWorkload.trim() === ""
            ? null
            : Number(resourceWorkload.trim()),
        tags: resourceTags,
        nostrDTag: "",
        nostrAuthorPubkey: new Uint8Array(32),
      });
      targetAddress = String(ix.accounts[0].address);
      targetTimestamp = creationTimestamp;
      setDraftAddress(targetAddress);
      setDraftTimestamp(targetTimestamp);
    } else if (mode === "edit" && !targetTimestamp) {
      targetTimestamp = Math.floor(Date.now() / 1000);
    }

    let dTag = nostrPending?.dTag;
    if (!dTag) {
      if (mode === "create" && targetAddress && targetTimestamp) {
        dTag = buildResourceDTag({
          resourcePubkey: address(targetAddress),
          created: targetTimestamp,
        });
      } else {
        dTag = `resource-${Date.now()}`;
      }
    }

    if (!targetAddress) {
      throw new Error("Resource address could not be resolved.");
    }

    const defaultActivities = buildDefaultActivityTemplates(defaultActivityDrafts);

    const serialized = serializeModuleRichData({
      resourceAddress: targetAddress,
      created: targetTimestamp ?? Math.floor(Date.now() / 1000),
      content: resourceContent.trim(),
      guidance,
      materials: [],
      materialsRich: moduleMaterialsContent,
      defaultActivities,
      metadata: {
        kind: ResourceKind[resourceKind],
        name: resourceName,
        externalId: resourceExternalId.trim() || null,
        workload:
          resourceWorkload.trim() === ""
            ? null
            : Number(resourceWorkload.trim()),
        tags: resourceTags,
        course: courseAddress,
      },
    });

    const published = await publishResourceEvent({
      dTag,
      content: serialized,
      walletAddress,
      signMessage: walletProvider?.signMessage
        ? async (message: Uint8Array) => {
            if (!walletProvider.signMessage)
              throw new Error("Sign message not available");
            const result = await walletProvider.signMessage(message);

            if (result instanceof Uint8Array) return result;

            if (
              typeof result === "object" &&
              result !== null &&
              "signature" in result
            ) {
              const sig = (result as any).signature;
              if (sig instanceof Uint8Array) return sig;
              if (Array.isArray(sig)) return new Uint8Array(sig);
              if (typeof sig === "string") {
                try {
                  return hexToBytes(sig);
                } catch {
                  throw new Error("Unknown signature format (string)");
                }
              }
            }

            if (Array.isArray(result)) return new Uint8Array(result);
            if (typeof result === "object" && "length" in (result as any)) {
              return new Uint8Array(result as any);
            }

            throw new Error("Unknown signature format returned by wallet");
          }
        : undefined,
    });

    return { ...published, dTag };
  };

  const handlePublishToNostr = useCallback(async () => {
    setBusy("publishing");
    setNostrStatus("publishing");
    setNostrError(null);
    try {
      const result = await publishEventHelper();
      setNostrPending({
        dTag: result.dTag,
        authorPubkey: result.authorPubkey,
        neventId: result.neventId,
        verifyUrl: result.verifyUrl,
      });
      setNostrStatus("published");
      setLoadedModuleRichSignature(
        buildModuleRichSignature({
          content: resourceContent,
          guidance: moduleGuidance,
          materialsRich: moduleMaterialsContent,
          defaultActivityDrafts,
        }),
      );
      toast({ title: "Published to Nostr", description: "Event published." });
    } catch (e) {
      console.error("Publish failed:", e);
      setNostrStatus("error");
      setNostrError(e instanceof Error ? e.message : String(e));
      toast({
        title: "Publish failed",
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }, [
    defaultActivityDrafts,
    moduleGuidance,
    moduleMaterialsContent,
    publishEventHelper,
    resourceContent,
    toast,
  ]);

  const handleSave = useCallback(async () => {
    if (!isConnected || !walletAddress) {
      toast({ title: "Wallet not connected", variant: "destructive" });
      return;
    }

    setBusy("saving");
    try {
      const signer = createPlaceholderSigner(walletAddress);
      const instructions = [];
      let currentPending = nostrPending;
      let nostrPublishedInSave = false;

      const moduleRichSignature = buildModuleRichSignature({
        content: resourceContent,
        guidance: moduleGuidance,
        materialsRich: moduleMaterialsContent,
        defaultActivityDrafts,
      });
      const requiresNostrPublish =
        !isExternal &&
        (mode === "create" ||
          moduleRichSignature !== loadedModuleRichSignature ||
          !initialData?.nostrDTag ||
          !initialData?.nostrAuthorPubkey);

      if (requiresNostrPublish) {
        toast({ title: "Publishing module content..." });
        const result = await publishEventHelper();
        currentPending = {
          dTag: result.dTag,
          authorPubkey: result.authorPubkey,
          neventId: result.neventId,
          verifyUrl: result.verifyUrl,
        };
        setNostrPending(currentPending);
        setNostrStatus("published");
        setLoadedModuleRichSignature(moduleRichSignature);
        nostrPublishedInSave = true;
      }

      if (mode === "create") {
        if (!currentPending) {
          throw new Error("Nostr event missing after publish.");
        }

        const nostrAuthorBytes = hexToBytes(currentPending.authorPubkey);
        const workloadParsed =
          resourceWorkload.trim() === ""
            ? null
            : Number(resourceWorkload.trim());

        const createIx = await getAddResourceInstructionAsync({
          course: address(courseAddress),
          providerAuthority: signer,
          creationTimestamp: draftTimestamp || Math.floor(Date.now() / 1000),
          kind: resourceKind,
          name: resourceName,
          externalId: resourceExternalId.trim() || null,
          workload: workloadParsed,
          tags: resourceTags,
          nostrDTag: some(currentPending.dTag),
          nostrAuthorPubkey: some(nostrAuthorBytes),
        });

        const createdAddress = String(createIx.accounts[0].address);
        const setRefIx = getSetResourceNostrRefInstruction({
          resource: address(createdAddress),
          authority: signer,
          nostrDTag: currentPending.dTag,
          nostrAuthorPubkey: nostrAuthorBytes,
          force: true,
        });

        const percentageParsed = Number(modulePercentage);
        if (!Number.isFinite(percentageParsed) || percentageParsed <= 0) {
          throw new Error("Invalid weight");
        }

        const addModuleIx = await getAddCourseModuleInstructionAsync({
          course: address(courseAddress),
          resource: address(createdAddress),
          providerAuthority: signer,
          percentage: percentageParsed,
        });

        instructions.push(createIx, setRefIx, addModuleIx);
      } else {
        if (!initialData) {
          throw new Error("Missing module data for edit mode.");
        }

        if (!isExternal) {
          const workloadParsed =
            resourceWorkload.trim() === ""
              ? null
              : Number(resourceWorkload.trim());
          const initialTags = (initialData.tags || []).filter(
            (tag) => !tag.startsWith("default_activity:"),
          );

          if (
            resourceName !== initialData.name ||
            Number(resourceWorkload) !== Number(initialData.workload) ||
            JSON.stringify(resourceTags) !== JSON.stringify(initialTags)
          ) {
            const ix = getUpdateResourceDataInstruction({
              resource: address(initialData.resourceAddress),
              authority: signer,
              name: resourceName !== initialData.name ? resourceName : null,
              workload:
                Number(resourceWorkload) !== Number(initialData.workload)
                  ? workloadParsed
                  : null,
              tags:
                JSON.stringify(resourceTags) !== JSON.stringify(initialTags)
                  ? resourceTags
                  : null,
            });
            instructions.push(ix);
          }

          if (currentPending) {
            const currentAuthor = currentPending.authorPubkey.toLowerCase();
            const initialAuthor = (
              initialData.nostrAuthorPubkey || ""
            ).toLowerCase();
            if (
              currentPending.dTag !== initialData.nostrDTag ||
              currentAuthor !== initialAuthor
            ) {
              const nostrAuthorBytes = hexToBytes(currentPending.authorPubkey);
              const setRefIx = getSetResourceNostrRefInstruction({
                resource: address(initialData.resourceAddress),
                authority: signer,
                nostrDTag: currentPending.dTag,
                nostrAuthorPubkey: nostrAuthorBytes,
                force: true,
              });
              instructions.push(setRefIx);
            }
          }
        }

        const newPercentage = Number(modulePercentage);
        if (!Number.isFinite(newPercentage) || newPercentage < 0) {
          throw new Error("Module weight must be a non-negative number.");
        }
        if (newPercentage !== initialData.percentage) {
          const updateModuleIx = await getUpdateCourseModuleInstructionAsync({
            course: address(courseAddress),
            resource: address(initialData.resourceAddress),
            providerAuthority: signer,
            percentage: newPercentage,
          });
          instructions.push(updateModuleIx);
        }
      }

      if (instructions.length > 0) {
        await sendTransaction(instructions);
      }

      if (instructions.length > 0 || nostrPublishedInSave) {
        toast({
          title: mode === "create" ? "Module created" : "Module updated",
        });
        onSuccess?.();
        onCancel?.();
        return;
      }

      onCancel?.();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Operation failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }, [
    mode,
    isConnected,
    walletAddress,
    courseAddress,
    resourceKind,
    resourceName,
    resourceExternalId,
    resourceWorkload,
    resourceTags,
    modulePercentage,
    nostrPending,
    draftTimestamp,
    initialData,
    isExternal,
    sendTransaction,
    toast,
    onSuccess,
    onCancel,
    publishEventHelper,
    resourceContent,
    moduleGuidance,
    moduleMaterialsContent,
    defaultActivityDrafts,
    loadedModuleRichSignature,
  ]);

  const updateDefaultActivityDraft = useCallback(
    (
      kind: ModuleDefaultActivityTemplateKind,
      patch: Partial<DefaultActivityTemplateDraft>,
    ) => {
      setDefaultActivityDrafts((prev) => ({
        ...prev,
        [kind]: {
          ...prev[kind],
          ...patch,
        },
      }));
    },
    [],
  );

  const fillTestData = () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0].substring(0, 5);
    const newName = `[${dateStr} ${timeStr}] Test Module`;
    setResourceName(newName);
    setResourceKind(ResourceKind.General);
    setResourceExternalId(`vid-${Math.floor(Math.random() * 100000)}`);
    setResourceWorkload("60");
    setResourceTags(["test", "auto"]);
    setModuleMaterialsContent(
      "<ul><li>React Hooks Guide</li><li>State Patterns Slides</li><li>Performance Checklist</li></ul>",
    );
    setModuleGuidance(
      "<p>Complete the module assignment with functional components and hooks. Focus on clarity and performance.</p>",
    );
    setResourceContent(
      `# Module Detail ${dateStr} ${timeStr}\n\nUse this section for detailed module references and examples.`,
    );
    setDefaultActivityDrafts({
      AttendMeeting: {
        enabled: true,
        title: "Attendance Tracker",
        description: "Track attendance milestones for this module.",
        requiredAttendance: "3",
        requiredEvidenceCount: "",
        requiredFeedbackEntries: "",
      },
      AddFeedback: {
        enabled: true,
        title: "Reflection Feedback",
        description: "Add reflective feedback after each major checkpoint.",
        requiredAttendance: "",
        requiredEvidenceCount: "",
        requiredFeedbackEntries: "2",
      },
      SubmitAssignment: {
        enabled: true,
        title: "Final Submission",
        description: "Submit assignment evidence for the module outcome.",
        requiredAttendance: "",
        requiredEvidenceCount: "1",
        requiredFeedbackEntries: "",
      },
    });
    setModulePercentage("10");
  };

  const handleDelete = useCallback(async () => {
    if (!walletProvider || !walletAddress || !initialData || mode !== "edit")
      return;

    if (
      !confirm(
        "Are you sure you want to delete this resource? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const signer = createPlaceholderSigner(walletAddress);

      const closeIx = getCloseResourceInstruction({
        resource: address(initialData.resourceAddress),
        authority: signer,
      });

      const removeModuleIx = await getRemoveCourseModuleInstructionAsync({
        course: address(courseAddress),
        providerAuthority: signer,
        resource: address(initialData.resourceAddress),
      });

      await sendTransaction([closeIx, removeModuleIx]);
      toast({
        title: "Resource deleted",
        description: "The resource and module have been removed.",
      });
      onSuccess?.({ deleted: initialData.resourceAddress });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to delete resource",
        variant: "destructive",
      });
    }
  }, [
    walletProvider,
    walletAddress,
    initialData,
    mode,
    courseAddress,
    sendTransaction,
    onSuccess,
    toast,
  ]);

  const formDisabled = !isConnected || isSending || busy !== null;

  return (
    <div className="space-y-6">
      {mode === "create" && !initialData && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fillTestData}
            disabled={formDisabled}
          >
            <Wand2 className="h-4 w-4 mr-2" /> Fill Test Data
          </Button>
        </div>
      )}

      <ResourceFieldsEditor
        name={resourceName}
        onNameChange={setResourceName}
        kind={resourceKind}
        onKindChange={setResourceKind}
        externalId={resourceExternalId}
        onExternalIdChange={setResourceExternalId}
        workload={resourceWorkload}
        onWorkloadChange={setResourceWorkload}
        tags={resourceTags}
        onTagsChange={setResourceTags}
        tagInput={resourceTagInput}
        onTagInputChange={setResourceTagInput}
        onTagInputKeyDown={handleTagInputKeyDown}
        disabled={formDisabled || isExternal || (mode === "edit" && isExternal)}
      />

      <ModuleResourceRichContentSection
        formDisabled={formDisabled}
        isExternal={isExternal}
        moduleMaterialsContent={moduleMaterialsContent}
        onModuleMaterialsContentChange={setModuleMaterialsContent}
        moduleGuidance={moduleGuidance}
        onModuleGuidanceChange={setModuleGuidance}
        resourceContent={resourceContent}
        onResourceContentChange={setResourceContent}
        defaultActivityDrafts={defaultActivityDrafts}
        onDefaultActivityDraftChange={updateDefaultActivityDraft}
      />

      <div className="space-y-2">
        <Label>Module Weight (%)</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={modulePercentage}
          onChange={(e) => setModulePercentage(e.target.value)}
          disabled={formDisabled}
        />
      </div>

      {!isExternal && (
        <NostrStoragePanel
          status={nostrStatus}
          dTag={nostrPending?.dTag}
          authorPubkey={nostrPending?.authorPubkey}
          neventId={nostrPending?.neventId || parsedNeventId}
          verifyUrl={
            nostrPending?.verifyUrl || `https://njump.me/${parsedNeventId}`
          }
          error={nostrError}
          onPublish={handlePublishToNostr}
          publishLabel="Publish now (optional)"
          publishDisabled={formDisabled}
          footer={
            <p className="text-xs text-muted-foreground">
              Save Changes automatically publishes module rich content to Nostr.
            </p>
          }
          defaultOpen={nostrStatus !== "idle" && nostrStatus !== "published"}
        />
      )}

      {mode === "edit" && (
        <details className="mt-6 border-t pt-4 group">
          <summary className="text-destructive font-semibold cursor-pointer mb-4 select-none">
            Danger Zone
          </summary>
          <div className="bg-destructive/10 p-4 rounded-md flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div>
              <h4 className="font-medium text-destructive">Delete Resource</h4>
              <p className="text-sm text-muted-foreground">
                Permanently close the resource account. User will see "Resource
                Missing" in the course.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={formDisabled}
            >
              Delete Resource
            </Button>
          </div>
        </details>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={busy !== null}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={formDisabled}>
          {busy === "saving" ? (
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
          ) : null}
          {mode === "create" ? "Create Module" : "Save Changes"}
        </Button>
      </div>

      <ModuleResourceDebugInfo
        mode={mode}
        nostrStatus={nostrStatus}
        nostrPending={nostrPending}
        initialData={initialData}
        moduleGuidance={moduleGuidance}
        moduleMaterialsContent={moduleMaterialsContent}
        defaultActivityDrafts={defaultActivityDrafts}
        loadedModuleRichSignature={loadedModuleRichSignature}
        debugResource={debugResource}
      />
    </div>
  );
}
