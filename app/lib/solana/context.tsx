"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { Wallet as AnchorWallet } from "@coral-xyz/anchor";
import type { Connection } from "@solana/web3.js";
import {
  FairCreditHubClient,
  FairCreditMentorClient,
  FairCreditProviderClient,
  FairCreditReadonlyClient,
  FairCreditVerifierClient,
  createFairCreditRoleClients,
} from "./fairCreditClient";

interface FairCreditContextType {
  client: FairCreditReadonlyClient | null;
  providerClient: FairCreditProviderClient | null;
  hubClient: FairCreditHubClient | null;
  verifierClient: FairCreditVerifierClient | null;
  mentorClient: FairCreditMentorClient | null;
  connection: Connection | null;
  isLoading: boolean;
  error: string | null;
}

const FairCreditContext = createContext<FairCreditContextType>({
  client: null,
  providerClient: null,
  hubClient: null,
  verifierClient: null,
  mentorClient: null,
  connection: null,
  isLoading: false,
  error: null,
});

export function FairCreditProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [client, setClient] = useState<FairCreditReadonlyClient | null>(null);
  const [providerClient, setProviderClient] = useState<FairCreditProviderClient | null>(null);
  const [hubClient, setHubClient] = useState<FairCreditHubClient | null>(null);
  const [verifierClient, setVerifierClient] = useState<FairCreditVerifierClient | null>(null);
  const [mentorClient, setMentorClient] = useState<FairCreditMentorClient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const readonlyClient = new FairCreditReadonlyClient(connection);
      setClient(readonlyClient);
      setError(null);
    } catch (err) {
      console.error("Failed to initialize FairCredit client:", err);
      setError("Failed to connect to FairCredit program");
      setClient(null);
    }
  }, [connection]);

  useEffect(() => {
    if (wallet.connected && wallet.publicKey && wallet.signTransaction && wallet.signAllTransactions) {
      try {
        setIsLoading(true);
        const anchorWallet = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction.bind(wallet),
          signAllTransactions: wallet.signAllTransactions.bind(wallet),
        } as AnchorWallet;

        const { providerClient, hubClient, verifierClient, mentorClient } = createFairCreditRoleClients(
          connection,
          anchorWallet,
        );

        setProviderClient(providerClient);
        setHubClient(hubClient);
        setVerifierClient(verifierClient);
        setMentorClient(mentorClient);
        setError(null);
      } catch (err) {
        console.error("❌ Failed to initialize signer clients:", err);
        setProviderClient(null);
        setHubClient(null);
        setVerifierClient(null);
        setMentorClient(null);
        setError(
          `Failed to initialize wallet clients: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      } finally {
        setIsLoading(false);
      }
    } else {
      setProviderClient(null);
      setHubClient(null);
      setVerifierClient(null);
      setMentorClient(null);
      setIsLoading(false);
    }
  }, [connection, wallet]);

  return (
    <FairCreditContext.Provider
      value={{
        client,
        providerClient,
        hubClient,
        verifierClient,
        mentorClient,
        connection,
        isLoading,
        error,
      }}
    >
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
