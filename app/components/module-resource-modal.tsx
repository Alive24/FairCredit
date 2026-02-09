"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ModuleResourceEditor,
  ModuleResourceEditorProps,
} from "./module-resource-editor";

type ModuleResourceModalProps = Omit<ModuleResourceEditorProps, "onCancel"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModuleResourceModal({
  open,
  onOpenChange,
  mode,
  ...editorProps
}: ModuleResourceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create New Module" : "Edit Module Resource"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a learning resource and add it as a course module."
              : "Update resource details and module weight."}
          </DialogDescription>
        </DialogHeader>
        <ModuleResourceEditor
          {...editorProps}
          mode={mode}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
