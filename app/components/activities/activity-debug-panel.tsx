"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppKitAccount } from "@reown/appkit/react";
import { useUserRole } from "@/hooks/use-user-role";

export function ActivityDebugPanel({
  courseAddress,
}: {
  courseAddress: string;
}) {
  const [open, setOpen] = useState(false);
  const { address, isConnected } = useAppKitAccount();
  const { role } = useUserRole();

  const debugPayload = useMemo(() => {
    return JSON.stringify(
      {
        courseAddress,
        walletConnected: isConnected,
        walletAddress: address ?? null,
        role,
        consumeResourceUi: "disabled_until_contract_update",
        attendanceStrategy:
          "append_attendance_records_on_existing_attendance_activity",
        defaultActivityTemplateSource: "course.modules",
      },
      null,
      2,
    );
  }, [courseAddress, isConnected, address, role]);

  return (
    <Card>
      <Button
        type="button"
        variant="ghost"
        className="w-full h-auto p-0 rounded-xl"
        onClick={() => setOpen((prev) => !prev)}
      >
        <CardHeader className="w-full flex-row items-center justify-between">
          <div className="text-left">
            <CardTitle>Debugging Info</CardTitle>
            <CardDescription>
              Activity page diagnostics and runtime context.
            </CardDescription>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CardHeader>
      </Button>

      {open && (
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            This section is intended for troubleshooting activity grouping,
            role-gating behavior, and default template initialization.
          </p>
          <pre className="max-h-[360px] overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
            {debugPayload}
          </pre>
        </CardContent>
      )}
    </Card>
  );
}
