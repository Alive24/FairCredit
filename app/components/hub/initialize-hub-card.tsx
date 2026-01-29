"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import { getInitializeHubInstructionAsync } from "@/lib/solana/generated/instructions/initializeHub";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { Loader2, Shield } from "lucide-react";

interface InitializeHubCardProps {
  onSuccess: () => void;
}

export function InitializeHubCard({ onSuccess }: InitializeHubCardProps) {
  const { toast } = useToast();
  const { address, isConnected, walletProvider, sendTransaction, isSending } =
    useAppKitTransaction();
  const [loading, setLoading] = useState(false);

  const handleInit = async () => {
    if (!isConnected || !address || !walletProvider) {
      toast({
        title: "Wallet not connected",
        description: "Connect your wallet to initialize the Hub.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const ix = await getInitializeHubInstructionAsync({
        hub: undefined,
        authority: createPlaceholderSigner(address),
        systemProgram: undefined,
      });
      const signature = await sendTransaction([ix]);
      toast({
        title: "Hub initialized",
        description: `Transaction: ${signature?.slice(0, 8)}...`,
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      toast({
        title: "Initialize failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Initialize Hub</CardTitle>
          </div>
          <CardDescription>
            Hub is not created yet. Connect the wallet that will be the Hub
            authority and click below to create the Hub account on-chain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleInit}
            disabled={loading || isSending || !isConnected || !walletProvider}
          >
            {(loading || isSending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Initialize Hub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
