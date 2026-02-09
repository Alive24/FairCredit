"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { ResourceKind } from "@/lib/solana/generated/types/resourceKind";

type ResourceFieldsProps = {
  name: string;
  onNameChange: (value: string) => void;
  kind: number;
  onKindChange: (value: number) => void;
  externalId: string;
  onExternalIdChange: (value: string) => void;
  workload: string;
  onWorkloadChange: (value: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
};

export function ResourceFieldsEditor({
  name,
  onNameChange,
  kind,
  onKindChange,
  externalId,
  onExternalIdChange,
  workload,
  onWorkloadChange,
  tags,
  onTagsChange,
  tagInput,
  onTagInputChange,
  onTagInputKeyDown,
  disabled = false,
}: ResourceFieldsProps) {
  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="resource-name">Resource Name</Label>
        <Input
          id="resource-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g., Introduction to Blockchain"
          disabled={disabled}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="resource-kind">Kind</Label>
          <Select
            value={String(kind)}
            onValueChange={(v) => onKindChange(Number(v))}
            disabled={disabled}
          >
            <SelectTrigger id="resource-kind">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ResourceKind).map(([key, value]) => {
                if (typeof value === "number") {
                  return (
                    <SelectItem key={value} value={String(value)}>
                      {key}
                    </SelectItem>
                  );
                }
                return null;
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="resource-external-id">
            External ID{" "}
            <span className="text-muted-foreground text-xs font-normal">
              (opt)
            </span>
          </Label>
          <Input
            id="resource-external-id"
            value={externalId}
            onChange={(e) => onExternalIdChange(e.target.value)}
            placeholder="e.g., video-123"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="resource-workload">
            Workload{" "}
            <span className="text-muted-foreground text-xs font-normal">
              (min)
            </span>
          </Label>
          <Input
            id="resource-workload"
            type="number"
            min={0}
            value={workload}
            onChange={(e) => onWorkloadChange(e.target.value)}
            placeholder="e.g., 60"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="resource-tags">Tags</Label>
        <Input
          id="resource-tags"
          value={tagInput}
          onChange={(e) => onTagInputChange(e.target.value)}
          onKeyDown={onTagInputKeyDown}
          placeholder="Type and press Enter to add tags"
          disabled={disabled}
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {tag}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => !disabled && removeTag(tag)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
