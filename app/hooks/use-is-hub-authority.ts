"use client";

import { useState, useEffect, useCallback } from "react";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { useAppKitAccount } from "@reown/appkit/react";
import { useToast } from "@/hooks/use-toast";
import { canonicalAddress } from "@/lib/utils/canonical-address";
import { fetchMaybeHub } from "@/lib/solana/generated/accounts";
import type { Hub } from "@/lib/solana/generated/accounts";
import { getUpdateHubConfigInstructionAsync } from "@/lib/solana/generated/instructions/updateHubConfig";
import { DEFAULT_PLACEHOLDER_SIGNER } from "@/lib/solana/placeholder-signer";

export function useIsHubAuthority(): {
  isHubAuthority: boolean;
  loading: boolean;
  hubData: Hub | null;
  refreshHubData: () => Promise<void>;
} {
  const { rpc } = useFairCredit();
  const { address: walletAddress } = useAppKitAccount();
  const { toast } = useToast();
  const [hubData, setHubData] = useState<Hub | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHubAuthority, setIsHubAuthority] = useState(false);

  const fetchHub = useCallback(async () => {
    setLoading(true);
    try {
      const instruction = await getUpdateHubConfigInstructionAsync({
        hub: undefined,
        authority: DEFAULT_PLACEHOLDER_SIGNER,
        config: {
          requireProviderApproval: false,
          minReputationScore: 0,
        },
      });
      const hubAddress = instruction.accounts[0].address;
      const hubAccount = await fetchMaybeHub(rpc, hubAddress);
      const hub = hubAccount.exists ? hubAccount.data : null;
      setHubData(hub);

      const walletCanon = canonicalAddress(walletAddress);
      const authorityCanon = canonicalAddress(hub?.authority);
      setIsHubAuthority(
        !!(walletCanon && authorityCanon && walletCanon === authorityCanon),
      );
    } catch (e) {
      console.error("Failed to fetch hub data:", e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [rpc, walletAddress]);

  useEffect(() => {
    fetchHub().catch(() =>
      toast({
        title: "Error",
        description: "Failed to fetch hub data. Please try again.",
        variant: "destructive",
      }),
    );
  }, [fetchHub, toast]);

  const refreshHubData = useCallback(async () => {
    try {
      await fetchHub();
      toast({
        title: "Success",
        description: "Hub data refreshed successfully",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to refresh hub data. Please try again.",
        variant: "destructive",
      });
    }
  }, [fetchHub, toast]);

  return { isHubAuthority, loading, hubData, refreshHubData };
}
