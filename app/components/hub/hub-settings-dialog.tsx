"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { getCloseHubInstructionAsync } from "@/lib/solana/generated/instructions/closeHub";
import { Loader2, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface HubSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hubData: any;
  onUpdate: () => void;
}

export function HubSettingsDialog({
  open,
  onOpenChange,
  hubData,
  onUpdate,
}: HubSettingsDialogProps) {
  const { toast } = useToast();
  const { address, isConnected, sendTransaction, isSending } =
    useAppKitTransaction();
  const [loading, setLoading] = useState(false);
  const [closeHubConfirmOpen, setCloseHubConfirmOpen] = useState(false);
  const [closeHubLoading, setCloseHubLoading] = useState(false);
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false);

  // Form state
  const [minEndorsements, setMinEndorsements] = useState(
    hubData?.minEndorsements || 2,
  );
  const [autoApproveProviders, setAutoApproveProviders] = useState(
    hubData?.autoApproveProviders || false,
  );
  const [autoApproveCourses, setAutoApproveCourses] = useState(
    hubData?.autoApproveCourses || false,
  );
  const [hubDescription, setHubDescription] = useState(
    hubData?.description || "",
  );
  const [maintenanceMode, setMaintenanceMode] = useState(
    hubData?.maintenanceMode || false,
  );

  const handleSave = async () => {
    toast({
      title: "Not Implemented",
      description:
        "Hub settings update is not yet implemented. Please use batch operations instead.",
      variant: "destructive",
    });
  };

  const handleCloseHub = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Connect your wallet to close the Hub.",
        variant: "destructive",
      });
      return;
    }
    setCloseHubLoading(true);
    try {
      const ix = await getCloseHubInstructionAsync({
        hub: undefined,
        authority: createPlaceholderSigner(address),
      });
      await sendTransaction([ix]);
      toast({
        title: "Hub closed",
        description:
          "The Hub account has been closed. Rent has been reclaimed.",
      });
      setCloseHubConfirmOpen(false);
      onUpdate();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({
        title: "Close Hub failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCloseHubLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Hub Settings</DialogTitle>
          <DialogDescription>
            Configure global settings for the FairCredit hub
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Hub Description</Label>
            <Textarea
              id="description"
              value={hubDescription}
              onChange={(e) => setHubDescription(e.target.value)}
              placeholder="Enter a description for the hub..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-endorsements">
              Minimum Endorsements Required
            </Label>
            <Input
              id="min-endorsements"
              type="number"
              min="1"
              max="10"
              value={minEndorsements}
              onChange={(e) => setMinEndorsements(parseInt(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-approve-providers">
              Auto-approve Providers
            </Label>
            <Switch
              id="auto-approve-providers"
              checked={autoApproveProviders}
              onCheckedChange={setAutoApproveProviders}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-approve-courses">Auto-approve Courses</Label>
            <Switch
              id="auto-approve-courses"
              checked={autoApproveCourses}
              onCheckedChange={setAutoApproveCourses}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
              <p className="text-xs text-muted-foreground">
                Temporarily disable new registrations
              </p>
            </div>
            <Switch
              id="maintenance-mode"
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
            />
          </div>

          {/* Danger zone: Close Hub — collapsed by default */}
          <Collapsible
            open={dangerZoneOpen}
            onOpenChange={setDangerZoneOpen}
            className="border-t pt-4 mt-4"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between py-2 text-left text-sm font-medium text-destructive hover:opacity-80"
              >
                <span>Danger zone</span>
                {dangerZoneOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground">
                Closing the Hub will permanently remove the account and reclaim
                rent. Only the Hub authority can do this. This action cannot be
                undone.
              </p>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={!isConnected || closeHubLoading || isSending}
                onClick={() => setCloseHubConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Close Hub
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <AlertDialog
          open={closeHubConfirmOpen}
          onOpenChange={setCloseHubConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Close Hub?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently close the Hub account and reclaim rent to
                your wallet. You will need to initialize a new Hub to use the
                platform again. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={closeHubLoading || isSending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleCloseHub();
                }}
                disabled={closeHubLoading || isSending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {(closeHubLoading || isSending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Close Hub
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
