"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useWallet } from "@solana/wallet-adapter-react"
import { Key, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { RealDevWalletAdapter } from "@/lib/solana/real-dev-wallet"

export function DevWalletImport() {
  const wallet = useWallet()
  const [open, setOpen] = useState(false)
  const [secretKey, setSecretKey] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleImport = async () => {
    try {
      setError("")
      setSuccess(false)

      // Check if the current wallet is the dev wallet
      if (wallet.wallet?.adapter.name !== 'Dev Wallet (Real Transactions)') {
        setError("Please select 'Dev Wallet (Real Transactions)' from the wallet selector first")
        return
      }

      const adapter = wallet.wallet.adapter as RealDevWalletAdapter
      await adapter.importKeypair(secretKey.trim())
      
      setSuccess(true)
      setSecretKey("")
      
      // Close dialog after a short delay
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err.message || "Failed to import keypair")
    }
  }

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="opacity-70 hover:opacity-100"
      >
        <Key className="h-3 w-3 mr-1" />
        Import Dev Key
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Import Development Keypair</DialogTitle>
            <DialogDescription>
              Import a Solana keypair for testing hub management functions. 
              This is for development only!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>⚠️ Security Warning:</strong> Never share or expose private keys in production. 
                This feature is for local development only.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="secret-key">Secret Key (Base64 or JSON Array)</Label>
              <Textarea
                id="secret-key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter base64 encoded secret key or JSON array..."
                className="font-mono text-xs"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                You can use the secret key from your Solana CLI wallet or generate one for testing.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500 text-green-600">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Keypair imported successfully!</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2 text-xs text-muted-foreground">
              <p><strong>To get a test keypair:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Run: <code className="bg-muted px-1 rounded">solana-keygen new --no-bip39-passphrase</code></li>
                <li>Or use the hub authority key from your deployment</li>
                <li>Convert to base64: <code className="bg-muted px-1 rounded">cat ~/.config/solana/id.json | base64</code></li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!secretKey.trim()}>
              Import Keypair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}