"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { address } from "@solana/kit";
import type { Course } from "@/lib/solana/generated/accounts/course";
import type { Resource } from "@/lib/solana/generated/accounts/resource";
import { fetchAllMaybeResource } from "@/lib/solana/generated/accounts/resource";
import { fetchResourceEvent } from "@/lib/nostr/client";
import { parseModuleRichData } from "@/lib/resource-nostr-content";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type CourseModulesShowcaseProps = {
  course: Course;
};

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

function bytesToHex(value: unknown): string {
  if (!(value instanceof Uint8Array)) return "";
  return Array.from(value)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function CourseModulesShowcase({
  course,
}: CourseModulesShowcaseProps) {
  const { rpc } = useFairCredit();
  const [loading, setLoading] = useState(false);
  const [moduleResourceMap, setModuleResourceMap] = useState<
    Record<string, Resource | null>
  >({});
  const [moduleRichMap, setModuleRichMap] = useState<
    Record<
      string,
      {
        content: string;
        guidance: string;
        materials: string[];
        materialsRich: string;
      }
    >
  >({});

  const moduleRows = useMemo(() => {
    return course.modules.map((module, index) => {
      const resourceAddress = String(module.resource);
      return {
        id: `${resourceAddress}-${index}`,
        resourceAddress,
        title: `Module ${index + 1}`,
        percentage: module.percentage,
      };
    });
  }, [course.modules]);

  const loadModules = useCallback(async () => {
    if (!moduleRows.length) {
      setModuleResourceMap({});
      setModuleRichMap({});
      return;
    }

    setLoading(true);
    try {
      const uniqueAddresses = Array.from(
        new Set(moduleRows.map((entry) => entry.resourceAddress)),
      );
      const maybeResources = await fetchAllMaybeResource(
        rpc,
        uniqueAddresses.map((entry) => address(entry)),
      );

      const nextResourceMap: Record<string, Resource | null> = {};
      const nextRichMap: Record<
        string,
        {
          content: string;
          guidance: string;
          materials: string[];
          materialsRich: string;
        }
      > = {};

      await Promise.all(
        maybeResources.map(async (entry, index) => {
          const resourceAddress = uniqueAddresses[index];
          if (!entry.exists) {
            nextResourceMap[resourceAddress] = null;
            return;
          }

          nextResourceMap[resourceAddress] = entry.data;
          nextRichMap[resourceAddress] = {
            content: "",
            guidance: entry.data.name,
            materials: [],
            materialsRich: "",
          };

          const dTag = getOptionString(entry.data.nostrDTag as unknown);
          const authorHex = bytesToHex(entry.data.nostrAuthorPubkey);
          if (!dTag || authorHex.length !== 64) return;

          try {
            const event = await fetchResourceEvent(authorHex, dTag);
            if (event?.content) {
              nextRichMap[resourceAddress] = parseModuleRichData(event.content);
            }
          } catch {
            // best-effort only
          }
        }),
      );

      setModuleResourceMap(nextResourceMap);
      setModuleRichMap(nextRichMap);
    } catch (error) {
      console.error("Failed loading modules for showcase:", error);
      setModuleResourceMap({});
      setModuleRichMap({});
    } finally {
      setLoading(false);
    }
  }, [moduleRows, rpc]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const totalWeight = useMemo(
    () => moduleRows.reduce((sum, row) => sum + row.percentage, 0),
    [moduleRows],
  );

  if (loading && moduleRows.length > 0) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (moduleRows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground text-center">
          No modules linked to this course yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Course Modules
        </h3>
        <Badge variant={totalWeight === 100 ? "secondary" : "outline"}>
          Total Weight: {totalWeight}%
        </Badge>
      </div>

      {moduleRows.map((module) => {
        const resource = moduleResourceMap[module.resourceAddress];
        const rich = moduleRichMap[module.resourceAddress];
        const title = resource?.name?.trim() || module.title;
        const guidance = rich?.guidance?.trim()
          ? rich.guidance.trim()
          : resource?.name
            ? resource.name
            : "No guidance available.";
        const materials = rich?.materials?.length
          ? rich.materials
          : resource
            ? resource.tags.filter(
                (tag) => !tag.startsWith("default_activity:"),
              )
            : [];
        const materialsRich = rich?.materialsRich?.trim() || "";
        const shownMaterials = materials.slice(0, 4);
        const extraMaterials = Math.max(0, materials.length - shownMaterials.length);
        const richContent = rich?.content?.trim() || "";

        return (
          <Card key={module.id} className="border-l-4 border-l-primary/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Module materials and guidance
                  </p>
                </div>
                <div className="rounded-md border bg-amber-50 px-3 py-2 text-right dark:bg-amber-950/30">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Module Weight
                  </p>
                  <p className="text-lg font-semibold">{module.percentage}%</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
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
                  ) : shownMaterials.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {shownMaterials.map((material) => (
                        <li key={`${module.id}-${material}`} className="break-words">
                          {material}
                        </li>
                      ))}
                      {extraMaterials > 0 && (
                        <li>{extraMaterials} more material items</li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No materials published yet.
                    </p>
                  )}
                </div>

                <div className="rounded-md border bg-muted/20 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Guidance
                  </p>
                  {looksLikeHtml(guidance) ? (
                    <div
                      className="prose prose-sm max-w-none [&_img]:max-h-56 [&_img]:rounded-md"
                      dangerouslySetInnerHTML={{ __html: guidance }}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {guidance}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
