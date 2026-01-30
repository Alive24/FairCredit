"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, RefreshCw, Check } from "lucide-react";
import { useIsHubAuthority } from "@/hooks/use-is-hub-authority";
import { useProviders } from "@/hooks/use-providers";
import type { Address } from "@solana/kit";
import { Card } from "@/components/ui/card";

interface ReviewProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onAddToBatch?: (
    entityType: "provider" | "course",
    entityKey: string,
    entityName?: string,
    providerWallet?: string,
  ) => void;
}

export function ReviewProviderDialog({
  open,
  onOpenChange,
  onSuccess,
  onAddToBatch,
}: ReviewProviderDialogProps) {
  const { toast } = useToast();
  const { hubData } = useIsHubAuthority();
  const { providers, loading, refetch } = useProviders();

  const isAccepted = (wallet: string) =>
    hubData?.acceptedProviders?.some((p: Address) => {
      const a = typeof p === "string" ? p : String(p);
      return a === wallet;
    });

  const pendingProviders = providers.filter(({ provider }) => {
    const w =
      typeof provider.wallet === "string"
        ? provider.wallet
        : String(provider.wallet);
    return !isAccepted(w);
  });

  const handleApprove = (wallet: string, name: string) => {
    if (!onAddToBatch) return;
    onAddToBatch("provider", wallet, name);
    toast({
      title: "已加入批次",
      description: `Provider "${name}" 已加入待执行列表，请在批次操作中提交。`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Review Providers</DialogTitle>
          <DialogDescription>
            Approve pending providers to add them to the hub. Only providers
            that have registered on-chain but are not yet accepted are listed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={loading}
              title="Refresh provider list"
            >
              <RefreshCw
                className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingProviders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No pending providers. All registered providers are already
              accepted, or none have registered yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {pendingProviders.map(({ provider }) => {
                const wallet =
                  typeof provider.wallet === "string"
                    ? provider.wallet
                    : String(provider.wallet);
                return (
                  <Card
                    key={wallet}
                    className="p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">
                          {provider.name}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>{provider.email}</p>
                        <p className="font-mono truncate" title={wallet}>
                          {wallet.slice(0, 8)}...{wallet.slice(-6)}
                        </p>
                        <p>{provider.providerType}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleApprove(wallet, provider.name)}
                      disabled={!onAddToBatch}
                      className="shrink-0"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      通过
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
