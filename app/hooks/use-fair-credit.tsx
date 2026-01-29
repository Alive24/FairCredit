"use client";

import React, { createContext, useContext, useMemo } from "react";
import { createSolanaRpc } from "@solana/kit";

type SolanaRpc = ReturnType<typeof createSolanaRpc>;

interface FairCreditContextType {
  rpcUrl: string;
  rpc: SolanaRpc;
}

const FairCreditContext = createContext<FairCreditContextType | undefined>(
  undefined,
);

export function FairCreditProvider({
  children,
  rpcUrl,
}: {
  children: React.ReactNode;
  rpcUrl: string;
}) {
  // Create and memoize RPC client instance
  const rpc = useMemo(() => createSolanaRpc(rpcUrl), [rpcUrl]);

  const value = useMemo(
    () => ({
      rpcUrl,
      rpc,
    }),
    [rpcUrl, rpc],
  );

  return (
    <FairCreditContext.Provider value={value}>
      {children}
    </FairCreditContext.Provider>
  );
}

export function useFairCredit() {
  const context = useContext(FairCreditContext);
  if (!context) {
    throw new Error("useFairCredit must be used within a FairCreditProvider");
  }
  return context;
}
