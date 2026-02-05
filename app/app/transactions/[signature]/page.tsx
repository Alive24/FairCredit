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

type IdlType =
  | string
  | { array: [string, number] }
  | { option: IdlType }
  | { defined: string }
  | { vec: IdlType }
  | { coption: IdlType };

type IdlInstruction = {
  name: string;
  discriminator: number[];
  args: Array<{ name: string; type: IdlType }>;
};

type Idl = {
  instructions: IdlInstruction[];
};

let cachedIdl: Idl | null = null;

async function loadIdl(): Promise<Idl | null> {
  if (cachedIdl) return cachedIdl;
  try {
    // Try fetching from public directory first
    const response = await fetch("/fair_credit.json");
    if (response.ok) {
      cachedIdl = (await response.json()) as Idl;
      return cachedIdl;
    }
  } catch {
    // Ignore
  }
  try {
    // Try fetching from target/idl
    const response = await fetch("/target/idl/fair_credit.json");
    if (response.ok) {
      cachedIdl = (await response.json()) as Idl;
      return cachedIdl;
    }
  } catch {
    // Ignore
  }
  try {
    // Try dynamic import (works in dev, may need build-time copy for prod)
    const idlModule = await import("@/../../target/idl/fair_credit.json");
    cachedIdl = (idlModule.default ?? idlModule) as Idl;
    return cachedIdl;
  } catch {
    return null;
  }
}

function instructionTypeToIdlName(
  instructionType: FairCreditInstruction,
): string {
  const names: Record<FairCreditInstruction, string> = {
    [FairCreditInstruction.AddAcceptedCourse]: "add_accepted_course",
    [FairCreditInstruction.AddAcceptedProvider]: "add_accepted_provider",
    [FairCreditInstruction.AddCourseModule]: "add_course_module",
    [FairCreditInstruction.AddCourseToList]: "add_course_to_list",
    [FairCreditInstruction.AddProviderEndorser]: "add_provider_endorser",
    [FairCreditInstruction.AddResource]: "add_resource",
    [FairCreditInstruction.ApproveCredential]: "approve_credential",
    [FairCreditInstruction.CloseCourse]: "close_course",
    [FairCreditInstruction.CloseHub]: "close_hub",
    [FairCreditInstruction.CloseProvider]: "close_provider",
    [FairCreditInstruction.CreateAsset]: "create_asset",
    [FairCreditInstruction.CreateCourse]: "create_course",
    [FairCreditInstruction.CreateCourseList]: "create_course_list",
    [FairCreditInstruction.CreateCredential]: "create_credential",
    [FairCreditInstruction.CreateSubmission]: "create_submission",
    [FairCreditInstruction.EndorseCredential]: "endorse_credential",
    [FairCreditInstruction.GradeSubmission]: "grade_submission",
    [FairCreditInstruction.Initialize]: "initialize",
    [FairCreditInstruction.InitializeHub]: "initialize_hub",
    [FairCreditInstruction.InitializeProvider]: "initialize_provider",
    [FairCreditInstruction.LinkActivityToCredential]:
      "link_activity_to_credential",
    [FairCreditInstruction.MintCredentialNft]: "mint_credential_nft",
    [FairCreditInstruction.RemoveAcceptedCourse]: "remove_accepted_course",
    [FairCreditInstruction.RemoveAcceptedProvider]:
      "remove_accepted_provider",
    [FairCreditInstruction.RemoveCourseFromList]: "remove_course_from_list",
    [FairCreditInstruction.RemoveProviderEndorser]: "remove_provider_endorser",
    [FairCreditInstruction.SetAssetNostrRef]: "set_asset_nostr_ref",
    [FairCreditInstruction.SetAssetWalrusRef]: "set_asset_walrus_ref",
    [FairCreditInstruction.SetCourseListNext]: "set_course_list_next",
    [FairCreditInstruction.SetCourseNostrRef]: "set_course_nostr_ref",
    [FairCreditInstruction.SetResourceNostrRef]: "set_resource_nostr_ref",
    [FairCreditInstruction.SetResourceWalrusRef]: "set_resource_walrus_ref",
    [FairCreditInstruction.SetSubmissionNostrRef]: "set_submission_nostr_ref",
    [FairCreditInstruction.SetSubmissionWalrusRef]:
      "set_submission_walrus_ref",
    [FairCreditInstruction.TransferHubAuthority]: "transfer_hub_authority",
    [FairCreditInstruction.UpdateCourseStatus]: "update_course_status",
    [FairCreditInstruction.UpdateHubConfig]: "update_hub_config",
    [FairCreditInstruction.UpdateResourceData]: "update_resource_data",
  };
  return names[instructionType] ?? "";
}

