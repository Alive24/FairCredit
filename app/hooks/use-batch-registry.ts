"use client"

import { useState } from "react"

export type BatchOperation = {
  id: string
  type: "add" | "remove"
  entityType: "provider" | "course" | "endorser"
  entityKey: string
  entityName?: string
  timestamp: number
}

export function useBatchRegistry() {
  const [pendingOperations, setPendingOperations] = useState<BatchOperation[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const addOperation = (
    type: "add" | "remove",
    entityType: "provider" | "course" | "endorser",
    entityKey: string,
    entityName?: string
  ) => {
    const operation: BatchOperation = {
      id: `${type}-${entityType}-${entityKey}-${Date.now()}`,
      type,
      entityType,
      entityKey,
      entityName,
      timestamp: Date.now()
    }

    setPendingOperations(prev => {
      // Remove any conflicting operations (e.g., add then remove same entity)
      const filtered = prev.filter(op => 
        !(op.entityType === entityType && op.entityKey === entityKey)
      )
      return [...filtered, operation]
    })
  }

  const removeOperation = (operationId: string) => {
    setPendingOperations(prev => prev.filter(op => op.id !== operationId))
  }

  const clearOperations = () => {
    setPendingOperations([])
  }

  const getOperationSummary = () => {
    const summary = {
      adds: {
        providers: pendingOperations.filter(op => op.type === "add" && op.entityType === "provider").length,
        courses: pendingOperations.filter(op => op.type === "add" && op.entityType === "course").length,
        endorsers: pendingOperations.filter(op => op.type === "add" && op.entityType === "endorser").length,
      },
      removes: {
        providers: pendingOperations.filter(op => op.type === "remove" && op.entityType === "provider").length,
        courses: pendingOperations.filter(op => op.type === "remove" && op.entityType === "course").length,
        endorsers: pendingOperations.filter(op => op.type === "remove" && op.entityType === "endorser").length,
      },
      total: pendingOperations.length
    }
    return summary
  }

  return {
    pendingOperations,
    isProcessing,
    setIsProcessing,
    addOperation,
    removeOperation,
    clearOperations,
    getOperationSummary,
    hasPendingOperations: pendingOperations.length > 0
  }
}