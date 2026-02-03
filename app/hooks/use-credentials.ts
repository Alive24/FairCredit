"use client";

import { useState, useEffect, useCallback } from "react";
import { useFairCredit } from "@/hooks/use-fair-credit";
import {
  CREDENTIAL_DISCRIMINATOR,
  decodeCredential,
} from "@/lib/solana/generated/accounts/credential";
import type { Credential } from "@/lib/solana/generated/accounts";
import type { Address } from "@solana/kit";
import { FAIR_CREDIT_PROGRAM_ADDRESS } from "@/lib/solana/generated/programs";
// @ts-ignore - bs58 types not available
import bs58 from "bs58";

export type CredentialEntry = { credential: Credential; address: Address };

/**
 * Fetches credentials for the given provider wallet only.
 * Pass the provider wallet address to get credentials issued by that provider.
 */
export function useCredentials(providerWallet: string | null) {
  const { rpc } = useFairCredit();
  const [credentials, setCredentials] = useState<CredentialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCredentials = useCallback(async () => {
    if (!providerWallet) {
      setCredentials([]);
      setLoading(false);
      setError(null);
      return;
    }
    const providerLower = providerWallet.toString().toLowerCase();
    setLoading(true);
    setError(null);
    try {
      const discriminatorBase58 = bs58.encode(CREDENTIAL_DISCRIMINATOR);
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

      const list: CredentialEntry[] = [];
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
          const decoded = decodeCredential(encodedAccount);
          if ("data" in decoded) {
            const cred = decoded.data;
            const prov =
              typeof cred.providerWallet === "string"
                ? cred.providerWallet
                : String(cred.providerWallet);
            if (prov.toLowerCase() === providerLower) {
              list.push({ credential: cred, address: decoded.address });
            }
          }
        } catch (e) {
          console.warn("Failed to decode credential account:", e);
        }
      }
      setCredentials(list);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [rpc, providerWallet]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  return { credentials, loading, error, refetch: fetchCredentials };
}
