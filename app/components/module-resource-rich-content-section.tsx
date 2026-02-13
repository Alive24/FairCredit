import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/markdown-editor";
import { ModuleResourceDefaultActivitiesSection } from "@/components/module-resource-default-activities-section";
import type {
  DefaultActivityTemplateDraft,
  DefaultActivityTemplateDraftMap,
} from "@/components/module-resource-editor-helpers";
import type { ModuleDefaultActivityTemplateKind } from "@/lib/resource-nostr-content";

type ModuleResourceRichContentSectionProps = {
  formDisabled: boolean;
  isExternal: boolean;
  moduleMaterialsContent: string;
  onModuleMaterialsContentChange: (value: string) => void;
  moduleGuidance: string;
  onModuleGuidanceChange: (value: string) => void;
  resourceContent: string;
  onResourceContentChange: (value: string) => void;
  defaultActivityDrafts: DefaultActivityTemplateDraftMap;
  onDefaultActivityDraftChange: (
    kind: ModuleDefaultActivityTemplateKind,
    patch: Partial<DefaultActivityTemplateDraft>,
  ) => void;
};

export function ModuleResourceRichContentSection({
  formDisabled,
  isExternal,
  moduleMaterialsContent,
  onModuleMaterialsContentChange,
  moduleGuidance,
  onModuleGuidanceChange,
  resourceContent,
  onResourceContentChange,
  defaultActivityDrafts,
  onDefaultActivityDraftChange,
}: ModuleResourceRichContentSectionProps) {
  if (isExternal) return null;

  const disabled = formDisabled || isExternal;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Module Materials</Label>
        <MarkdownEditor
          value={moduleMaterialsContent}
          onChange={onModuleMaterialsContentChange}
          placeholder="Provide module materials as rich content (links, bullets, references)."
          height={180}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Saved to Nostr rich data and reused for default activities at
          enrollment.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Module Guidance</Label>
        <MarkdownEditor
          value={moduleGuidance}
          onChange={onModuleGuidanceChange}
          placeholder="Provide guidance for students as rich content."
          height={180}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label>Detailed Module Content</Label>
        <MarkdownEditor
          value={resourceContent}
          onChange={onResourceContentChange}
          height={200}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">Stored as rich data in Nostr.</p>
      </div>

      <ModuleResourceDefaultActivitiesSection
        drafts={defaultActivityDrafts}
        disabled={disabled}
        onDraftChange={onDefaultActivityDraftChange}
      />
    </div>
  );
}
