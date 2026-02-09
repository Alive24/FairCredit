import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NostrStorageStatus = "idle" | "publishing" | "published" | "error";

export type NostrStoragePanelProps = {
  status: NostrStorageStatus;
  dTag?: string | null;
  authorPubkey?: string | null;
  neventId?: string | null;
  verifyUrl?: string | null;
  error?: string | null;

  // Actions
  onPublish?: () => void;
  publishLabel?: string;
  publishDisabled?: boolean;

  // Slots
  extraActions?: React.ReactNode;
  footer?: React.ReactNode;

  defaultOpen?: boolean;
  className?: string;
};

export type NostrPendingEvent = {
  dTag: string;
  authorPubkey: string;
  neventId: string | null;
  verifyUrl: string | null;
};

/**
 * NostrStoragePanel - Reusable component for displaying Nostr storage status
 * Wraps status, details, and actions in a collapsible card.
 */
export function NostrStoragePanel({
  status,
  dTag,
  authorPubkey,
  neventId,
  verifyUrl,
  error,
  onPublish,
  publishLabel = "Publish to Nostr",
  publishDisabled = false,
  extraActions,
  footer,
  defaultOpen = false,
  className,
}: NostrStoragePanelProps) {
  const [isOpen, setIsOpen] = useState(
    defaultOpen || status === "published" || status === "error",
  );

  const getStatusBadge = () => {
    switch (status) {
      case "publishing":
        return (
          <Badge variant="outline" className="gap-1 h-6">
            <Loader2 className="h-3 w-3 animate-spin" />
            Publishing...
          </Badge>
        );
      case "published":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-green-500/50 text-green-700 dark:text-green-400 h-6"
          >
            <CheckCircle2 className="h-3 w-3" />
            Published
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="gap-1 h-6">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="h-6">
            Not Published
          </Badge>
        );
    }
  };

  return (
    <Card className={cn("border-muted", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Nostr Storage
            </CardTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pb-4 pt-0 space-y-4">
            <div className="space-y-1 text-xs text-muted-foreground border-t pt-3">
              <div className="grid grid-cols-[60px_1fr] gap-1 items-baseline">
                <span>dTag:</span>
                <span className="font-mono break-all">{dTag || "Not set"}</span>
              </div>
              <div className="grid grid-cols-[60px_1fr] gap-1 items-baseline">
                <span>Author:</span>
                <span className="font-mono break-all">
                  {authorPubkey ? `${authorPubkey}` : "Not set"}
                </span>
              </div>

              {(status === "published" || neventId) && (
                <>
                  <div className="grid grid-cols-[60px_1fr] gap-1 items-baseline">
                    <span>Nevent ID:</span>
                    <span className="font-mono break-all">
                      {neventId ? `${neventId}` : "—"}
                    </span>
                  </div>
                  {verifyUrl && (
                    <div className="grid grid-cols-[60px_1fr] gap-1 items-baseline">
                      <span>Verify:</span>
                      <a
                        href={verifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 hover:underline text-primary"
                      >
                        View on Relay <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </>
              )}

              {status === "error" && error && (
                <div className="text-destructive mt-2 bg-destructive/10 p-2 rounded">
                  {error}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {onPublish && (
                <Button
                  onClick={onPublish}
                  disabled={publishDisabled || status === "publishing"}
                  size="sm"
                  className="gap-2"
                >
                  {status === "publishing" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {status === "publishing" ? "Publishing..." : publishLabel}
                </Button>
              )}
              {extraActions}
            </div>

            {footer}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
