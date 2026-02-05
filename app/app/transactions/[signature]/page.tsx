"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";
import bs58 from "bs58";
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
  fairCreditDecoded?: unknown;
  fairCreditDecodeError?: string;
  // Debug info for troubleshooting parsing
  rawDataType?: string;
  rawDataIsUint8?: boolean;
  rawDataIsString?: boolean;
  rawDataPreview?: string;
  normalizedDataLength?: number | null;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
};

export default function TransactionDetailPage() {
  const params = useParams<{ signature: string }>();
  const signature =
    typeof params?.signature === "string" ? params.signature : "";
  const { connection } = useAppKitConnection();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [blockTime, setBlockTime] = useState<number | null>(null);
  const [fee, setFee] = useState<number | null>(null);
  const [computeUnits, setComputeUnits] = useState<number | null>(null);
  const [parsedIxs, setParsedIxs] = useState<ParsedIx[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [expandedDecoded, setExpandedDecoded] = useState<
    Record<number, boolean>
  >({});

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
          // Support multiple shapes:
          // - web3.js TransactionInstruction: { programId, data, keys }
          // - web3.js MessageCompiledInstruction: { programIdIndex, accountKeyIndexes, data }
          // - kit Instruction: { programAddress, data, accounts }
          let programId: string;
          let dataBytes: Uint8Array | undefined;
          const rawData: unknown = (ix as any).data;
          let accountsMeta: {
            pubkey: string;
            isSigner: boolean;
            isWritable: boolean;
          }[] = [];

          if ("programId" in ix) {
            // Legacy TransactionInstruction style.
            programId = ix.programId.toBase58();
            dataBytes = normalizeIxData(ix.data);
            accountsMeta =
              ix.keys?.map((k: any) => ({
                pubkey: k.pubkey.toBase58(),
                isSigner: Boolean(k.isSigner),
                isWritable: Boolean(k.isWritable),
              })) ?? [];
          } else if ("programAddress" in ix) {
            // Kit Instruction style.
            programId = String(ix.programAddress);
            dataBytes = normalizeIxData(ix.data);
            accountsMeta =
              ix.accounts?.map((m: any) => ({
                pubkey: String(m.address ?? m.pubkey ?? m),
                isSigner: Boolean(m.isSigner),
                isWritable: Boolean(m.isWritable),
              })) ?? [];
          } else {
            // Compiled instruction: use accountKeyIndexes.
            const programKey = accountKeys[ix.programIdIndex];
            programId = programKey?.toBase58?.() ?? String(programKey);
            dataBytes = normalizeIxData(ix.data);
            const isSigner = (accountIndex: number) =>
              typeof message.isAccountSigner === "function"
                ? message.isAccountSigner(accountIndex)
                : false;
            const isWritable = (accountIndex: number) =>
              typeof message.isAccountWritable === "function"
                ? message.isAccountWritable(accountIndex)
                : false;
            const indices: number[] =
              (ix.accountKeyIndexes as number[] | undefined) ??
              (ix.accounts as number[] | undefined) ??
              [];
            accountsMeta = indices.map((acctIndex: number) => {
              const key = accountKeys[acctIndex];
              return {
                pubkey: key?.toBase58?.() ?? String(key),
                isSigner: isSigner(acctIndex),
                isWritable: isWritable(acctIndex),
              };
            });
          }

          const base: ParsedIx = {
            programId,
            index,
            kind: "other",
            rawDataType: typeof rawData,
            rawDataIsUint8: rawData instanceof Uint8Array,
            rawDataIsString: typeof rawData === "string",
            rawDataPreview: previewRawData(rawData),
            normalizedDataLength: dataBytes?.length ?? null,
            accounts: accountsMeta,
          };

          if (programId === "11111111111111111111111111111111") {
            parsed.push({ ...base, kind: "system" });
          } else if (programId === FAIR_CREDIT_PROGRAM_ADDRESS) {
            try {
              const decoded = parseFairCreditInstruction({
                programAddress: FAIR_CREDIT_PROGRAM_ADDRESS,
                data: dataBytes ?? new Uint8Array(),
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
                fairCreditDecoded: decoded,
              });
            } catch (e) {
              parsed.push({
                ...base,
                kind: "fairCredit",
                fairCreditDecodeError:
                  e instanceof Error ? e.message : String(e),
              });
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
                    <p className="text-[14px] font-[1000]">Accounts</p>
                    <ul className="mt-1 space-y-0.5">
                      {ix.accounts.map((a, idx) => {
                        const label = getAccountLabel(ix, a.pubkey, idx);
                        return (
                          <li
                            key={`${a.pubkey}-${idx}`}
                            className="flex flex-wrap items-center gap-2"
                          >
                            {label && (
                              <span className="text-[11px] font-[800] underline">
                                {label}:
                              </span>
                            )}
                            <span className="font-mono break-all text-xs">
                              {a.pubkey}
                            </span>
                            {a.isSigner && (
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase"
                              >
                                SIGNER
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase"
                            >
                              {a.isWritable ? "WRITABLE" : "READONLY"}
                            </Badge>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  {ix.kind === "fairCredit" &&
                    !!ix.fairCreditDecoded &&
                    getFairCreditDataEntries(ix).length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-[14px] font-[1000]">Data</p>
                        <ul className="space-y-0.5">
                          {getFairCreditDataEntries(ix).map(
                            ({ key, value }) => (
                              <li key={key} className="text-xs">
                                <span className="font-[800] underline">
                                  {key}:{" "}
                                </span>
                                <span className="font-mono break-all">
                                  {value}
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  {ix.kind === "fairCredit" && !!ix.fairCreditDecoded && (
                    <div className="mt-2">
                      <button
                        type="button"
                        className="mb-1 text-[11px] text-primary underline"
                        onClick={() =>
                          setExpandedDecoded((prev) => ({
                            ...prev,
                            [ix.index]: !prev[ix.index],
                          }))
                        }
                      >
                        {expandedDecoded[ix.index]
                          ? "Hide decoded (Codama/IDL)"
                          : "Show decoded (Codama/IDL)"}
                      </button>
                      {expandedDecoded[ix.index] && (
                        <pre className="max-h-64 overflow-auto rounded bg-muted p-2 font-mono text-[10px] leading-snug">
                          {JSON.stringify(ix.fairCreditDecoded, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground">
          This view is powered by your connected wallet&apos;s RPC endpoint and
          the FairCredit client, not by a third-party explorer.
        </div>

        <div className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/transactions">Back to history</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebug((v) => !v)}
            >
              {showDebug ? "Hide debugging info" : "Show debugging info"}
            </Button>
          </div>

          {showDebug && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Debugging Info</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs text-muted-foreground">
                  Internal debugging payload for the transaction instruction
                  parser.
                </p>
                <pre className="max-h-[400px] overflow-auto rounded bg-muted p-2 font-mono text-[10px] leading-snug whitespace-pre-wrap">
                  {JSON.stringify(parsedIxs, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function shortPubkey(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function normalizeIxData(raw: unknown): Uint8Array | undefined {
  if (!raw) return undefined;
  if (raw instanceof Uint8Array) return raw;
  // TypedArray / Buffer-like with buffer + byteLength.
  if (
    typeof raw === "object" &&
    raw !== null &&
    "buffer" in (raw as any) &&
    "byteLength" in (raw as any)
  ) {
    const view = raw as {
      buffer: ArrayBufferLike;
      byteLength: number;
      byteOffset?: number;
    };
    return new Uint8Array(view.buffer, view.byteOffset ?? 0, view.byteLength);
  }
  if (Array.isArray(raw)) {
    return new Uint8Array(raw as number[]);
  }
  if (typeof raw === "string") {
    // Some RPC shapes return compiled instruction data as base58 strings.
    try {
      return bs58.decode(raw);
    } catch {
      return undefined;
    }
  }
  try {
    if (raw instanceof ArrayBuffer) {
      return new Uint8Array(raw);
    }
    return new Uint8Array(raw as ArrayLike<number>);
  } catch {
    return undefined;
  }
}

function previewRawData(raw: unknown): string {
  if (raw == null) return "null";
  if (typeof raw === "string") {
    return raw.length > 80 ? `${raw.slice(0, 80)}…` : raw;
  }
  if (raw instanceof Uint8Array) {
    return `Uint8Array(len=${raw.length})`;
  }
  if (Array.isArray(raw)) {
    return `Array(len=${raw.length})`;
  }
  if (typeof raw === "object") {
    try {
      const json = JSON.stringify(raw);
      return json.length > 80 ? `${json.slice(0, 80)}…` : json;
    } catch {
      return "[object]";
    }
  }
  return String(raw);
}

function getAccountLabel(
  ix: ParsedIx,
  pubkey: string,
  index: number,
): string | null {
  if (ix.kind !== "fairCredit" || !ix.fairCreditDecoded) return null;
  const decoded: any = ix.fairCreditDecoded;
  const accounts = decoded.accounts;
  if (!accounts || typeof accounts !== "object") return null;

  // Try to match by address field when available.
  const entries = Object.entries(accounts) as [string, any][];
  for (const [name, meta] of entries) {
    const addr =
      typeof meta?.address === "string"
        ? meta.address
        : typeof meta?.pubkey === "string"
        ? meta.pubkey
        : undefined;
    if (addr === pubkey) {
      return name;
    }
  }

  // Fallback: if we have no match but we know the order (closeCourse has exactly 4 accounts).
  if (
    decoded.instructionType === FairCreditInstruction.CloseCourse &&
    entries.length === 4
  ) {
    const orderedNames = ["course", "provider", "hub", "providerAuthority"];
    return orderedNames[index] ?? null;
  }

  return null;
}

function getFairCreditDataEntries(
  ix: ParsedIx,
): { key: string; value: string }[] {
  if (ix.kind !== "fairCredit" || !ix.fairCreditDecoded) return [];
  const decoded: any = ix.fairCreditDecoded;
  const data = decoded.data;
  if (!data || typeof data !== "object") return [];

  const entries: { key: string; value: string }[] = [];
  for (const [key, raw] of Object.entries(data as Record<string, unknown>)) {
    if (key === "discriminator") continue;
    entries.push({ key, value: formatDataValue(raw) });
  }
  return entries;
}

function formatDataValue(raw: unknown): string {
  if (raw == null) return "null";
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }
  if (raw instanceof Uint8Array) {
    return formatBytes(raw);
  }
  if (
    typeof raw === "object" &&
    raw !== null &&
    "type" in (raw as any) &&
    (raw as any).type === "Buffer" &&
    Array.isArray((raw as any).data)
  ) {
    return formatBytes(new Uint8Array((raw as any).data as number[]));
  }
  if (Array.isArray(raw)) {
    const arr = raw as unknown[];
    if (arr.length <= 10) {
      try {
        return JSON.stringify(arr);
      } catch {
        return `Array(${arr.length})`;
      }
    }
    return `Array(${arr.length})`;
  }
  try {
    const json = JSON.stringify(raw);
    return json.length > 80 ? `${json.slice(0, 80)}…` : json;
  } catch {
    return String(raw);
  }
}

function formatBytes(bytes: Uint8Array): string {
  const prefix = Array.from(bytes.slice(0, 256))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const suffix = bytes.length > 256 ? "…" : "";
  return `0x${prefix}${suffix}`;
}
