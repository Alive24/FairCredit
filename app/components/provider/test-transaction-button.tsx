"use client"

import { Button } from "@/components/ui/button"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { useState } from "react"
import { Loader2 } from "lucide-react"

export function TestTransactionButton() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")

  const sendTestTransaction = async () => {
    if (!publicKey) {
      setStatus("Wallet not connected")
      return
    }

    setLoading(true)
    setStatus("Creating transaction...")

    try {
      // Create a simple transfer to self
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 1, // 0.000000001 SOL
        })
      )

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      setStatus("Sending transaction...")
      const signature = await sendTransaction(transaction, connection)
      
      setStatus("Confirming transaction...")
      await connection.confirmTransaction(signature, "confirmed")
      
      setStatus(`Success! Signature: ${signature.slice(0, 8)}...`)
    } catch (error) {
      console.error("Test transaction error:", error)
      setStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button 
        onClick={sendTestTransaction} 
        disabled={!publicKey || loading}
        className="w-full"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Test Simple Transaction
      </Button>
      {status && (
        <p className="text-sm text-muted-foreground">{status}</p>
      )}
    </div>
  )
}