function idlTypeToRustType(idlType: IdlType): string {
  if (typeof idlType === "string") {
    const typeMap: Record<string, string> = {
      string: "String",
      bool: "bool",
      u8: "u8",
      u16: "u16",
      u32: "u32",
      u64: "u64",
      i8: "i8",
      i16: "i16",
      i32: "i32",
      i64: "i64",
      f32: "f32",
      f64: "f64",
      bytes: "Vec<u8>",
      pubkey: "Pubkey",
    };
    return typeMap[idlType] ?? idlType;
  }
  if ("array" in idlType && Array.isArray(idlType.array)) {
    const [innerType, length] = idlType.array;
    const rustInner = idlTypeToRustType(innerType);
    return `[${rustInner}; ${length}]`;
  }
  if ("option" in idlType) {
    return `Option<${idlTypeToRustType(idlType.option)}>`;
  }
  if ("vec" in idlType) {
    return `Vec<${idlTypeToRustType(idlType.vec)}>`;
  }
  if ("coption" in idlType) {
    return `COption<${idlTypeToRustType(idlType.coption)}>`;
  }
  if ("defined" in idlType) {
    return idlType.defined;
  }
  return "unknown";
}

export default function TransactionDetailPage() {
  const params = useParams<{ signature: string }>();
  const signature =
    typeof params?.signature === "string" ? params.signature : "";
  const { connection } = useAppKitConnection();
  const [idl, setIdl] = useState<Idl | null>(null);

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
    loadIdl().then(setIdl).catch(() => setIdl(null));
  }, []);

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
                    getFairCreditDataEntries(ix, idl, ix.fairCreditType).length >
                      0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-[14px] font-[1000]">Data</p>
                        <ul className="space-y-0.5">
                          {getFairCreditDataEntries(
                            ix,
                            idl,
                            ix.fairCreditType,
                          ).map(({ key, value, type }) => (
                              <li
                                key={key}
                                className="flex flex-wrap items-center gap-2 text-xs"
                              >
                                <span className="font-[800] underline">
                                  {key}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] uppercase"
                                >
                                  {type}
                                </Badge>
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
  idl: Idl | null,
  instructionType?: FairCreditInstruction,
): { key: string; value: string; type: string }[] {
  if (ix.kind !== "fairCredit" || !ix.fairCreditDecoded) return [];
  const decoded: any = ix.fairCreditDecoded;
  const data = decoded.data;
  if (!data || typeof data !== "object") return [];

  // Try to get types from IDL
  let idlArgTypes: Map<string, IdlType> | null = null;
  if (idl && instructionType != null) {
    const idlName = instructionTypeToIdlName(instructionType);
    const idlIx = idl.instructions.find((i) => i.name === idlName);
    if (idlIx) {
      idlArgTypes = new Map(
        idlIx.args.map((arg) => [arg.name, arg.type]),
      );
    }
  }

  const entries: { key: string; value: string; type: string }[] = [];
  for (const [key, raw] of Object.entries(data as Record<string, unknown>)) {
    if (key === "discriminator") continue;
    // Convert camelCase to snake_case for IDL lookup
    const snakeKey = key.replace(
      /[A-Z]/g,
      (letter) => `_${letter.toLowerCase()}`,
    );
    const idlType =
      idlArgTypes?.get(key) ?? idlArgTypes?.get(snakeKey) ?? null;
    const rustType = idlType
      ? idlTypeToRustType(idlType)
      : inferRustType(key, raw);
    entries.push({
      key,
      value: formatDataValue(raw),
      type: rustType,
    });
  }
  return entries;
}

function inferRustType(fieldName: string, raw: unknown): string {
  if (raw == null) return "Option<T>";
  if (typeof raw === "string") {
    // Check for common patterns
    if (fieldName.toLowerCase().includes("tag") || fieldName.toLowerCase().includes("d")) {
      return "String";
    }
    return "String";
  }
  if (typeof raw === "number") {
    // Anchor commonly uses u64 or i64 for timestamps and counts
    if (fieldName.toLowerCase().includes("timestamp") || fieldName.toLowerCase().includes("time")) {
      return "i64";
    }
    if (fieldName.toLowerCase().includes("count") || fieldName.toLowerCase().includes("index")) {
      return "u64";
    }
    // Default to u64 for most numbers in Anchor
    return "u64";
  }
  if (typeof raw === "boolean") {
    return "bool";
  }
  if (raw instanceof Uint8Array) {
    const len = raw.length;
    if (len === 32) {
      // 32 bytes is often Pubkey or [u8; 32]
      if (fieldName.toLowerCase().includes("pubkey") || fieldName.toLowerCase().includes("author")) {
        return "[u8; 32]";
      }
      return "[u8; 32]";
    }
    if (len === 8) {
      return "[u8; 8]";
    }
    return `Vec<u8>`;
  }
  if (
    typeof raw === "object" &&
    raw !== null &&
    "type" in (raw as any) &&
    (raw as any).type === "Buffer" &&
    Array.isArray((raw as any).data)
  ) {
    const bytes = new Uint8Array((raw as any).data as number[]);
    const len = bytes.length;
    if (len === 32) {
      if (fieldName.toLowerCase().includes("pubkey") || fieldName.toLowerCase().includes("author")) {
        return "[u8; 32]";
      }
      return "[u8; 32]";
    }
    if (len === 8) {
      return "[u8; 8]";
    }
    return `Vec<u8>`;
  }
  if (Array.isArray(raw)) {
    return "Vec<T>";
  }
  return "unknown";
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
