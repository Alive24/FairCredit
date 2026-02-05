"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";
import {
  FAIR_CREDIT_PROGRAM_ADDRESS,
  parseFairCreditInstruction,
  FairCreditInstruction,
} from "@/lib/solana/generated/programs/fairCredit";
import { ExternalLink, Loader2 } from "lucide-react";

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

type ParsedIx = {
  programId: string;
  index: number;
  kind: "system" | "fairCredit" | "other";
  fairCreditType?: FairCreditInstruction;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
};

export default function TransactionDetailPage() {
  const params = useParams<{ signature: string }>();
  const signature = typeof params?.signature === "string" ? params.signature : "";
  const { connection } = useAppKitConnection();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [blockTime, setBlockTime] = useState<number | null>(null);
  const [fee, setFee] = useState<number | null>(null);
  const [computeUnits, setComputeUnits] = useState<number | null>(null);
  const [parsedIxs, setParsedIxs] = useState<ParsedIx[]>([]);

  const explorerUrl = useMemo(() => {
    if (!signature) return null;
    if (SOLANA_CLUSTER === "localnet") return null;
    const base = "https://solscan.io/tx/";
    return SOLANA_CLUSTER === "devnet" || SOLANA_CLUSTER === "testnet"
      ? `${base}${signature}?cluster=${SOLANA_CLUSTER}`
      : `${base}${signature}`;
  }, [signature]);

  useEffect(() => {
    if (!connection || !signature) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const tx = await connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0,
        });
        if (cancelled) return;
        if (!tx) {
          setError("Transaction not found on this cluster.");
          return;
        }

        setSlot(tx.slot);
        setBlockTime(tx.blockTime ?? null);
        setFee(tx.meta?.fee ?? null);
        setComputeUnits(
          (tx.meta?.computeUnitsConsumed as number | null | undefined) ?? null,
        );

        const transaction = tx.transaction as any;
        const message = transaction.message;
        const accountKeys: any[] =
          message.staticAccountKeys ?? message.accountKeys ?? [];
        const compiledIxs: any[] =
          message.compiledInstructions ?? message.instructions ?? [];
        const parsed: ParsedIx[] = [];

        compiledIxs.forEach((ix, index) => {
          // Support both TransactionInstruction shape and compiled instruction shape.
          let programId: string;
          let accountsMeta: { pubkey: string; isSigner: boolean; isWritable: boolean }[] = [];

          if ("programId" in ix) {
            // Legacy TransactionInstruction style.
            programId = ix.programId.toBase58();
            accountsMeta =
              ix.keys?.map((k: any) => ({
                pubkey: k.pubkey.toBase58(),
                isSigner: Boolean(k.isSigner),
                isWritable: Boolean(k.isWritable),
              })) ?? [];
          } else {
            // Compiled instruction: use account indices.
            const programKey = accountKeys[ix.programIdIndex];
            programId = programKey?.toBase58?.() ?? String(programKey);
            const isSigner = (accountIndex: number) =>
              typeof message.isAccountSigner === "function"
                ? message.isAccountSigner(accountIndex)
                : false;
            const isWritable = (accountIndex: number) =>
              typeof message.isAccountWritable === "function"
                ? message.isAccountWritable(accountIndex)
                : false;
            accountsMeta =
              ix.accounts?.map((acctIndex: number) => {
                const key = accountKeys[acctIndex];
                return {
                  pubkey: key?.toBase58?.() ?? String(key),
                  isSigner: isSigner(acctIndex),
                  isWritable: isWritable(acctIndex),
                };
              }) ?? [];
          }

          const base: ParsedIx = {
            programId,
            index,
            kind: "other",
            accounts: accountsMeta,
          };

          if (programId === "11111111111111111111111111111111") {
            parsed.push({ ...base, kind: "system" });
          } else if (programId === FAIR_CREDIT_PROGRAM_ADDRESS) {
            try {
              const decoded = parseFairCreditInstruction({
                programAddress: FAIR_CREDIT_PROGRAM_ADDRESS,
                data: ix.data,
                accounts: accountsMeta.map((a) => ({
                  address: a.pubkey,
                  isSigner: a.isSigner,
                  isWritable: a.isWritable,
                })),
              } as any);
              parsed.push({
                ...base,
                kind: "fairCredit",
                fairCreditType: decoded.instructionType,
              });
            } catch (_e) {
              parsed.push({ ...base, kind: "fairCredit" });
            }
          } else {
            parsed.push(base);
          }
        });

        setParsedIxs(parsed);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [connection, signature]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Transaction Detail</h1>
            <p className="text-sm text-muted-foreground">
              Local view of raw Solana transaction and FairCredit instructions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {explorerUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={explorerUrl} target="_blank" rel="noreferrer">
                  View on Solscan
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Signature</span>
              <p className="font-mono break-all">{signature || "—"}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Slot</p>
                <p className="font-medium">{slot ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Block time</p>
                <p className="font-medium">
                  {blockTime
                    ? new Date(blockTime * 1000).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fee (lamports)</p>
                <p className="font-medium">{fee ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Compute units used
                </p>
                <p className="font-medium">{computeUnits ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading transaction…
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive break-all">{error}</p>
            )}
            {!loading && !error && parsedIxs.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No instructions found on this transaction.
              </p>
            )}
            {parsedIxs.map((ix) => (
              <div
                key={ix.index}
                className="rounded-md border bg-card px-3 py-2 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">#{ix.index}</Badge>
                    {ix.kind === "fairCredit" && ix.fairCreditType != null ? (
                      <span className="font-medium">
                        FairCredit · {FairCreditInstruction[ix.fairCreditType]}
                      </span>
                    ) : ix.kind === "fairCredit" ? (
                      <span className="font-medium">FairCredit · Unknown</span>
                    ) : ix.kind === "system" ? (
                      <span className="font-medium">System Program</span>
                    ) : (
                      <span className="font-medium">
                        Program {shortPubkey(ix.programId)}
                      </span>
                    )}
                  </div>
                  {ix.kind === "fairCredit" && (
                    <Badge variant="outline">FairCredit</Badge>
                  )}
                </div>
                <div className="mt-1 grid gap-1 text-xs text-muted-foreground">
                  <div>
                    Program:{" "}
                    <span className="font-mono break-all">{ix.programId}</span>
                  </div>
                  <div>
                    Accounts:
                    <ul className="mt-1 space-y-0.5">
                      {ix.accounts.map((a, idx) => (
                        <li key={`${a.pubkey}-${idx}`} className="flex gap-1">
                          <span className="font-mono break-all">
                            {shortPubkey(a.pubkey)}
                          </span>
                          <span className="text-[10px] uppercase">
                            {a.isSigner ? "signer" : ""}
                            {a.isWritable ? " writable" : " readonly"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground">
          This view is powered by your connected wallet&apos;s RPC endpoint and
          the FairCredit client, not by a third-party explorer.
        </div>

        <div className="pt-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/transactions">Back to history</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function shortPubkey(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

