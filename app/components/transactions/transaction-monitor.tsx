"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  X,
  Play,
  Zap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { useTransactionQueue } from "@/hooks/use-transaction-queue";

type TransactionMonitorProps = {
  variant?: "floating" | "dropdown";
};

const SOLANA_CLUSTER =
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER ??
  ((process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "").includes("devnet")
    ? "devnet"
    : (process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "").includes("testnet")
    ? "testnet"
    : (process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "").includes("localhost") ||
      (process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "").includes("127.0.0.1")
    ? "localnet"
    : "mainnet");

export function TransactionMonitor({
  variant = "floating",
}: TransactionMonitorProps) {
  const {
    pending,
    remove,
    clear,
    submitPending,
    combineSubmit,
    setCombineSubmit,
    isSubmitting,
    lastError,
    lastSignature,
    history,
    clearHistory,
  } = useTransactionQueue();
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const hasActivity =
    pending.length > 0 ||
    isSubmitting ||
    lastError != null ||
    lastSignature != null ||
    history.length > 0;

  const shouldRenderDropdown =
    variant === "dropdown" ? true : hasActivity || true;

  useEffect(() => {
    if (pending.length > 0 || lastError || isSubmitting) {
      setExpanded(true);
    }
  }, [pending.length, lastError, isSubmitting]);

  useEffect(() => {
    if (!expanded) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || !containerRef.current) return;
      if (!containerRef.current.contains(target)) {
        setExpanded(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [expanded]);

  const explorerBaseUrl = useMemo(() => {
    if (SOLANA_CLUSTER === "localnet") {
      return null;
    }
    return "https://solscan.io/tx/";
  }, []);

  const recentHistory = history.slice(0, 10);

  const card = (
    <Card
      className={
        variant === "dropdown"
          ? "w-full border bg-card shadow-none"
          : "shadow-lg border-primary/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 w-full max-w-sm"
      }
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary shrink-0" />
          Transaction Monitor
          {pending.length > 0 && (
            <Badge variant="secondary">{pending.length} pending</Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 flex-wrap">
          <span className="hidden sm:inline">Combine submit</span>
          <Switch
            checked={combineSubmit}
            onCheckedChange={setCombineSubmit}
            aria-label="Toggle combine submit"
          />
          {variant === "floating" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(false)}
              aria-label="Collapse monitor"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pending.length > 0 ? (
          <ScrollArea className="max-h-48 pr-4">
            <div className="space-y-2">
              {pending.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{entry.module}</Badge>
                      <span className="font-medium">{entry.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatRelativeTime(entry.createdAt)}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => remove(entry.id)}
                    aria-label="Remove operation"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">
            No pending instructions. Add operations from Hub or provider panels
            to see them here.
          </p>
        )}

        {lastError && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {lastError.message}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clear}
            disabled={pending.length === 0}
          >
            Clear pending
          </Button>
          <Button
            size="sm"
            onClick={submitPending}
            disabled={pending.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Submit ({pending.length})
              </>
            )}
          </Button>
        </div>

        {recentHistory.length > 0 && (
          <div className="space-y-2 rounded-md border border-dashed border-muted px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Recent transactions</p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  asChild
                >
                  <Link href="/transactions">View all</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={clearHistory}
                  disabled={history.length === 0}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {recentHistory.map((tx) => (
                <div
                  key={`${tx.signature}-${tx.submittedAt}`}
                  className="flex items-start justify-between rounded-lg border bg-card px-3 py-2 text-sm"
                >
                  <div className="space-y-1">
                    <div className="font-mono text-xs">
                      {tx.signature.slice(0, 8)}…{tx.signature.slice(-8)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatRelativeTime(tx.submittedAt)} ·{" "}
                      {tx.instructionCount} instruction
                      {tx.instructionCount === 1 ? "" : "s"}
                    </div>
                    {tx.operations.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {tx.operations.slice(0, 3).map((op, index) => (
                          <Badge
                            key={`${op.module}-${index}`}
                            variant="outline"
                          >
                            {op.module}
                            {op.label ? ` · ${op.label}` : ""}
                          </Badge>
                        ))}
                        {tx.operations.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{tx.operations.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/transactions/${tx.signature}`}>
                        Inspect
                      </Link>
                    </Button>
                    {explorerBaseUrl ? (
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={getExplorerUrl(
                            explorerBaseUrl,
                            tx.signature,
                            SOLANA_CLUSTER
                          )}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="View on Solscan"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {lastSignature && recentHistory.length === 0 && (
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-200">
            Last signature: {lastSignature.slice(0, 8)}...
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (variant === "dropdown") {
    if (!shouldRenderDropdown) return null;
    return card;
  }

  const totalCount = pending.length + history.length;
  const pillLabel =
    pending.length > 0
      ? `${pending.length} pending`
      : totalCount > 0
      ? "Tx"
      : "Tx";

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-0"
      style={{ maxWidth: "min(100vw - 2rem, 24rem)" }}
    >
      <div
        className={`
          grid transition-[grid-template-rows] duration-300 ease-out
          ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}
        `}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className="origin-bottom transition-all duration-300 ease-out"
            style={{
              transform: expanded ? "scaleY(1) scaleX(1)" : "scaleY(0.97) scaleX(0.97)",
              opacity: expanded ? 1 : 0,
            }}
          >
            {card}
          </div>
        </div>
      </div>
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={`
            mt-2 flex items-center gap-2 rounded-xl border bg-background/95 px-4 py-2.5
            shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/75
            border-primary/30 text-sm font-medium
            hover:bg-muted/50 transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          `}
          aria-label="Open transaction monitor"
        >
          <Zap className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate">{pillLabel}</span>
          {(pending.length > 0 || totalCount > 0) && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
              {pending.length > 0 ? pending.length : totalCount}
            </Badge>
          )}
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

function formatRelativeTime(timestamp: number) {
  const deltaSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`;
  }
  const deltaMinutes = Math.round(deltaSeconds / 60);
  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }
  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }
  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays}d ago`;
}

function getExplorerUrl(baseUrl: string, signature: string, cluster: string) {
  if (cluster === "devnet" || cluster === "testnet") {
    return `${baseUrl}${signature}?cluster=${cluster}`;
  }
  return `${baseUrl}${signature}`;
}
