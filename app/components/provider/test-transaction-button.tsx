"use client";

import { Button } from "@/components/ui/button";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { address, lamports } from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";

export function TestTransactionButton() {
  const {
    address: walletAddress,
    isConnected,
    sendTransaction,
    isSending,
  } = useAppKitTransaction();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const sendTestTransaction = async () => {
    if (!isConnected || !walletAddress) {
      setStatus("Wallet not connected");
      return;
    }

    setLoading(true);
    setStatus("Creating transaction...");

    try {
      // Self-transfer of 1 lamport using @solana-program/system
      const transferInstruction = getTransferSolInstruction({
        source: createPlaceholderSigner(walletAddress),
        destination: address(walletAddress),
        amount: lamports(1n),
      });

      setStatus("Sending transaction...");
      const signature = await sendTransaction([transferInstruction]);

      setStatus(`Success! Signature: ${signature.slice(0, 8)}...`);
    } catch (error) {
      console.error("Test transaction error:", error);
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={sendTestTransaction}
        disabled={!isConnected || loading || isSending}
        className="w-full"
      >
        {(loading || isSending) && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Test Simple Transaction
      </Button>
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  );
}
