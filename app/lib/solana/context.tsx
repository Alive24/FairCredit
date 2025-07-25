"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SimpleFairCreditClient } from "./simple-client";
import { HubManagementClient } from "./hub-client-simple";

interface FairCreditContextType {
  client: SimpleFairCreditClient | null;
  hubClient: HubManagementClient | null;
  connection: any;
  isLoading: boolean;
  error: string | null;
}

const FairCreditContext = createContext<FairCreditContextType>({
  client: null,
  hubClient: null,
  connection: null,
  isLoading: false,
  error: null,
});

export function FairCreditProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [client, setClient] = useState<SimpleFairCreditClient | null>(null);
  const [hubClient, setHubClient] = useState<HubManagementClient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const fairCreditClient = new SimpleFairCreditClient(connection);
      setClient(fairCreditClient);
      setError(null);
    } catch (err) {
      console.error("Failed to initialize FairCredit client:", err);
      setError("Failed to connect to FairCredit program");
    }
  }, [connection]);

  useEffect(() => {
    // Initialize hub client when wallet is connected
    if (wallet.connected && wallet.publicKey) {
      try {
        const hubManagementClient = new HubManagementClient(connection, wallet);
        setHubClient(hubManagementClient);
      } catch (err) {
        console.error("Failed to initialize Hub Management client:", err);
      }
    } else {
      setHubClient(null);
    }
  }, [connection, wallet, wallet.connected, wallet.publicKey]);

  return (
    <FairCreditContext.Provider value={{ client, hubClient, connection, isLoading, error }}>
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