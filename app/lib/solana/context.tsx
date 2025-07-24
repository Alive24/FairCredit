"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { SimpleFairCreditClient } from "./simple-client";

interface FairCreditContextType {
  client: SimpleFairCreditClient | null;
  isLoading: boolean;
  error: string | null;
}

const FairCreditContext = createContext<FairCreditContextType>({
  client: null,
  isLoading: false,
  error: null,
});

export function FairCreditProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const [client, setClient] = useState<SimpleFairCreditClient | null>(null);
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

  return (
    <FairCreditContext.Provider value={{ client, isLoading, error }}>
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