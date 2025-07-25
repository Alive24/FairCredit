"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SimpleFairCreditClient } from "./simple-client";
import { HubManagementClient } from "./hub-client-simple";
import { FairCreditClient } from "./fairCreditClient";
import { SimpleProviderClient } from "./simple-provider-client";

interface FairCreditContextType {
  client: SimpleFairCreditClient | null;
  hubClient: HubManagementClient | null;
  fullClient: FairCreditClient | null;
  providerClient: SimpleProviderClient | null;
  connection: any;
  isLoading: boolean;
  error: string | null;
}

const FairCreditContext = createContext<FairCreditContextType>({
  client: null,
  hubClient: null,
  fullClient: null,
  providerClient: null,
  connection: null,
  isLoading: false,
  error: null,
});

export function FairCreditProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [client, setClient] = useState<SimpleFairCreditClient | null>(null);
  const [hubClient, setHubClient] = useState<HubManagementClient | null>(null);
  const [fullClient, setFullClient] = useState<FairCreditClient | null>(null);
  const [providerClient, setProviderClient] = useState<SimpleProviderClient | null>(null);
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
    // Initialize hub client and full client when wallet is connected
    if (wallet.connected && wallet.publicKey) {
      try {
        setIsLoading(true);
        
        console.log("🔧 Initializing clients with wallet:", {
          connected: wallet.connected,
          publicKey: wallet.publicKey?.toBase58(),
          walletName: wallet.wallet?.adapter?.name
        });
        
        // Initialize hub client first
        console.log("🔧 Creating HubManagementClient...");
        const hubManagementClient = new HubManagementClient(connection, wallet);
        setHubClient(hubManagementClient);
        console.log("✅ HubManagementClient created");
        
        // Initialize provider registration client
        console.log("🔧 Creating SimpleProviderClient...");
        const providerRegClient = new SimpleProviderClient(connection, wallet);
        setProviderClient(providerRegClient);
        console.log("✅ SimpleProviderClient created");
        
        // Initialize full client - this might be causing the error
        console.log("🔧 Creating FairCreditClient...");
        try {
          // Add more detailed error logging
          console.log("🔧 Wallet object:", {
            connected: wallet.connected,
            publicKey: wallet.publicKey?.toBase58(),
            walletName: wallet.wallet?.adapter?.name,
            hasSignTransaction: !!wallet.signTransaction,
            hasSignAllTransactions: !!wallet.signAllTransactions
          });
          
          const fairCreditFullClient = new FairCreditClient(connection, wallet);
          setFullClient(fairCreditFullClient);
          console.log("✅ FairCreditClient created");
        } catch (fullClientError) {
          console.warn("⚠️ FairCreditClient failed to initialize, continuing without it:", fullClientError);
          console.warn("⚠️ Error details:", {
            message: fullClientError instanceof Error ? fullClientError.message : 'Unknown error',
            stack: fullClientError instanceof Error ? fullClientError.stack : 'No stack',
            name: fullClientError instanceof Error ? fullClientError.name : 'Unknown name'
          });
          setFullClient(null);
          // Don't fail the entire initialization if only the full client fails
        }
        
        setError(null);
        setIsLoading(false);
      } catch (err) {
        console.error("❌ Failed to initialize clients:", err);
        console.error("❌ Error stack:", err instanceof Error ? err.stack : 'No stack');
        setError(`Failed to initialize wallet clients: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    } else {
      console.log("🔄 Wallet not connected, clearing clients");
      setHubClient(null);
      setFullClient(null);
      setProviderClient(null);
      setIsLoading(false);
    }
  }, [connection, wallet.connected, wallet.publicKey]);

  return (
    <FairCreditContext.Provider value={{ client, hubClient, fullClient, providerClient, connection, isLoading, error }}>
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