"use client";

import React, { createContext, useContext, useMemo } from "react";
import { createSolanaRpc } from "@solana/kit";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";

type SolanaRpc = ReturnType<typeof createSolanaRpc>;

interface FairCreditContextType {
  rpc: SolanaRpc;
}

const FairCreditContext = createContext<FairCreditContextType | undefined>(
  undefined,
);

/**
 * Extract RPC URL from web3.js Connection object
 * Connection stores the RPC endpoint in a private _rpcEndpoint property
 */
function getRpcUrlFromConnection(connection: any): string {
  // Try to get RPC URL from connection's private _rpcEndpoint property
  if (connection?._rpcEndpoint) {
    return connection._rpcEndpoint;
  }
  // Fallback: AppKit uses solanaDevnet by default
  return "https://api.devnet.solana.com";
}

export function FairCreditProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { connection } = useAppKitConnection();

  // Get RPC URL from AppKit connection and create @solana/kit RPC
  // We need @solana/kit RPC for Codama-generated account fetching functions
  const rpc = useMemo(() => {
    if (!connection) {
      // Fallback if connection is not available yet
      return createSolanaRpc("https://api.devnet.solana.com");
    }
    const rpcUrl = getRpcUrlFromConnection(connection);
    return createSolanaRpc(rpcUrl);
  }, [connection]);

  const value = useMemo(
    () => ({
      rpc,
    }),
    [rpc],
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
