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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { getCloseProviderInstructionAsync } from "@/lib/solana/generated/instructions/closeProvider";
import { Loader2, Trash2 } from "lucide-react";

interface CloseProviderCardProps {
  onClose: () => void;
}

export function CloseProviderCard({ onClose }: CloseProviderCardProps) {
  const { toast } = useToast();
  const { address, isConnected, sendTransaction, isSending } =
    useAppKitTransaction();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCloseProvider = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Connect your wallet to close the Provider account.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const ix = await getCloseProviderInstructionAsync({
        providerAccount: undefined,
        hub: undefined,
        providerAuthority: createPlaceholderSigner(address),
      });
      await sendTransaction([ix]);
      toast({
        title: "Provider account closed",
        description:
          "The Provider account has been closed. Rent has been reclaimed.",
      });
      setConfirmOpen(false);
      onClose();
    } catch (err) {
      console.error(err);
      toast({
        title: "Close Provider failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            Close Provider Account
          </CardTitle>
          <CardDescription>
            Permanently close your provider account and reclaim rent. You can
            register again later. Only the provider authority wallet can do
            this.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!isConnected || loading || isSending}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Close Provider Account
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Provider Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently close your provider account and reclaim rent
              to your wallet. You can register as a new provider again later.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading || isSending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCloseProvider();
              }}
              disabled={loading || isSending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {(loading || isSending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Close Provider
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
