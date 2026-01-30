"use client";

import { useState, useEffect, useCallback } from "react";
import { useFairCredit } from "@/hooks/use-fair-credit";
import {
  PROVIDER_DISCRIMINATOR,
  decodeProvider,
} from "@/lib/solana/generated/accounts/provider";
import type { Provider } from "@/lib/solana/generated/accounts";
import type { Address } from "@solana/kit";
import { FAIR_CREDIT_PROGRAM_ADDRESS } from "@/lib/solana/generated/programs";
// @ts-ignore - bs58 types not available
import bs58 from "bs58";

export type ProviderEntry = { provider: Provider; address: Address };

export function useProviders() {
  const { rpc } = useFairCredit();
  const [providers, setProviders] = useState<ProviderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const discriminatorBase58 = bs58.encode(PROVIDER_DISCRIMINATOR);
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

      const list: ProviderEntry[] = [];
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
          const decoded = decodeProvider(encodedAccount);
          if ("data" in decoded) {
            list.push({
              provider: decoded.data,
              address: decoded.address,
            });
          }
        } catch (e) {
          console.warn("Failed to decode provider account:", e);
        }
      }
      setProviders(list);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [rpc]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return { providers, loading, error, refetch: fetchProviders };
}
