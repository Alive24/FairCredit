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

      // Verify connection is available
      if (typeof connection.getLatestBlockhash !== "function") {
        throw new Error("Connection object is invalid or not initialized");
      }

      setIsSending(true);
      try {
        // Get latest blockhash - web3.js Connection.getLatestBlockhash() returns
        // { blockhash: string, lastValidBlockHeight: number }
        // Per AppKit docs: https://docs.reown.com/appkit/recipes/solana-send-transaction
        let latestBlockhash;
        try {
          latestBlockhash = await connection.getLatestBlockhash();
        } catch (blockhashError) {
          console.error("getLatestBlockhash error:", blockhashError);
          throw new Error(
            `Failed to get latest blockhash: ${
              blockhashError instanceof Error
                ? blockhashError.message
                : String(blockhashError)
            }`,
          );
        }

        if (!latestBlockhash || !latestBlockhash.blockhash) {
          console.error("Invalid blockhash result:", latestBlockhash);
          throw new Error(
            `Invalid blockhash result: ${JSON.stringify(latestBlockhash)}`,
          );
        }

        const transaction = buildTransactionForAppKit(
          instructions,
          address,
          latestBlockhash.blockhash,
        );

        // Verify transaction has blockhash before sending
        if (!transaction.recentBlockhash) {
          throw new Error("Transaction missing blockhash after build");
        }

        const signature = await walletProvider.sendTransaction(
          transaction,
          connection,
        );
        return signature;
      } catch (error) {
        console.error("Transaction send error:", error);
        // Re-throw with more context if needed
        if (error instanceof Error) {
          throw error;
        }
        throw new Error(`Transaction failed: ${String(error)}`);
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
