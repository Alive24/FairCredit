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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { useResources } from "@/hooks/use-resources";
import { address, type Instruction } from "@solana/kit";
import type { Course } from "@/lib/solana/generated/accounts/course";
import type { Resource } from "@/lib/solana/generated/accounts/resource";
import { fetchAllMaybeResource } from "@/lib/solana/generated/accounts/resource";
import { fetchResourceEvent } from "@/lib/nostr/client";
import { ResourceKind } from "@/lib/solana/generated/types/resourceKind";
import { ResourceStatus } from "@/lib/solana/generated/types/resourceStatus";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { getAddCourseModuleInstructionAsync } from "@/lib/solana/generated/instructions/addCourseModule";
import { ModuleResourceModal } from "@/components/module-resource-modal";
import type { Provider } from "@reown/appkit-adapter-solana/react";
import { parseModuleRichData } from "@/lib/resource-nostr-content";

type CourseModulesEditorProps = {
  course: Course;
  courseAddress: string;
  isProvider: boolean;
  walletAddress: string | null;
  isConnected: boolean;
  isSending: boolean;
  walletProvider: Provider | null;
  sendTransaction: (instructions: Instruction[]) => Promise<string>;
  onCourseReload?: () => Promise<void>;
};

function formatEnumLabel(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatAddress(value: string, size = 4) {
  if (value.length <= size * 2) return value;
  return `${value.slice(0, size)}...${value.slice(-size)}`;
}

function stripHtml(input: string): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function summarizeText(input: string, maxChars = 240): string {
  const plain = stripHtml(input);
  if (plain.length <= maxChars) return plain;
  return `${plain.slice(0, maxChars).trimEnd()}...`;
}

function looksLikeHtml(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function getOptionString(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const maybe = value as { __option?: string; value?: unknown };
  if (maybe.__option === "Some" && typeof maybe.value === "string") {
    return maybe.value;
  }
  return null;
}

function bytesToHex(bytes: any): string {
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
  } = useResources(walletAddress);

  const [busy, setBusy] = useState<string | null>(null);
  // State for adding existing resource
  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [existingSearch, setExistingSearch] = useState("");
  const [addingResourceAddress, setAddingResourceAddress] =
    useState<string>("");
  const [addingResourceModuleWeight, setAddingResourceModuleWeight] =
    useState("10");

  const [moduleResourceMap, setModuleResourceMap] = useState<
    Record<string, Resource | null>
  >({});
  const [moduleResourcesLoading, setModuleResourcesLoading] = useState(false);
  const [moduleResourcesError, setModuleResourcesError] = useState<
    string | null
  >(null);
  const [moduleRichByResource, setModuleRichByResource] = useState<
    Record<
      string,
      {
        rawContent: string;
        content: string;
        guidance: string;
        materials: string[];
        materialsRich: string;
        defaultActivitiesCount: number;
      }
    >
  >({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingModule, setEditingModule] = useState<{
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
  } | null>(null);

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
      const nextRich: Record<
        string,
        {
          rawContent: string;
          content: string;
          guidance: string;
          materials: string[];
          materialsRich: string;
          defaultActivitiesCount: number;
        }
      > = {};

      await Promise.all(
        maybeAccounts.map(async (account, index) => {
          const addressKey = moduleAddresses[index];
          if (account && "exists" in account && account.exists) {
            next[addressKey] = account.data;
            nextRich[addressKey] = {
              rawContent: "",
              content: "",
              guidance: account.data.name,
              materials: [],
              materialsRich: "",
              defaultActivitiesCount: 0,
            };

            const dTag = getOptionString(account.data.nostrDTag as unknown);
            const authorHex = bytesToHex(account.data.nostrAuthorPubkey);
            if (dTag && authorHex.length === 64) {
              try {
                const event = await fetchResourceEvent(authorHex, dTag);
                if (event?.content) {
                  const parsed = parseModuleRichData(event.content);
                  nextRich[addressKey] = {
                    rawContent: event.content,
                    content: parsed.content,
                    guidance: parsed.guidance || account.data.name,
                    materials: parsed.materials,
                    materialsRich: parsed.materialsRich,
                    defaultActivitiesCount: parsed.defaultActivities.length,
                  };
                }
              } catch {
                // best-effort
              }
            }
          } else {
            next[addressKey] = null;
          }
        }),
      );
      setModuleResourceMap(next);
      setModuleRichByResource(nextRich);
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
      Array.from(resourceLookup.entries()).map(
        ([resourceAddress, resource]) => ({
          resourceAddress,
          resource,
        }),
      ),
    [resourceLookup],
  );

  const filteredResources = useMemo(() => {
    const query = existingSearch.trim().toLowerCase();

    // Base list of searchable resources that are NOT already linked
    const availableResources = searchableResources.filter(
      ({ resourceAddress }) => !moduleResourceSet.has(resourceAddress),
    );

    if (!query) return availableResources;

    return availableResources.filter(({ resourceAddress, resource }) => {
      const addressMatch = resourceAddress.toLowerCase().includes(query);
      const nameMatch = resource.name.toLowerCase().includes(query);
      const tagMatch = resource.tags.join(" ").toLowerCase().includes(query);
      const kindMatch = formatEnumLabel(ResourceKind[resource.kind])
        .toLowerCase()
        .includes(query);
      const statusMatch = formatEnumLabel(ResourceStatus[resource.status])
        .toLowerCase()
        .includes(query);
      return addressMatch || nameMatch || tagMatch || kindMatch || statusMatch;
    });
  }, [existingSearch, searchableResources, moduleResourceSet]);

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

    const resourceAddress = addingResourceAddress.trim();
    if (!resourceAddress) {
      toast({
        title: "Resource required",
        description: "Select an existing resource to add.",
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

    const parsedPercentage = Number(addingResourceModuleWeight);
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
    addingResourceModuleWeight,
    addingResourceAddress,
    isConnected,
    isProvider,
    moduleLimitReached,
    moduleResourceSet,
    onCourseReload,
    sendTransaction,
    toast,
    walletAddress,
  ]);

  const visibleResources = filteredResources.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-muted p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium">Module Overview</p>
            <p className="text-xs text-muted-foreground">
              {course.modules.length} modules linked. Total weight:{" "}
              {totalWeight}%.
            </p>
          </div>
          <Badge variant={totalWeight === 100 ? "secondary" : "outline"}>
            {totalWeight === 100 ? "Balanced" : "Not Balanced"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg">Current Modules</CardTitle>
            <CardDescription>Modules are append-only on-chain.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={async () => {
                await onCourseReload?.();
                await loadModuleResources();
              }}
              disabled={moduleResourcesLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  moduleResourcesLoading ? "animate-spin" : ""
                }`}
              />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={() => setAddExistingOpen(true)}
              disabled={!canEdit}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add Existing
              </span>
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-8 gap-1"
              onClick={() => {
                setEditingModule(null);
                setModalMode("create");
                setModalOpen(true);
              }}
              disabled={!canEdit || moduleLimitReached}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Create New
              </span>
            </Button>
          </div>
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

              // Hide modules with unknown/missing resources
              if (!resource) {
                return null;
              }

              const resourceCourse = String(resource.course);
              const isExternal = resourceCourse !== courseAddress;
              const workloadValue =
                resource.workload.__option === "Some"
                  ? resource.workload.value
                  : null;
              const rich = moduleRichByResource[resourceAddress];
              const richContent = rich?.content?.trim() || "";
              const visibleTags = resource.tags.filter(
                (tag) => !tag.startsWith("default_activity:"),
              );
              const materials =
                rich?.materials?.length && rich.materials.length > 0
                  ? rich.materials
                  : visibleTags;
              const guidanceText =
                rich?.guidance?.trim() || summarizeText(resource.name, 220);
              const materialsRich = rich?.materialsRich?.trim() || "";

              return (
                <div
                  key={`${resourceAddress}-${index}`}
                  className="rounded-md border border-l-4 border-l-primary/50 bg-background p-3 space-y-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-[220px] space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold">{resource.name}</p>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground break-all">
                        {resourceAddress}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">
                          {formatEnumLabel(ResourceKind[resource.kind])}
                        </Badge>
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
                        {visibleTags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-md border bg-amber-50 px-3 py-2 text-right dark:bg-amber-950/30">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Module Weight
                      </p>
                      <p className="text-lg font-semibold">{module.percentage}%</p>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!resource) return;
                          setEditingModule({
                            resourceAddress,
                            name: resource.name,
                            kind: resource.kind,
                            externalId:
                              resource.externalId.__option === "Some"
                                ? resource.externalId.value
                                : "",
                            workload: workloadValue?.toString() || "",
                            tags: resource.tags,
                            content: rich?.rawContent || "",
                            percentage: module.percentage,
                            isExternal: !!isExternal,
                            nostrDTag:
                              resource.nostrDTag.__option === "Some"
                                ? resource.nostrDTag.value
                                : undefined,
                            nostrAuthorPubkey: bytesToHex(
                              resource.nostrAuthorPubkey,
                            ),
                          });
                          setModalMode("edit");
                          setModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </div>

                  <details open className="rounded-md border bg-background p-3">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                      Module Content
                    </summary>
                    <div className="pt-3">
                      {richContent ? (
                        looksLikeHtml(richContent) ? (
                          <div
                            className="prose prose-sm max-w-none [&_img]:max-h-64 [&_img]:rounded-md"
                            dangerouslySetInnerHTML={{ __html: richContent }}
                          />
                        ) : (
                          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
                            {richContent}
                          </div>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No detailed module content published yet.
                        </p>
                      )}
                    </div>
                  </details>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-md border bg-muted/20 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Materials
                      </p>
                      {materialsRich ? (
                        looksLikeHtml(materialsRich) ? (
                          <div
                            className="prose prose-sm max-w-none [&_img]:max-h-56 [&_img]:rounded-md"
                            dangerouslySetInnerHTML={{ __html: materialsRich }}
                          />
                        ) : (
                          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
                            {materialsRich}
                          </div>
                        )
                      ) : materials.length > 0 ? (
                        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {materials.slice(0, 6).map((material) => (
                            <li
                              key={`${resourceAddress}-material-${material}`}
                              className="break-words"
                            >
                              {material}
                            </li>
                          ))}
                          {materials.length > 6 && (
                            <li>{materials.length - 6} more material items</li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No materials added yet.
                        </p>
                      )}
                    </div>

                    <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Guidance
                      </p>
                      {looksLikeHtml(guidanceText) ? (
                        <div
                          className="prose prose-sm max-w-none [&_img]:max-h-56 [&_img]:rounded-md"
                          dangerouslySetInnerHTML={{ __html: guidanceText }}
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                          {guidanceText}
                        </p>
                      )}
                    </div>
                  </div>

                  {rich?.defaultActivitiesCount ? (
                    <div className="border-t pt-2">
                      <p className="text-xs text-muted-foreground">
                        {rich.defaultActivitiesCount} default enrollment
                        {" "}
                        {rich.defaultActivitiesCount === 1
                          ? "activity template"
                          : "activity templates"} configured in module editor.
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
          {moduleResourcesError && (
            <p className="text-xs text-destructive">{moduleResourcesError}</p>
          )}
        </CardContent>
      </Card>

      <ModuleResourceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        initialData={editingModule || undefined}
        debugResource={
          editingModule
            ? moduleResourceMap[editingModule.resourceAddress]
            : undefined
        }
        courseAddress={courseAddress}
        walletAddress={walletAddress || ""}
        walletProvider={walletProvider || undefined}
        isConnected={isConnected}
        isSending={isSending}
        sendTransaction={sendTransaction}
        onSuccess={async (result) => {
          if (result?.deleted) {
            // Optimistic update: immediately remove the deleted module from local state
            const deletedAddr = result.deleted;
            setModuleResourceMap((prev) => {
              const next = { ...prev };
              delete next[deletedAddr];
              return next;
            });
            setModalOpen(false);
            // Delay background sync to let the chain confirm the deletion
            setTimeout(async () => {
              await onCourseReload?.();
              await loadModuleResources();
            }, 5000);
          } else {
            // For save/update operations, reload immediately
            setModalOpen(false);
            await onCourseReload?.();
            await loadModuleResources();
          }
        }}
        totalWeight={
          course.modules.reduce((sum, m) => sum + m.percentage, 0) -
          (editingModule ? editingModule.percentage : 0)
        }
      />

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
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="existing-percentage">Module Weight (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="existing-percentage"
                    type="number"
                    min={0}
                    max={100}
                    value={addingResourceModuleWeight}
                    onChange={(e) =>
                      setAddingResourceModuleWeight(e.target.value)
                    }
                    placeholder="e.g. 10"
                    className="w-[120px]"
                  />
                  <span className="text-xs text-muted-foreground">
                    Determines the voting power of this module.
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="existing-resource-search">
                  Select Resource
                </Label>
                <Input
                  id="existing-resource-search"
                  value={existingSearch}
                  onChange={(e) => setExistingSearch(e.target.value)}
                  placeholder="Search by name, tag, or address..."
                />
              </div>

              <div className="rounded-md border h-[300px] overflow-auto">
                {resourcesLoading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading resources...
                  </div>
                ) : resourcesError ? (
                  <div className="flex items-center justify-center h-full text-destructive text-sm p-4 text-center">
                    {resourcesError.message}
                  </div>
                ) : !walletAddress ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
                    Connect your wallet to search resources.
                  </div>
                ) : visibleResources.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
                    No matching resources found.
                  </div>
                ) : (
                  <div className="divide-y relative">
                    {visibleResources.map(({ resourceAddress, resource }) => {
                      const selected =
                        resourceAddress === addingResourceAddress;
                      return (
                        <button
                          key={resourceAddress}
                          type="button"
                          onClick={() =>
                            setAddingResourceAddress(resourceAddress)
                          }
                          className={`w-full text-left px-3 py-3 transition-colors hover:bg-muted/50 flex items-start gap-3 ${
                            selected ? "bg-muted" : ""
                          }`}
                        >
                          <div
                            className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center ${
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/50"
                            }`}
                          >
                            {selected && (
                              <div className="h-2 w-2 rounded-full bg-current" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">
                                {resource.name}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5"
                              >
                                {formatEnumLabel(ResourceKind[resource.kind])}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {formatEnumLabel(ResourceStatus[resource.status])}{" "}
                              • {resourceAddress.slice(0, 4)}...
                              {resourceAddress.slice(-4)}
                              {resource.tags.filter(
                                (tag) => !tag.startsWith("default_activity:"),
                              ).length > 0 &&
                                ` • ${resource.tags
                                  .filter(
                                    (tag) =>
                                      !tag.startsWith("default_activity:"),
                                  )
                                  .join(", ")}`}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAddExistingOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddModule}
                disabled={
                  !canEdit ||
                  isSending ||
                  busy != null ||
                  !addingResourceAddress
                }
              >
                {busy === "add-module" && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Add Module
              </Button>
            </div>
            {moduleLimitReached && (
              <p className="text-xs text-destructive text-center">
                Course has reached the maximum of 20 modules.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
