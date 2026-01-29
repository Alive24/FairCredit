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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { Loader2 } from "lucide-react";

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
  const [loading, setLoading] = useState(false);

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
        </div>

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
