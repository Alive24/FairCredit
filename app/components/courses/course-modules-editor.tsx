"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Wand2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { useResources } from "@/hooks/use-resources";
import { address, type Instruction } from "@solana/kit";
import type { Course } from "@/lib/solana/generated/accounts/course";
import type { Resource } from "@/lib/solana/generated/accounts/resource";
import { fetchAllMaybeResource } from "@/lib/solana/generated/accounts/resource";
import { ResourceKind } from "@/lib/solana/generated/types/resourceKind";
import { ResourceStatus } from "@/lib/solana/generated/types/resourceStatus";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { getAddCourseModuleInstructionAsync } from "@/lib/solana/generated/instructions/addCourseModule";
import { getAddResourceInstructionAsync } from "@/lib/solana/generated/instructions/addResource";
import { publishResourceEvent, buildResourceDTag } from "@/lib/nostr/client";
import { MarkdownEditor } from "@/components/markdown-editor";

const RESOURCE_KIND_OPTIONS = [
  { value: ResourceKind.Assignment, label: "Assignment" },
  { value: ResourceKind.AssignmentSummative, label: "Assignment Summative" },
  { value: ResourceKind.Meeting, label: "Meeting" },
  { value: ResourceKind.General, label: "General" },
  { value: ResourceKind.Publication, label: "Publication" },
  { value: ResourceKind.PublicationReviewed, label: "Publication Reviewed" },
];

type CourseModulesEditorProps = {
  course: Course;
  courseAddress: string;
  isProvider: boolean;
  walletAddress: string | null;
  isConnected: boolean;
  isSending: boolean;
  walletProvider: { signMessage?: (message: Uint8Array) => Promise<Uint8Array> } | null;
  sendTransaction: (instructions: Instruction[]) => Promise<string>;
  onCourseReload?: () => Promise<void>;
};

type NostrPendingEvent = {
  dTag: string;
  authorPubkey: string;
  eventId: string;
};

