"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/markdown-editor";
import { Wand2, Loader2, Upload } from "lucide-react";
import {
  NostrPendingEvent,
  NostrStoragePanel,
} from "@/components/nostr-storage-panel";
import { ResourceFieldsEditor } from "@/components/resource-fields-editor";
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
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { ResourceKind } from "@/lib/solana/generated/types/resourceKind";
import { nip19 } from "nostr-tools";

export type ModuleResourceEditorProps = {
  courseAddress: string;
  walletAddress: string;
  walletProvider: Provider | undefined;
  isConnected: boolean;
  isSending: boolean;
  sendTransaction: (instructions: any[]) => Promise<string>;
  onSuccess?: () => void;
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

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.trim().toLowerCase();
  if (normalized.length % 2 !== 0) {
    if (normalized.length === 64) {
      // It's fine
    } else {
      console.warn("Invalid hex length", normalized.length);
    }
  }
  if (normalized.length % 2 !== 0) throw new Error("Invalid hex string");

  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array | number[] | any): string {
  if (!bytes) return "";
  if (
    bytes instanceof Uint8Array ||
    Array.isArray(bytes) ||
    (typeof bytes === "object" && bytes !== null && "length" in bytes)
  ) {
    return Array.from(bytes as ArrayLike<number>)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return "";
}

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
    initialData?.tags || [],
  );
  const [resourceTagInput, setResourceTagInput] = useState("");
  const [resourceContent, setResourceContent] = useState(
    initialData?.content || "",
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
          neventId: null, // We don't have event ID unless fetched
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
              setResourceContent(event.content);
              setNostrStatus("published");
              setNostrPending((prev) =>
                prev ? { ...prev, eventId: event.id } : null,
              );
              // Also update parsed NEVENT if possible
              try {
                const nevent = nip19.neventEncode({
                  id: event.id,
                  author: event.pubkey,
                  kind: event.kind,
                });
                setParsedNeventId(nevent);
              } catch (e) {}
            }
          })
          .catch((e) => {
            console.error("Fetch nostr failed", e);
          })
          .finally(() => setBusy(null));
      } else {
        // Content provided (e.g. from parent?) - unlikely based on current parent logic
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
    if (!resourceContent.trim()) throw new Error("Content required");

    let targetAddress = draftAddress;
    let targetTimestamp = draftTimestamp;

    // If create mode and no draft, derive address
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
        // Fallback or edit mode without existing dTag (unlikely if published)
        dTag = `resource-${Date.now()}`;
      }
    }

    const published = await publishResourceEvent({
      dTag,
      content: resourceContent,
      walletAddress,
      signMessage: walletProvider?.signMessage
        ? async (message: Uint8Array) => {
            if (!walletProvider.signMessage)
              throw new Error("Sign message not available");
            const result = await walletProvider.signMessage(message);

            console.log("signMessage result:", result);

            if (result instanceof Uint8Array) return result;

            // Handle { signature: Uint8Array }
            if (
              typeof result === "object" &&
              result !== null &&
              "signature" in result
            ) {
              const sig = (result as any).signature;
              if (sig instanceof Uint8Array) return sig;
              if (Array.isArray(sig)) return new Uint8Array(sig);
              // If base58 string in signature?
              if (typeof sig === "string") {
                // Import bs58 if needed or fail
                // Assuming hex?
                try {
                  return hexToBytes(sig);
                } catch {
                  throw new Error("Unknown signature format (string)");
                }
              }
            }

            // Handle array-like
            if (Array.isArray(result)) return new Uint8Array(result);
            if (typeof result === "object" && "length" in (result as any))
              return new Uint8Array(result as any);

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
      toast({ title: "Published to Nostr", description: `Event published.` });
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
  }, [publishEventHelper, toast]);

  const handleSave = useCallback(async () => {
    if (!isConnected || !walletAddress) {
      toast({ title: "Wallet not connected", variant: "destructive" });
      return;
    }

    setBusy("saving");
    try {
      const signer = createPlaceholderSigner(walletAddress);
      const instructions = [];

      if (mode === "create") {
        // ... create logic ...
        let currentPending = nostrPending;
        let currentStatus = nostrStatus;

        if (currentStatus !== "published") {
          try {
            toast({ title: "Auto-publishing..." });
            const result = await publishEventHelper();
            currentPending = {
              dTag: result.dTag,
              authorPubkey: result.authorPubkey,
              neventId: result.neventId,
              verifyUrl: result.verifyUrl,
            };
            setNostrPending(currentPending);
            setNostrStatus("published");
            currentStatus = "published";
          } catch (e) {
            toast({
              title: "Auto-publish failed",
              description: String(e),
              variant: "destructive",
            });
            setBusy(null);
            return;
          }
        }

        if (!currentPending) throw new Error("Nostr event missing");

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
          force: true, // Force to ensure it sets even if logic thinks it is set (though it is not)
        });

        const percentageParsed = Number(modulePercentage);
        if (!Number.isFinite(percentageParsed) || percentageParsed <= 0)
          throw new Error("Invalid weight");

        const addModuleIx = await getAddCourseModuleInstructionAsync({
          course: address(courseAddress),
          resource: address(createdAddress),
          providerAuthority: signer,
          percentage: percentageParsed,
        });

        instructions.push(createIx, setRefIx, addModuleIx);
      } else {
        // Edit Mode
        if (!isExternal) {
          const workloadParsed =
            resourceWorkload.trim() === ""
              ? null
              : Number(resourceWorkload.trim());

          if (
            resourceName !== initialData?.name ||
            Number(resourceWorkload) !== Number(initialData?.workload) ||
            JSON.stringify(resourceTags) !== JSON.stringify(initialData?.tags)
          ) {
            const ix = getUpdateResourceDataInstruction({
              resource: address(initialData!.resourceAddress),
              authority: signer,
              name: resourceName !== initialData?.name ? resourceName : null,
              workload:
                Number(resourceWorkload) !== Number(initialData?.workload)
                  ? workloadParsed
                  : null,
              tags:
                JSON.stringify(resourceTags) !==
                JSON.stringify(initialData?.tags)
                  ? resourceTags
                  : null,
            });
            instructions.push(ix);
          }

          if (
            nostrPending &&
            (nostrPending.neventId !== initialData?.nostrDTag /* loose */ ||
              nostrStatus === "published")
          ) {
            if (nostrPending.dTag !== initialData?.nostrDTag) {
              const nostrAuthorBytes = hexToBytes(nostrPending.authorPubkey);
              const setRefIx = getSetResourceNostrRefInstruction({
                resource: address(initialData!.resourceAddress),
                authority: signer,
                nostrDTag: nostrPending.dTag,
                nostrAuthorPubkey: nostrAuthorBytes,
                force: true,
              });
              instructions.push(setRefIx);
            } else if (
              nostrStatus === "published" &&
              nostrPending.dTag === initialData?.nostrDTag
            ) {
            }
          }
        }

        const newPercentage = Number(modulePercentage);
        if (newPercentage !== initialData?.percentage) {
          const updateModuleIx = await getUpdateCourseModuleInstructionAsync({
            course: address(courseAddress),
            resource: address(initialData!.resourceAddress),
            providerAuthority: signer,
            percentage: newPercentage,
          });
          instructions.push(updateModuleIx);
        }
      }

      if (instructions.length > 0) {
        await sendTransaction(instructions);
        toast({
          title: mode === "create" ? "Module created" : "Module updated",
        });
        onSuccess?.();
        onCancel?.();
      } else {
        onCancel?.();
      }
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
    nostrStatus,
    draftTimestamp,
    initialData,
    isExternal,
    sendTransaction,
    toast,
    onSuccess,
    onCancel,
    publishEventHelper,
    resourceContent,
  ]);

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
    setResourceContent(
      `# Test Content ${dateStr} ${timeStr}\n\nGenerated for testing.`,
    );
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

      const ix = getCloseResourceInstruction({
        resource: address(initialData.resourceAddress),
        authority: signer,
      });

      await sendTransaction([ix]);
      toast({
        title: "Resource deleted",
        description: "The resource account has been closed.",
      });
      onSuccess?.();
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

      {!isExternal && (
        <div className="space-y-2">
          <Label>Resource Content</Label>
          <MarkdownEditor
            value={resourceContent}
            onChange={setResourceContent}
            height={200}
          />
          <p className="text-xs text-muted-foreground">Stored on Nostr.</p>
        </div>
      )}

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
          publishDisabled={formDisabled}
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

      <details className="mt-4 text-xs text-muted-foreground border-t pt-2">
        <summary className="cursor-pointer font-medium mb-2">
          Debugging Info
        </summary>
        <div className="space-y-1 overflow-x-auto">
          <p>
            <strong>Mode:</strong> {mode}
          </p>
          <p>
            <strong>Nostr Status:</strong> {nostrStatus}
          </p>
          <p>
            <strong>Pending dTag:</strong> {nostrPending?.dTag || "None"}
          </p>
          <p>
            <strong>Pending Author:</strong>{" "}
            {nostrPending?.authorPubkey || "None"}
          </p>
          <div className="bg-muted p-2 rounded whitespace-pre-wrap font-mono">
            {JSON.stringify(
              {
                initialData: {
                  ...initialData,
                  nostrAuthorPubkey: initialData?.nostrAuthorPubkey
                    ? `${initialData.nostrAuthorPubkey.substring(0, 10)}...`
                    : undefined,
                },
                nostrPending,
                debugResource: debugResource
                  ? {
                      ...debugResource,
                      nostrAuthorPubkey: debugResource.nostrAuthorPubkey
                        ? `[${debugResource.nostrAuthorPubkey.length} bytes]`
                        : "undefined",
                    }
                  : "None",
              },
              (key, value) =>
                typeof value === "bigint"
                  ? value.toString()
                  : value instanceof Uint8Array ||
                    (value && value.type === "Buffer")
                  ? `[Bytes ${value.length}]`
                  : value,
              2,
            )}
          </div>
          {debugResource && (
            <div className="mt-2">
              <p className="font-semibold">Full Resource Account:</p>
              <div className="bg-muted p-2 rounded whitespace-pre-wrap font-mono">
                {JSON.stringify(
                  debugResource,
                  (key, value) =>
                    typeof value === "bigint"
                      ? value.toString()
                      : value instanceof Uint8Array ||
                        (value && value.type === "Buffer")
                      ? `[Bytes ${value.length}]`
                      : value,
                  2,
                )}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
