"use client";

import { useCallback, useState } from "react";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";
import type { Provider } from "@reown/appkit-adapter-solana/react";
import type { Instruction } from "@solana/kit";
import { buildTransactionForAppKit } from "@/lib/solana/appkit-bridge";

export function useAppKitTransaction() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Provider>("solana");
  const { connection } = useAppKitConnection();
  const [isSending, setIsSending] = useState(false);

  const sendTransaction = useCallback(
    async (instructions: Instruction[]): Promise<string> => {
      if (!isConnected || !address || !walletProvider || !connection) {
        throw new Error("Wallet not connected");
      }

      setIsSending(true);
      try {
        const { blockhash } = await connection.getLatestBlockhash();
        const transaction = buildTransactionForAppKit(
          instructions,
          address,
          blockhash,
        );
        const signature = await walletProvider.sendTransaction(
          transaction,
          connection,
        );
        return signature;
      } finally {
        setIsSending(false);
      }
    },
    [isConnected, address, walletProvider, connection],
  );

  return {
    address,
    isConnected,
    walletProvider,
    connection,
    sendTransaction,
    isSending,
  };
}
