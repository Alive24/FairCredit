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
    entityType: string,
    entityKey: string,
    entityName?: string,
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
  const [entityType, setEntityType] = useState<
    "provider" | "course" | "endorser"
  >("provider");
  const [publicKeyInput, setPublicKeyInput] = useState("");
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
    // Validate input based on entity type
    if (entityType !== "course") {
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

    const entityName =
      name.trim() || `${entityType} ${publicKeyInput.slice(0, 8)}...`;
    onAddToBatch?.(entityType, publicKeyInput, entityName);

    // Reset form
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setPublicKeyInput("");
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
            Add a new provider, course, or endorser to the hub
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
                <SelectItem value="endorser">Endorser</SelectItem>
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
              disabled={loading || !publicKeyInput}
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
