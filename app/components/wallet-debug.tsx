"use client";

import { useEffect, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WalletDebug() {
  const { address, isConnected: connected } = useAppKitAccount();
  const { open } = useAppKit();
  // Map AppKit state to legacy wallet-adapter-like interface for compatibility
  const wallet = {
    connected,
    publicKey: address ? { toBase58: () => String(address) } : null,
    wallet: { adapter: { name: "AppKit Wallet" } },
    connecting: false,
    wallets: [],
  };
  const { rpcUrl } = useFairCredit();
  const [hasMounted, setHasMounted] = useState(false);
  const [availableWalletNames, setAvailableWalletNames] = useState<string[]>(
    [],
  );
  const [extensionStatus, setExtensionStatus] = useState<{
    solana: boolean;
    phantom: boolean;
    solflare: boolean;
  } | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    // AppKit handles wallet discovery internally
    setAvailableWalletNames([]);
  }, [hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;
    const win = window as any;
    setExtensionStatus({
      solana: !!win.solana,
      phantom: !!win.phantom,
      solflare: !!win.solflare,
    });
  }, [hasMounted]);

  const testDirectConnection = async () => {
    try {
      console.log("🧪 Testing AppKit connection...");
      open();
      console.log("✅ AppKit modal opened!");
    } catch (error) {
      console.error("❌ AppKit connection failed:", error);
    }
  };

  const checkBrowserExtensions = () => {
    console.log("🔍 Checking browser extensions...");
    const win = window as any;
    const extensions = {
      solana: !!win.solana,
      phantom: !!win.phantom,
      solflare: !!win.solflare,
      polkadot: !!win.injectedWeb3,
      ethereum: !!win.ethereum,
    };
    console.log("Browser extensions detected:", extensions);
    setExtensionStatus({
      solana: extensions.solana,
      phantom: extensions.phantom,
      solflare: extensions.solflare,
    });

    // Check for specific polkadot extensions
    if (win.injectedWeb3) {
      console.log("Polkadot extensions found:", Object.keys(win.injectedWeb3));
    }

    return extensions;
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Wallet Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <strong>Wallet Connected:</strong>{" "}
          {hasMounted ? (wallet.connected ? "Yes" : "No") : "Detecting..."}
        </div>
        <div>
          <strong>Public Key:</strong>{" "}
          {hasMounted ? wallet.publicKey?.toBase58() || "None" : "Detecting..."}
        </div>
        <div>
          <strong>Wallet Name:</strong>{" "}
          {hasMounted ? wallet.wallet?.adapter?.name || "None" : "Detecting..."}
        </div>
        <div>
          <strong>Connecting:</strong>{" "}
          {hasMounted ? (wallet.connecting ? "Yes" : "No") : "Detecting..."}
        </div>
        <div>
          <strong>Clients Loading:</strong> {hasMounted ? "No" : "Detecting..."}
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
          <strong>Mentor Client:</strong> {hasMounted ? "N/A" : "Detecting..."}
        </div>
        <div>
          <strong>Available Wallets:</strong>{" "}
          {hasMounted
            ? availableWalletNames.length
              ? availableWalletNames.join(", ")
              : "None"
            : "Detecting..."}
        </div>
        <div>
          <strong>Window Extensions:</strong>
          <ul className="ml-4 text-xs">
            <li>
              window.solana:{" "}
              {hasMounted
                ? extensionStatus?.solana
                  ? "Present"
                  : "Not found"
                : "Detecting..."}
            </li>
            <li>
              window.phantom:{" "}
              {hasMounted
                ? extensionStatus?.phantom
                  ? "Present"
                  : "Not found"
                : "Detecting..."}
            </li>
            <li>
              window.solflare:{" "}
              {hasMounted
                ? extensionStatus?.solflare
                  ? "Present"
                  : "Not found"
                : "Detecting..."}
            </li>
          </ul>
        </div>

        <div className="pt-4 space-y-2">
          <button
            onClick={testDirectConnection}
            className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🧪 Test Direct Phantom Connection
          </button>
          <button
            onClick={checkBrowserExtensions}
            className="w-full p-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            🔍 Check Browser Extensions
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
