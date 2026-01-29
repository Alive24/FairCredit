"use client";

import type React from "react";
import { useMemo } from "react";
import { createAppKit } from "@reown/appkit/react";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { solanaDevnet } from "@reown/appkit/networks";
import { FairCreditProvider } from "@/hooks/use-fair-credit";

// Get projectId from environment or use a default for localhost
const projectId =
  process.env.NEXT_PUBLIC_PROJECT_ID || "b56e18d47c72ab683b10814fe9495694"; // public projectId for localhost

// Set up Solana Adapter
const solanaAdapter = new SolanaAdapter();

// Create metadata
const metadata = {
  name: "FairCredit",
  description: "FairCredit Application",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://faircredit.com",
  icons: ["https://faircredit.com/icon.png"],
};

// Initialize AppKit (must be called outside component)
createAppKit({
  adapters: [solanaAdapter],
  networks: [solanaDevnet],
  metadata,
  projectId,
  features: {
    analytics: true,
  },
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const rpcUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com"
    );
  }, []);

  return <FairCreditProvider rpcUrl={rpcUrl}>{children}</FairCreditProvider>;
}
