"use client";

import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTransactionQueue } from "@/hooks/use-transaction-queue";
import { ExternalLink } from "lucide-react";
import { useMemo } from "react";

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

export default function TransactionsPage() {
  const { history, clearHistory } = useTransactionQueue();

  const explorerBaseUrl = useMemo(() => {
    if (SOLANA_CLUSTER === "localnet") return null;
    return "https://solscan.io/tx/";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Transaction History</h1>
            <p className="text-sm text-muted-foreground">
              Operations submitted via the FairCredit transaction queue on this
              device.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearHistory}
            disabled={history.length === 0}
          >
            Clear history
          </Button>
        </div>

        {history.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No transactions recorded yet. Submit operations from the Hub or
              provider panels to see them here.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {history.length} recorded transaction
                {history.length === 1 ? "" : "s"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.map((tx) => (
                <div
                  key={`${tx.signature}-${tx.submittedAt}`}
                  className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-mono text-xs break-all">
                      {tx.signature}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatRelativeTime(tx.submittedAt)} ·{" "}
                      {tx.instructionCount} instruction
                      {tx.instructionCount === 1 ? "" : "s"}
                    </div>
                    {tx.operations.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {tx.operations.map((op, index) => (
                          <Badge
                            key={`${op.module}-${op.label}-${index}`}
                            variant="outline"
                          >
                            {op.module}
                            {op.label ? ` · ${op.label}` : ""}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
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
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function formatRelativeTime(timestamp: number) {
  const deltaSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
  const deltaMinutes = Math.round(deltaSeconds / 60);
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays}d ago`;
}

function getExplorerUrl(baseUrl: string, signature: string, cluster: string) {
  if (cluster === "devnet" || cluster === "testnet") {
    return `${baseUrl}${signature}?cluster=${cluster}`;
  }
  return `${baseUrl}${signature}`;
}

