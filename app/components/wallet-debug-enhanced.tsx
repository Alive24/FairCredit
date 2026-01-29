"use client";

import { useEffect, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function WalletDebugEnhanced() {
  const { address, isConnected: connected } = useAppKitAccount();
  const { open } = useAppKit();
  const { rpcUrl } = useFairCredit();
  // Map AppKit to legacy interface for compatibility
  const wallet = {
    connected,
    publicKey: address ? { toBase58: () => String(address) } : null,
    connecting: false,
    wallets: [],
  };
  const [phantomDetected, setPhantomDetected] = useState(false);

  useEffect(() => {
    // Check if Phantom is installed
    const checkPhantom = () => {
      if (typeof window !== "undefined") {
        const isPhantom = !!(window as any).phantom?.solana?.isPhantom;
        setPhantomDetected(isPhantom);
        console.log("🔍 Phantom detected:", isPhantom);
        console.log("🔍 Window phantom object:", (window as any).phantom);
      }
    };

    checkPhantom();
    // Check again after a delay in case the extension loads late
    const timer = setTimeout(checkPhantom, 1000);
    return () => clearTimeout(timer);
  }, []);

  const testWalletModal = () => {
    console.log("🧪 Testing AppKit modal...");
    open();
    console.log("AppKit modal opened");
  };

  const testDirectPhantom = async () => {
    console.log("🧪 Testing direct Phantom connection...");
    try {
      if ((window as any).phantom?.solana) {
        const response = await (window as any).phantom.solana.connect();
        console.log("✅ Direct Phantom connection:", response);
      } else {
        console.log("❌ Phantom not found");
      }
    } catch (error) {
      console.error("❌ Direct Phantom error:", error);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Enhanced Wallet Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <strong>Phantom Detected:</strong>{" "}
          {phantomDetected ? "✅ Yes" : "❌ No"}
        </div>
        <div>
          <strong>AppKit Available:</strong> ✅ Yes
        </div>
        <div>
          <strong>Wallet Connected:</strong>{" "}
          {wallet.connected ? "✅ Yes" : "❌ No"}
        </div>
        <div>
          <strong>Public Key:</strong> {wallet.publicKey?.toBase58() || "None"}
        </div>
        <div>
          <strong>Wallet Address:</strong> {address ? String(address) : "None"}
        </div>
        <div>
          <strong>Connecting:</strong> {wallet.connecting ? "⏳ Yes" : "❌ No"}
        </div>
        <div>
          <strong>Clients Loading:</strong> ❌ No
        </div>
        <div>
          <strong>Readonly Client:</strong> N/A
        </div>
        <div>
          <strong>Provider Client:</strong> N/A
        </div>
        <div>
          <strong>Hub Client:</strong> N/A
        </div>
        <div>
          <strong>Verifier Client:</strong> N/A
        </div>
        <div>
          <strong>Mentor Client:</strong> N/A
        </div>
        <div>
          <strong>Available Wallets:</strong> AppKit handles wallet discovery
        </div>

        <div className="pt-4 space-y-2">
          <Button
            onClick={testWalletModal}
            variant="outline"
            size="sm"
            className="w-full"
          >
            🧪 Test Wallet Modal
          </Button>
          <Button
            onClick={testDirectPhantom}
            variant="outline"
            size="sm"
            className="w-full"
          >
            🧪 Test Direct Phantom
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
