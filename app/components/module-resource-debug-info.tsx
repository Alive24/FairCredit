import type { NostrPendingEvent } from "@/components/nostr-storage-panel";
import {
  buildDefaultActivityTemplates,
  summarizeMaterialsFromRich,
  type DefaultActivityTemplateDraftMap,
} from "@/components/module-resource-editor-helpers";

type ModuleResourceDebugInfoProps = {
  mode: "create" | "edit";
  nostrStatus: "idle" | "publishing" | "published" | "error";
  nostrPending: NostrPendingEvent | null;
  initialData?: {
    nostrAuthorPubkey?: string;
    [key: string]: unknown;
  };
  moduleGuidance: string;
  moduleMaterialsContent: string;
  defaultActivityDrafts: DefaultActivityTemplateDraftMap;
  loadedModuleRichSignature: string;
  debugResource?: unknown;
};

export function ModuleResourceDebugInfo({
  mode,
  nostrStatus,
  nostrPending,
  initialData,
  moduleGuidance,
  moduleMaterialsContent,
  defaultActivityDrafts,
  loadedModuleRichSignature,
  debugResource,
}: ModuleResourceDebugInfoProps) {
  return (
    <details className="mt-4 text-xs text-muted-foreground border-t pt-2">
      <summary className="cursor-pointer font-medium mb-2">Debugging Info</summary>
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
          <strong>Pending Author:</strong> {nostrPending?.authorPubkey || "None"}
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
              moduleGuidance,
              moduleMaterialsRich: moduleMaterialsContent,
              moduleMaterials: summarizeMaterialsFromRich(moduleMaterialsContent),
              defaultActivities: buildDefaultActivityTemplates(
                defaultActivityDrafts,
              ),
              loadedModuleRichSignature,
              debugResource:
                debugResource && typeof debugResource === "object"
                  ? {
                      ...(debugResource as Record<string, unknown>),
                      nostrAuthorPubkey:
                        (debugResource as any).nostrAuthorPubkey
                          ? `[${(debugResource as any).nostrAuthorPubkey.length} bytes]`
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
        {Boolean(debugResource) && (
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
  );
}
