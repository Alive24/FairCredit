import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_ACTIVITY_TEMPLATE_KINDS,
  DEFAULT_ACTIVITY_TEMPLATE_LABEL,
  type DefaultActivityTemplateDraft,
  type DefaultActivityTemplateDraftMap,
} from "@/components/module-resource-editor-helpers";
import type { ModuleDefaultActivityTemplateKind } from "@/lib/resource-nostr-content";

type ModuleResourceDefaultActivitiesSectionProps = {
  drafts: DefaultActivityTemplateDraftMap;
  disabled: boolean;
  onDraftChange: (
    kind: ModuleDefaultActivityTemplateKind,
    patch: Partial<DefaultActivityTemplateDraft>,
  ) => void;
};

export function ModuleResourceDefaultActivitiesSection({
  drafts,
  disabled,
  onDraftChange,
}: ModuleResourceDefaultActivitiesSectionProps) {
  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div>
        <Label>Default Activities On Enrollment</Label>
        <p className="text-xs text-muted-foreground mt-1">
          These templates are created automatically when a student enrolls in the
          course.
        </p>
      </div>

      <div className="space-y-3">
        {DEFAULT_ACTIVITY_TEMPLATE_KINDS.map((kind) => {
          const draft = drafts[kind];
          return (
            <div
              key={kind}
              className="rounded-md border bg-background p-3 space-y-3"
            >
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={draft.enabled}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    onDraftChange(kind, {
                      enabled: checked === true,
                    })
                  }
                />
                {DEFAULT_ACTIVITY_TEMPLATE_LABEL[kind]}
              </label>

              {draft.enabled && (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Title</Label>
                      <Input
                        value={draft.title}
                        onChange={(e) =>
                          onDraftChange(kind, {
                            title: e.target.value,
                          })
                        }
                        placeholder="Activity title"
                        disabled={disabled}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={draft.description}
                        onChange={(e) =>
                          onDraftChange(kind, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Activity description"
                        rows={2}
                        disabled={disabled}
                      />
                    </div>
                  </div>

                  {kind === "AttendMeeting" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Required Attendance Count</Label>
                      <Input
                        type="number"
                        min={1}
                        value={draft.requiredAttendance}
                        onChange={(e) =>
                          onDraftChange(kind, {
                            requiredAttendance: e.target.value,
                          })
                        }
                        placeholder="e.g. 3"
                        disabled={disabled}
                      />
                    </div>
                  )}

                  {kind === "SubmitAssignment" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Required Evidence Count</Label>
                      <Input
                        type="number"
                        min={1}
                        value={draft.requiredEvidenceCount}
                        onChange={(e) =>
                          onDraftChange(kind, {
                            requiredEvidenceCount: e.target.value,
                          })
                        }
                        placeholder="e.g. 1"
                        disabled={disabled}
                      />
                    </div>
                  )}

                  {kind === "AddFeedback" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Required Feedback Entries</Label>
                      <Input
                        type="number"
                        min={1}
                        value={draft.requiredFeedbackEntries}
                        onChange={(e) =>
                          onDraftChange(kind, {
                            requiredFeedbackEntries: e.target.value,
                          })
                        }
                        placeholder="e.g. 2"
                        disabled={disabled}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