function formatEnumLabel(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatAddress(value: string, size = 4) {
  if (value.length <= size * 2) return value;
  return `${value.slice(0, size)}...${value.slice(-size)}`;
}

function hexToBytes32(hex: string): Uint8Array {
  const normalized = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error("Invalid Nostr pubkey (expected 64 hex chars)");
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function CourseModulesEditor({
  course,
  courseAddress,
  isProvider,
  walletAddress,
  isConnected,
  isSending,
  walletProvider,
  sendTransaction,
  onCourseReload,
}: CourseModulesEditorProps) {
  const { toast } = useToast();
  const { rpc } = useFairCredit();
  const {
    resources,
    loading: resourcesLoading,
    error: resourcesError,
    refetch: refetchResources,
  } = useResources(walletAddress);

  const [busy, setBusy] = useState<string | null>(null);
  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [existingSearch, setExistingSearch] = useState("");
  const [existingSelectedAddress, setExistingSelectedAddress] =
    useState<string>("");
  const [existingPercentage, setExistingPercentage] = useState("10");

  const [newResourceName, setNewResourceName] = useState("");
  const [newResourceKind, setNewResourceKind] =
    useState<ResourceKind>(ResourceKind.General);
  const [newResourceExternalId, setNewResourceExternalId] = useState("");
  const [newResourceWorkload, setNewResourceWorkload] = useState("");
  const [newResourceTag, setNewResourceTag] = useState("");
  const [newResourceTags, setNewResourceTags] = useState<string[]>([]);
  const [resourceContent, setResourceContent] = useState("");

  const [resourceDraftAddress, setResourceDraftAddress] = useState<
    string | null
  >(null);
  const [resourceDraftTimestamp, setResourceDraftTimestamp] = useState<
    number | null
  >(null);
  const [resourceNostrStatus, setResourceNostrStatus] = useState<
    "idle" | "publishing" | "published" | "error"
  >("idle");
  const [resourceNostrError, setResourceNostrError] = useState<string | null>(
    null,
  );
  const [resourceNostrPending, setResourceNostrPending] =
    useState<NostrPendingEvent | null>(null);
  const [resourceCreated, setResourceCreated] = useState(false);

  const [moduleResourceMap, setModuleResourceMap] = useState<
    Record<string, Resource | null>
  >({});
  const [moduleResourcesLoading, setModuleResourcesLoading] = useState(false);
  const [moduleResourcesError, setModuleResourcesError] = useState<string | null>(
    null,
  );

  const moduleAddresses = useMemo(() => {
    const set = new Set<string>();
    for (const module of course.modules) {
      set.add(String(module.resource));
    }
    return Array.from(set);
  }, [course.modules]);

  const moduleResourceSet = useMemo(
    () => new Set(course.modules.map((module) => String(module.resource))),
    [course.modules],
  );

  const totalWeight = useMemo(
    () => course.modules.reduce((sum, module) => sum + module.percentage, 0),
    [course.modules],
  );

  const canEdit = isProvider && isConnected && Boolean(walletAddress);
  const moduleLimitReached = course.modules.length >= 20;
  const resourceStatusLabel =
    resourceNostrStatus === "publishing"
      ? "Publishing..."
      : resourceNostrStatus === "published"
      ? "Published"
      : resourceNostrStatus === "error"
      ? "Error"
      : "Not Published";

  const loadModuleResources = useCallback(async () => {
    if (moduleAddresses.length === 0) {
      setModuleResourceMap({});
      setModuleResourcesError(null);
      return;
    }
    setModuleResourcesLoading(true);
    setModuleResourcesError(null);
    try {
      const addressList = moduleAddresses.map((value) => address(value));
      const maybeAccounts = await fetchAllMaybeResource(rpc, addressList);
      const next: Record<string, Resource | null> = {};
      maybeAccounts.forEach((account, index) => {
        const addressKey = moduleAddresses[index];
        if (account && "exists" in account && account.exists) {
          next[addressKey] = account.data;
        } else {
          next[addressKey] = null;
        }
      });
      setModuleResourceMap(next);
    } catch (e) {
      console.error("Failed to load module resources:", e);
      setModuleResourcesError(e instanceof Error ? e.message : String(e));
    } finally {
      setModuleResourcesLoading(false);
    }
  }, [moduleAddresses, rpc]);

  useEffect(() => {
    loadModuleResources();
  }, [loadModuleResources]);

  const resourceLookup = useMemo(() => {
    const map = new Map<string, Resource>();
    for (const entry of resources) {
      map.set(String(entry.address), entry.resource);
    }
    for (const [resourceAddress, resource] of Object.entries(
      moduleResourceMap,
    )) {
      if (resource) {
        map.set(resourceAddress, resource);
      }
    }
    return map;
  }, [moduleResourceMap, resources]);

  const searchableResources = useMemo(
    () =>
      Array.from(resourceLookup.entries()).map(([resourceAddress, resource]) => ({
        resourceAddress,
        resource,
      })),
    [resourceLookup],
  );

  const filteredResources = useMemo(() => {
    const query = existingSearch.trim().toLowerCase();
    if (!query) return searchableResources;
    return searchableResources.filter(({ resourceAddress, resource }) => {
      const addressMatch = resourceAddress.toLowerCase().includes(query);
      const nameMatch = resource.name.toLowerCase().includes(query);
      const tagMatch = resource.tags
        .join(" ")
        .toLowerCase()
        .includes(query);
      const kindMatch = formatEnumLabel(ResourceKind[resource.kind])
        .toLowerCase()
        .includes(query);
      const statusMatch = formatEnumLabel(ResourceStatus[resource.status])
        .toLowerCase()
        .includes(query);
      return addressMatch || nameMatch || tagMatch || kindMatch || statusMatch;
    });
  }, [existingSearch, searchableResources]);

  const selectedExistingResource = useMemo(() => {
    if (!existingSelectedAddress) return null;
    return resourceLookup.get(existingSelectedAddress) ?? null;
  }, [existingSelectedAddress, resourceLookup]);

  const addResourceTag = () => {
    const value = newResourceTag.trim();
    if (!value || newResourceTags.includes(value)) return;
    setNewResourceTags((prev) => [...prev, value]);
    setNewResourceTag("");
  };

  const removeResourceTag = (tag: string) => {
    setNewResourceTags((prev) => prev.filter((item) => item !== tag));
  };

  const fillCreateTestData = () => {
    setNewResourceName("Quantum Lab Assignment 1");
    setNewResourceKind(ResourceKind.Assignment);
    setNewResourceExternalId("LAB-001");
    setNewResourceWorkload("90");
    setNewResourceTags(["quantum", "lab", "assignment"]);
    setResourceContent(
      "<p>Describe the experiment, upload evidence, and include calculations.</p>",
    );
  };

  const fillExistingTestData = () => {
    setExistingPercentage("15");
    if (resources.length > 0) {
      const first = String(resources[0].address);
      setExistingSelectedAddress(first);
      setExistingSearch(resources[0].resource.name);
    }
  };

  const handleAddModule = useCallback(async () => {
    if (!courseAddress) return;
    if (!walletAddress || !isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Connect your wallet to add course modules.",
        variant: "destructive",
      });
      return;
    }
    if (!isProvider) {
      toast({
        title: "Provider wallet required",
        description: "Only the course provider can add modules.",
        variant: "destructive",
      });
      return;
    }
    if (moduleLimitReached) {
      toast({
        title: "Module limit reached",
        description: "Courses can only have up to 20 modules on-chain.",
        variant: "destructive",
      });
      return;
    }

    const resourceAddress = existingSelectedAddress.trim();
    if (!resourceAddress) {
      toast({
        title: "Resource required",
        description: "Select a resource to add as a module.",
        variant: "destructive",
      });
      return;
    }
    if (moduleResourceSet.has(resourceAddress)) {
      toast({
        title: "Module already added",
        description: "This resource is already linked to the course.",
        variant: "destructive",
      });
      return;
    }

    const parsedPercentage = Number(existingPercentage);
    if (
      !Number.isFinite(parsedPercentage) ||
      !Number.isInteger(parsedPercentage) ||
      parsedPercentage < 0 ||
      parsedPercentage > 100
    ) {
      toast({
        title: "Invalid percentage",
        description: "Module weight must be an integer between 0 and 100.",
        variant: "destructive",
      });
      return;
    }

    setBusy("add-module");
    try {
      const ix = await getAddCourseModuleInstructionAsync({
        course: address(courseAddress),
        providerAuthority: createPlaceholderSigner(walletAddress),
        resource: address(resourceAddress),
        percentage: parsedPercentage,
      });
      await sendTransaction([ix]);
      toast({
        title: "Module added",
        description: "The resource has been linked to this course.",
      });
      setAddExistingOpen(false);
      await onCourseReload?.();
    } catch (e) {
      console.error("Add module failed:", e);
      toast({
        title: "Add module failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }, [
    courseAddress,
    existingPercentage,
    existingSelectedAddress,
    isConnected,
    isProvider,
    moduleLimitReached,
    moduleResourceSet,
    onCourseReload,
    sendTransaction,
    toast,
    walletAddress,
  ]);

  const handleCreateResource = useCallback(async () => {
    if (!courseAddress) return;
    if (!walletAddress || !isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Connect your wallet to create resources.",
        variant: "destructive",
      });
      return;
    }
    if (!isProvider) {
      toast({
        title: "Provider wallet required",
        description: "Only the course provider can create resources.",
        variant: "destructive",
      });
      return;
    }
    if (!resourceNostrPending || !resourceDraftTimestamp || !resourceDraftAddress) {
      toast({
        title: "Publish required",
        description:
          "Publish the resource content to Nostr before creating on-chain.",
        variant: "destructive",
      });
      return;
    }

    const name = newResourceName.trim();
    if (!name) {
      toast({
        title: "Resource name required",
        description: "Provide a name for the new resource.",
        variant: "destructive",
      });
      return;
    }

    const workloadValue = newResourceWorkload.trim();
    const workloadParsed = workloadValue
      ? Number.parseInt(workloadValue, 10)
      : null;
    if (
      workloadValue &&
      (workloadParsed == null ||
        Number.isNaN(workloadParsed) ||
        workloadParsed < 0)
    ) {
      toast({
        title: "Invalid workload",
        description: "Workload must be a positive number of minutes.",
        variant: "destructive",
      });
      return;
    }

    setBusy("create-resource");
    try {
      const creationTimestamp = BigInt(resourceDraftTimestamp);
      const nostrAuthorBytes = hexToBytes32(resourceNostrPending.authorPubkey);
      const ix = await getAddResourceInstructionAsync({
        course: address(courseAddress),
        providerAuthority: createPlaceholderSigner(walletAddress),
        creationTimestamp,
        kind: newResourceKind,
        name,
        externalId: newResourceExternalId.trim() || null,
        workload: workloadParsed,
        tags: newResourceTags,
        nostrDTag: resourceNostrPending.dTag,
        nostrAuthorPubkey: nostrAuthorBytes,
      });
      const createdAddress = String(ix.accounts[0].address);
      await sendTransaction([ix]);

      toast({
        title: "Resource created",
        description: `Resource ${formatAddress(createdAddress)} created.`,
      });

      setResourceDraftAddress(createdAddress);
      setResourceCreated(true);
      await refetchResources();
    } catch (e) {
      console.error("Create resource failed:", e);
      toast({
        title: "Create resource failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }, [
    courseAddress,
    isConnected,
    isProvider,
    newResourceExternalId,
    newResourceKind,
    newResourceName,
    newResourceTags,
    newResourceWorkload,
    resourceDraftAddress,
    resourceDraftTimestamp,
    resourceNostrPending,
    refetchResources,
    sendTransaction,
    toast,
    walletAddress,
  ]);

  const publishResourceToNostr = useCallback(async () => {
    if (!walletAddress || !isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Connect your wallet to publish content.",
        variant: "destructive",
      });
      return;
    }
    if (!resourceContent.trim()) {
      toast({
        title: "Content required",
        description: "Write content before publishing to Nostr.",
        variant: "destructive",
      });
      return;
    }

    setBusy("publish-resource");
    setResourceNostrStatus("publishing");
    setResourceNostrError(null);
    try {
      let draftTimestamp = resourceDraftTimestamp;
      let draftAddress = resourceDraftAddress;
      if (!draftTimestamp || !draftAddress) {
        const creationTimestamp = Math.floor(Date.now() / 1000);
        const draftWorkload = newResourceWorkload
          ? Number.parseInt(newResourceWorkload, 10)
          : null;
        const workloadValue =
          draftWorkload == null || Number.isNaN(draftWorkload)
            ? null
            : draftWorkload;
        const ix = await getAddResourceInstructionAsync({
          course: address(courseAddress),
          providerAuthority: createPlaceholderSigner(walletAddress),
          creationTimestamp,
          kind: newResourceKind,
          name: newResourceName || "Untitled Resource",
          externalId: newResourceExternalId.trim() || null,
          workload: workloadValue,
          tags: newResourceTags,
          nostrDTag: null,
          nostrAuthorPubkey: null,
        });
        draftAddress = String(ix.accounts[0].address);
        draftTimestamp = creationTimestamp;
        setResourceDraftAddress(draftAddress);
        setResourceDraftTimestamp(draftTimestamp);
      }
      const dTag = buildResourceDTag({
        resourcePubkey: address(draftAddress),
        created: draftTimestamp,
      });
      const published = await publishResourceEvent({
        dTag,
        content: resourceContent,
        walletAddress,
        signMessage: walletProvider?.signMessage
          ? (message) => walletProvider.signMessage!(message)
          : undefined,
      });
      setResourceNostrPending({
        dTag,
        authorPubkey: published.authorPubkey,
        eventId: published.eventId,
      });
      setResourceNostrStatus("published");
      setResourceCreated(false);
      toast({
        title: "Published to Nostr",
        description: `Event ${published.eventId.slice(0, 8)}... is ready.`,
      });
    } catch (e) {
      console.error("Publish failed:", e);
      setResourceNostrStatus("error");
      setResourceNostrError(e instanceof Error ? e.message : String(e));
      toast({
        title: "Publish failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }, [
    isConnected,
    resourceContent,
    resourceDraftAddress,
    resourceDraftTimestamp,
    courseAddress,
    newResourceExternalId,
    newResourceKind,
    newResourceName,
    newResourceTags,
    newResourceWorkload,
    toast,
    walletAddress,
    walletProvider,
  ]);

  const visibleResources = filteredResources.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-muted p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium">Module Overview</p>
            <p className="text-xs text-muted-foreground">
              {course.modules.length} modules linked. Total weight: {totalWeight}%.
            </p>
          </div>
          <Badge variant={totalWeight === 100 ? "secondary" : "outline"}>
            {totalWeight === 100 ? "Balanced" : "Not Balanced"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Modules</CardTitle>
          <CardDescription>
            Modules are append-only on-chain. Add new resources as needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {moduleResourcesLoading ? (
            <p className="text-sm text-muted-foreground">Loading modules...</p>
          ) : course.modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No modules added yet.
            </p>
          ) : (
            course.modules.map((module, index) => {
              const resourceAddress = String(module.resource);
              const resource = moduleResourceMap[resourceAddress] ?? null;
              const resourceCourse = resource
                ? String(resource.course)
                : null;
              const isExternal =
                resourceCourse && resourceCourse !== courseAddress;
              const workloadValue =
                resource && resource.workload.__option === "Some"
                  ? resource.workload.value
                  : null;
              return (
                <div
                  key={`${resourceAddress}-${index}`}
                  className="rounded-md border p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {resource?.name ?? "Unknown Resource"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {resource
                          ? formatEnumLabel(ResourceKind[resource.kind])
                          : "Resource not found"}
                      </p>
                    </div>
                    <Badge variant="secondary">{module.percentage}%</Badge>
                  </div>
                  <div className="mt-2 text-xs font-mono text-muted-foreground break-all">
                    {resourceAddress}
                  </div>
                  {resource && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">
                        {formatEnumLabel(ResourceStatus[resource.status])}
                      </Badge>
                      {workloadValue != null && (
                        <Badge variant="outline">{workloadValue} min</Badge>
                      )}
                      {isExternal && resourceCourse && (
                        <Badge variant="outline">
                          From {formatAddress(resourceCourse)}
                        </Badge>
                      )}
                      {resource.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {moduleResourcesError && (
            <p className="text-xs text-destructive">{moduleResourcesError}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Create New Resource</CardTitle>
            <CardDescription>
              Create a resource, publish content to Nostr, then bind the pointer.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fillCreateTestData}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Fill Test Data
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resource-name">Resource Name *</Label>
              <Input
                id="resource-name"
                value={newResourceName}
                onChange={(e) => setNewResourceName(e.target.value)}
                placeholder="Weekly lab assignment"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-kind">Kind</Label>
              <Select
                value={String(newResourceKind)}
                onValueChange={(value) =>
                  setNewResourceKind(Number(value) as ResourceKind)
                }
              >
                <SelectTrigger id="resource-kind">
                  <SelectValue placeholder="Select kind" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_KIND_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={String(option.value)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-external-id">External ID</Label>
              <Input
                id="resource-external-id"
                value={newResourceExternalId}
                onChange={(e) => setNewResourceExternalId(e.target.value)}
                placeholder="Optional external identifier"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-workload">Workload (minutes)</Label>
              <Input
                id="resource-workload"
                type="number"
                min={0}
                value={newResourceWorkload}
                onChange={(e) => setNewResourceWorkload(e.target.value)}
                placeholder="e.g. 90"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newResourceTag}
                onChange={(e) => setNewResourceTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addResourceTag();
                  }
                }}
              />
              <Button type="button" onClick={addResourceTag} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {newResourceTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {newResourceTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeResourceTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Resource Content</Label>
            <MarkdownEditor
              value={resourceContent}
              onChange={setResourceContent}
              placeholder="Write rich content for the resource..."
              height={260}
            />
            <p className="text-xs text-muted-foreground">
              Content is stored on Nostr and linked to this resource.
            </p>
          </div>

          {resourceDraftAddress && (
            <div className="rounded-md border border-muted p-3 text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">Resource:</span>{" "}
                <span className="font-mono break-all">
                  {resourceDraftAddress}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                {resourceStatusLabel}
              </div>
              {resourceCreated && (
                <div>
                  <span className="text-muted-foreground">On-chain:</span>{" "}
                  Created
                </div>
              )}
              {resourceNostrPending && (
                <div>
                  <span className="text-muted-foreground">Event:</span>{" "}
                  <span className="font-mono break-all">
                    {resourceNostrPending.eventId}
                  </span>
                </div>
              )}
              {resourceNostrError && (
                <p className="text-xs text-destructive">{resourceNostrError}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleCreateResource}
              disabled={
                !canEdit ||
                isSending ||
                busy != null ||
                !resourceNostrPending
              }
            >
              {busy === "create-resource" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Create Resource
            </Button>
            <Button
              variant="outline"
              onClick={publishResourceToNostr}
              disabled={!canEdit || isSending || busy != null}
            >
              {busy === "publish-resource" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Publish to Nostr
            </Button>
          </div>
          {!resourceNostrPending && (
            <p className="text-xs text-muted-foreground">
              Publish to Nostr before creating the on-chain resource.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Add Existing Resource</CardTitle>
            <CardDescription>
              Search your resources on-chain and link them as modules.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddExistingOpen(true)}
          >
            Browse Resources
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the modal to search and select an existing resource.
          </p>
        </CardContent>
      </Card>

      <Dialog open={addExistingOpen} onOpenChange={setAddExistingOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Existing Resource</DialogTitle>
            <DialogDescription>
              Search resources owned by your provider wallet and add one as a
              module.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label htmlFor="existing-resource-search">Search</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fillExistingTestData}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Fill Test Data
              </Button>
            </div>
            <Input
              id="existing-resource-search"
              value={existingSearch}
              onChange={(e) => setExistingSearch(e.target.value)}
              placeholder="Search by name, tag, status, or address"
            />

            <div className="space-y-2">
              <Label htmlFor="existing-percentage">Module Weight (%)</Label>
              <Input
                id="existing-percentage"
                type="number"
                min={0}
                max={100}
                value={existingPercentage}
                onChange={(e) => setExistingPercentage(e.target.value)}
                placeholder="e.g. 20"
              />
            </div>

            {resourcesLoading ? (
              <p className="text-xs text-muted-foreground">
                Loading resources...
              </p>
            ) : resourcesError ? (
              <p className="text-xs text-destructive">
                {resourcesError.message}
              </p>
            ) : !walletAddress ? (
              <p className="text-xs text-muted-foreground">
                Connect your wallet to search resources you own.
              </p>
            ) : visibleResources.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No matching resources found.
              </p>
            ) : (
              <div className="rounded-md border divide-y max-h-[320px] overflow-auto">
                {visibleResources.map(({ resourceAddress, resource }) => {
                  const alreadyLinked = moduleResourceSet.has(resourceAddress);
                  const selected = resourceAddress === existingSelectedAddress;
                  return (
                    <button
                      key={resourceAddress}
                      type="button"
                      onClick={() => setExistingSelectedAddress(resourceAddress)}
                      className={`w-full text-left px-3 py-2 transition-colors hover:bg-muted/60 ${
                        selected ? "bg-muted/70" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">
                            {resource.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatEnumLabel(ResourceKind[resource.kind])} -{" "}
                            {formatEnumLabel(ResourceStatus[resource.status])}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {formatAddress(resourceAddress)}
                          </p>
                        </div>
                        {alreadyLinked && (
                          <Badge variant="outline">Already linked</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedExistingResource && (
              <div className="rounded-md border border-muted p-3 text-xs">
                <p className="font-medium">Selected Resource</p>
                <div className="mt-1 text-muted-foreground">
                  {selectedExistingResource.name} -{" "}
                  {formatEnumLabel(
                    ResourceKind[selectedExistingResource.kind],
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={handleAddModule}
              disabled={!canEdit || isSending || busy != null}
            >
              {busy === "add-module" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Add Module
            </Button>
            {!canEdit && (
              <p className="text-xs text-muted-foreground">
                Connect your provider wallet to add modules.
              </p>
            )}
            {moduleLimitReached && (
              <p className="text-xs text-destructive">
                Course has reached the maximum of 20 modules.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
