"use client";

import { useState, useEffect, useCallback } from "react";
import { useFairCredit } from "@/hooks/use-fair-credit";
import {
  COURSE_DISCRIMINATOR,
  decodeCourse,
} from "@/lib/solana/generated/accounts/course";
import type { Course } from "@/lib/solana/generated/accounts";
import type { Address } from "@solana/kit";
import { FAIR_CREDIT_PROGRAM_ADDRESS } from "@/lib/solana/generated/programs";
// @ts-ignore - bs58 types not available
import bs58 from "bs58";

export type CourseEntry = { course: Course; address: Address };

/**
 * Fetches courses for the given provider wallet addresses only (no global search).
 * Pass accepted provider wallets to get courses submitted by those providers.
 */
export function useCourses(providerWallets: string[] | null) {
  const { rpc } = useFairCredit();
  const [courses, setCourses] = useState<CourseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCourses = useCallback(async () => {
    if (!providerWallets?.length) {
      setCourses([]);
      setLoading(false);
      setError(null);
      return;
    }
    const providerSet = new Set(
      providerWallets.map((w) => w.toString().toLowerCase()),
    );
    setLoading(true);
    setError(null);
    try {
      const discriminatorBase58 = bs58.encode(COURSE_DISCRIMINATOR);
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

      const list: CourseEntry[] = [];
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
          const decoded = decodeCourse(encodedAccount);
          if ("data" in decoded) {
            const course = decoded.data;
            const courseProvider =
              typeof course.provider === "string"
                ? course.provider
                : String(course.provider);
            if (providerSet.has(courseProvider.toLowerCase())) {
              list.push({ course, address: decoded.address });
            }
          }
        } catch (e) {
          console.warn("Failed to decode course account:", e);
        }
      }
      setCourses(list);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [rpc, providerWallets?.length, providerWallets?.join(",")]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return { courses, loading, error, refetch: fetchCourses };
}
