"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  X,
  Clock,
  AlertTriangle,
  Trash2,
  DollarSign,
  Zap,
  Hash,
} from "lucide-react";
import { BatchOperation, useBatchRegistry } from "@/hooks/use-batch-registry";
import { BatchRegistryManager } from "@/lib/solana/batch-registry";
import { useToast } from "@/hooks/use-toast";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";

interface BatchOperationsPanelProps {
  batchRegistry: ReturnType<typeof useBatchRegistry>;
  onBatchComplete: () => void;
}

export function BatchOperationsPanel({
  batchRegistry,
  onBatchComplete,
}: BatchOperationsPanelProps) {
  const { toast } = useToast();
  const { address, isConnected, sendTransaction, isSending } =
    useAppKitTransaction();
  const [costEstimate, setCostEstimate] = useState<{
    estimatedFee: number;
    computeUnits: number;
    instructionCount: number;
  } | null>(null);

  const {
    pendingOperations,
    isProcessing,
    setIsProcessing,
    removeOperation,
    clearOperations,
    getOperationSummary,
    hasPendingOperations,
  } = batchRegistry;

  const summary = getOperationSummary();

  // Update cost estimate when operations change
  useEffect(() => {
    if (hasPendingOperations) {
      const estimate =
        BatchRegistryManager.estimateBatchCost(pendingOperations);
      setCostEstimate(estimate);
    } else {
      setCostEstimate(null);
    }
  }, [pendingOperations, hasPendingOperations]);

  const executeBatch = async () => {
    if (!hasPendingOperations || !isConnected || !address) {
      toast({
        title: "Error",
        description: "Wallet not connected",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const instructions = await BatchRegistryManager.createBatchInstructions(
        pendingOperations,
        createPlaceholderSigner(address),
      );

      const signature = await sendTransaction(instructions);

      toast({
        title: "Batch Complete",
        description: `${
          pendingOperations.length
        } operations executed successfully. Tx: ${signature.slice(0, 8)}...`,
      });

      clearOperations();
      onBatchComplete();
    } catch (error) {
      console.error("Batch execution failed:", error);
      toast({
        title: "Batch Failed",
        description: `Failed to execute batch operations. ${
          error instanceof Error ? error.message : "Please try again."
        }`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getOperationIcon = (operation: BatchOperation) => {
    if (operation.type === "add") {
      return <Check className="h-4 w-4 text-green-600" />;
    } else {
      return <X className="h-4 w-4 text-red-600" />;
    }
  };

  const getOperationColor = (operation: BatchOperation) => {
    if (operation.type === "add") {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    } else {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    }
  };

  const formatEntityKey = (key: string, type: string) => {
    if (type === "course") {
      return key;
    }
    // For public keys, show first 4 and last 4 characters
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  if (!hasPendingOperations) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Pending Operations
            </CardTitle>
            <CardDescription>
              Review and confirm your registry changes before execution
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="text-orange-600 border-orange-600"
          >
            {summary.total} operations
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-white dark:bg-gray-950 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              +{summary.adds.providers + summary.adds.courses}
            </div>
            <div className="text-sm text-muted-foreground">Additions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              -{summary.removes.providers + summary.removes.courses}
            </div>
            <div className="text-sm text-muted-foreground">Removals</div>
          </div>
          {costEstimate && (
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(costEstimate.estimatedFee / 1e9).toFixed(4)}
              </div>
              <div className="text-sm text-muted-foreground">SOL Fee</div>
            </div>
          )}
        </div>

        {/* Cost Estimate */}
        {costEstimate && (
          <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span>
                Fee: {(costEstimate.estimatedFee / 1e9).toFixed(4)} SOL
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4 text-blue-600" />
              <span>CU: {costEstimate.computeUnits.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Hash className="h-4 w-4 text-blue-600" />
              <span>{costEstimate.instructionCount} instructions</span>
            </div>
          </div>
        )}

        <Separator />

        {/* Operations List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {pendingOperations.map((operation) => (
            <div
              key={operation.id}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-950 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getOperationIcon(operation)}
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={getOperationColor(operation)}>
                      {operation.type} {operation.entityType}
                    </Badge>
                    <span className="text-sm font-medium">
                      {formatEntityKey(
                        operation.entityKey,
                        operation.entityType,
                      )}
                    </span>
                  </div>
                  {operation.entityName && (
                    <div className="text-xs text-muted-foreground">
                      {operation.entityName}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeOperation(operation.id)}
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={clearOperations}
            disabled={isProcessing}
          >
            Clear All
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={executeBatch}
              disabled={
                !hasPendingOperations ||
                isProcessing ||
                isSending ||
                !isConnected
              }
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isProcessing || isSending ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Execute Batch ({summary.total})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            All operations will be executed in a single transaction. If any
            operation fails, the entire batch will be rolled back.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
