"use client";

import { useCallback, useEffect, useState } from "react";
import { useFairCredit } from "@/hooks/use-fair-credit";
import {
  RESOURCE_DISCRIMINATOR,
  decodeResource,
} from "@/lib/solana/generated/accounts/resource";
import type { Resource } from "@/lib/solana/generated/accounts/resource";
import type { Address } from "@solana/kit";
import { FAIR_CREDIT_PROGRAM_ADDRESS } from "@/lib/solana/generated/programs";
// @ts-ignore - bs58 types not available
import bs58 from "bs58";

export type ResourceEntry = { resource: Resource; address: Address };

/**
 * Fetch resources owned by the provided wallet address.
 */
export function useResources(ownerWallet: string | null) {
  const { rpc } = useFairCredit();
  const [resources, setResources] = useState<ResourceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchResources = useCallback(async () => {
    if (!ownerWallet) {
      setResources([]);
      setLoading(false);
      setError(null);
      return;
    }
    const ownerLower = ownerWallet.toString().toLowerCase();
    setLoading(true);
    setError(null);
    try {
      const discriminatorBase58 = bs58.encode(RESOURCE_DISCRIMINATOR);
      const programAccountsResponse = await (
        rpc.getProgramAccounts(FAIR_CREDIT_PROGRAM_ADDRESS, {
          commitment: "confirmed",
          filters: [
            {
              memcmp: {
                offset: 0,
                bytes: discriminatorBase58,
              },
            },
          ],
          encoding: "base64",
        } as any) as any
      ).send();

      const raw =
        programAccountsResponse?.result ??
        programAccountsResponse?.value ??
        programAccountsResponse;
      const accounts: any[] = Array.isArray(raw)
        ? raw
        : raw && typeof raw === "object"
        ? Object.values(raw)
        : [];

      const list: ResourceEntry[] = [];
      for (const accountInfo of accounts) {
        try {
          const acc = accountInfo?.account ?? accountInfo;
          const dataResponse = acc?.data;
          const base64Data =
            typeof dataResponse === "string"
              ? dataResponse
              : Array.isArray(dataResponse)
              ? dataResponse[0]
              : dataResponse && "value" in dataResponse
              ? (dataResponse.value as string)
              : "";
          if (!base64Data) continue;
          const binaryString = atob(base64Data);
          const accountData = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            accountData[i] = binaryString.charCodeAt(i);
          }
          const pubkeyRaw = accountInfo?.pubkey ?? accountInfo?.key;
          const accountAddress =
            typeof pubkeyRaw === "string"
              ? pubkeyRaw
              : (pubkeyRaw as { toBase58?: () => string })?.toBase58?.() ??
                String(pubkeyRaw);
          const encodedAccount = {
            address: accountAddress as Address,
            data: accountData,
            executable: acc.executable,
            lamports: acc.lamports,
            programAddress: (acc.owner ?? acc.programId) as Address,
            space: acc.space,
          } as any;
          const decoded = decodeResource(encodedAccount);
          if ("data" in decoded) {
            const resource = decoded.data;
            const ownerValue =
              typeof resource.owner === "string"
                ? resource.owner
                : String(resource.owner);
            if (ownerValue.toLowerCase() === ownerLower) {
              list.push({ resource, address: decoded.address });
            }
          }
        } catch (e) {
          console.warn("Failed to decode resource account:", e);
        }
      }
      setResources(list);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [rpc, ownerWallet]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  return { resources, loading, error, refetch: fetchResources };
}
