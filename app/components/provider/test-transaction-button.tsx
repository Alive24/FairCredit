"use client";

import { Button } from "@/components/ui/button";
import { useAppKitAccount } from "@reown/appkit/react";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { address } from "@solana/kit";
import { useSendTransaction, useWallet } from "@solana/react-hooks";
import { getTransferSolInstruction } from "@solana-program/system";
import { lamports } from "@solana/kit";

export function TestTransactionButton() {
  const wallet = useWallet();
  const { send, isSending } = useSendTransaction();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const sendTestTransaction = async () => {
    if (wallet.status !== "connected" || !wallet.session?.account) {
      setStatus("Wallet not connected");
      return;
    }

    setLoading(true);
    setStatus("Creating transaction...");

    try {
      const transferInstruction = getTransferSolInstruction({
        source: wallet.session.account,
        destination: wallet.session.account.address,
        amount: lamports(BigInt(1)),
      });

      setStatus("Sending transaction...");
      const signature = await send({ instructions: [transferInstruction] });

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
        disabled={wallet.status !== "connected" || loading || isSending}
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
