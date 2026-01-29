import type { Instruction, TransactionSigner } from "@solana/kit";
import { address } from "@solana/kit";
import {
  getAddAcceptedProviderInstructionAsync,
  getRemoveAcceptedProviderInstructionAsync,
  getAddAcceptedCourseInstructionAsync,
  getRemoveAcceptedCourseInstructionAsync,
} from "./generated/instructions";
import { BatchOperation } from "@/hooks/use-batch-registry";

export class BatchRegistryManager {
  /**
   * Create instruction for a single operation
   */
  static async createInstructionForOperation(
    operation: BatchOperation,
    authority: TransactionSigner,
  ): Promise<Instruction> {
    const { type, entityType, entityKey, providerWallet } = operation;

    switch (entityType) {
      case "provider":
        return this.createProviderInstruction(type, entityKey, authority);

      case "course":
        return this.createCourseInstruction(
          type,
          entityKey,
          authority,
          providerWallet,
        );

      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private static async createProviderInstruction(
    type: "add" | "remove",
    providerKey: string,
    authority: TransactionSigner,
  ): Promise<Instruction> {
    const providerWallet = address(providerKey);

    if (type === "add") {
      // Codama will automatically derive the hub and provider PDAs
      return getAddAcceptedProviderInstructionAsync({
        hub: undefined,
        authority,
        provider: undefined,
        providerWallet,
      });
    }

    // Codama will automatically derive the hub PDA
    return getRemoveAcceptedProviderInstructionAsync({
      hub: undefined,
      authority,
      providerWallet,
    });
  }

  private static async createCourseInstruction(
    type: "add" | "remove",
    courseId: string,
    authority: TransactionSigner,
    providerWallet?: string,
  ): Promise<Instruction> {
    if (type === "add") {
      if (!providerWallet) {
        throw new Error(
          "Add course requires providerWallet (provider's wallet address).",
        );
      }
      return getAddAcceptedCourseInstructionAsync({
        hub: undefined,
        authority,
        course: undefined,
        courseId,
        providerWallet: address(providerWallet),
      });
    }

    return getRemoveAcceptedCourseInstructionAsync({
      hub: undefined,
      authority,
      courseId,
    });
  }

  /**
   * Create instructions for all pending operations
   */
  static async createBatchInstructions(
    operations: BatchOperation[],
    authority: TransactionSigner,
  ): Promise<Instruction[]> {
    if (operations.length === 0) {
      throw new Error("No operations to execute");
    }

    const instructions: Instruction[] = [];
    for (const operation of operations) {
      const instruction = await this.createInstructionForOperation(
        operation,
        authority,
      );
      instructions.push(instruction);
    }

    return instructions;
  }

  /**
   * Estimate transaction costs and compute units
   */
  static estimateBatchCost(operations: BatchOperation[]): {
    estimatedFee: number;
    computeUnits: number;
    instructionCount: number;
  } {
    const instructionCount = operations.length;

    // Rough estimates - each instruction uses ~10k compute units
    const computeUnits = instructionCount * 10000;

    // Base fee: 5000 lamports per signature
    const estimatedFee = 5000;

    return {
      estimatedFee,
      computeUnits,
      instructionCount,
    };
  }
}
