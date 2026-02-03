"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [collapsed, setCollapsed] = useState(true);

  const shouldRender =
    variant === "dropdown"
      ? true
      : pending.length > 0 ||
        isSubmitting ||
        lastError != null ||
        lastSignature != null ||
        history.length > 0;

  useEffect(() => {
    if (pending.length > 0 || lastError || isSubmitting) {
      setCollapsed(false);
    }
  }, [pending.length, lastError, isSubmitting]);

  const explorerBaseUrl = useMemo(() => {
    if (SOLANA_CLUSTER === "localnet") {
      return null;
    }
    return "https://solscan.io/tx/";
  }, []);

  const recentHistory = history.slice(0, 10);

  if (!shouldRender) {
    return null;
  }

  const card = (
    <Card
      className={
        variant === "dropdown"
          ? "w-full border bg-card shadow-none"
          : "shadow-lg border-primary/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75"
      }
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Transaction Monitor
          {pending.length > 0 && (
            <Badge variant="secondary">{pending.length} pending</Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Combine submit
          <Switch
            checked={combineSubmit}
            onCheckedChange={setCombineSubmit}
            aria-label="Toggle combine submit"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expand monitor" : "Collapse monitor"}
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {!collapsed && (
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
              No pending instructions. Add operations from Hub or provider
              panels to see them here.
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
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Recent transactions</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={clearHistory}
                  disabled={history.length === 0}
                >
                  Clear history
                </Button>
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
                    {explorerBaseUrl ? (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={getExplorerUrl(
                            explorerBaseUrl,
                            tx.signature,
                            SOLANA_CLUSTER
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1"
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    ) : null}
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
      )}
    </Card>
  );

  if (variant === "dropdown") {
    return card;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm">{card}</div>
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
