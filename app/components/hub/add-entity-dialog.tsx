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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { address } from "@solana/kit";
import { Loader2 } from "lucide-react";

interface AddEntityDialogProps {
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

export function AddEntityDialog({
  open,
  onOpenChange,
  onSuccess,
  onAddToBatch,
}: AddEntityDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form state
  const [entityType, setEntityType] = useState<"provider" | "course">(
    "provider",
  );
  const [publicKeyInput, setPublicKeyInput] = useState("");
  const [providerWalletInput, setProviderWalletInput] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metadata, setMetadata] = useState("");

  const handleAdd = async () => {
    toast({
      title: "Not Implemented",
      description:
        "Direct add is not yet implemented. Please use 'Add to Batch' instead.",
      variant: "destructive",
    });
  };

  const handleAddToBatch = () => {
    if (entityType === "provider") {
      try {
        address(publicKeyInput);
      } catch (error) {
        toast({
          title: "Invalid Public Key",
          description: "Please enter a valid Solana public key",
          variant: "destructive",
        });
        return;
      }
    }

    if (!publicKeyInput.trim()) {
      toast({
        title: "Missing Input",
        description: `Please enter a ${
          entityType === "course" ? "course ID" : "public key"
        }`,
        variant: "destructive",
      });
      return;
    }

    if (entityType === "course") {
      const pw = providerWalletInput.trim();
      if (!pw) {
        toast({
          title: "Missing Provider Wallet",
          description:
            "Adding a course requires the provider's wallet address.",
          variant: "destructive",
        });
        return;
      }
      try {
        address(pw);
      } catch (error) {
        toast({
          title: "Invalid Provider Wallet",
          description: "Please enter a valid Solana address for the provider.",
          variant: "destructive",
        });
        return;
      }
    }

    const entityName =
      name.trim() || `${entityType} ${publicKeyInput.slice(0, 8)}...`;
    onAddToBatch?.(
      entityType,
      publicKeyInput,
      entityName,
      entityType === "course" ? providerWalletInput.trim() : undefined,
    );

    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setPublicKeyInput("");
    setProviderWalletInput("");
    setName("");
    setDescription("");
    setMetadata("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New Entity</DialogTitle>
          <DialogDescription>
            Add a new provider or course to the hub (endorsers are managed by
            each provider)
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="entity-type">Entity Type</Label>
            <Select
              value={entityType}
              onValueChange={(value: any) => setEntityType(value)}
            >
              <SelectTrigger id="entity-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="course">Course</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="public-key">
              {entityType === "course" ? "Course ID" : "Public Key"}
            </Label>
            <Input
              id="public-key"
              value={publicKeyInput}
              onChange={(e) => setPublicKeyInput(e.target.value)}
              placeholder={
                entityType === "course"
                  ? "Enter course ID..."
                  : "Enter Solana public key..."
              }
            />
          </div>

          {entityType === "course" && (
            <div className="space-y-2">
              <Label htmlFor="provider-wallet">Provider Wallet</Label>
              <Input
                id="provider-wallet"
                value={providerWalletInput}
                onChange={(e) => setProviderWalletInput(e.target.value)}
                placeholder="Provider's Solana wallet address"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${entityType} name...`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Enter ${entityType} description...`}
              className="min-h-[80px]"
            />
          </div>

          {entityType === "course" && (
            <div className="space-y-2">
              <Label htmlFor="metadata">Course Metadata (JSON)</Label>
              <Textarea
                id="metadata"
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                placeholder='{"duration": "12 weeks", "level": "advanced"}'
                className="font-mono text-sm"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {onAddToBatch && (
            <Button
              variant="secondary"
              onClick={handleAddToBatch}
              disabled={
                loading ||
                !publicKeyInput ||
                (entityType === "course" && !providerWalletInput.trim())
              }
            >
              Add to Batch
            </Button>
          )}
          <Button onClick={handleAdd} disabled={loading || !publicKeyInput}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Immediately
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
