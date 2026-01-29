"use client";

import { Button } from "@/components/ui/button";
import { TestTube2 } from "lucide-react";
import { useAppKitAccount } from "@reown/appkit/react";
import { address } from "@solana/kit";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Test wallet public key - Using the hub authority address from deployment
const TEST_WALLET_PUBLIC_KEY = "F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs";

export function TestWalletButton() {
  const { address, isConnected: connected } = useAppKitAccount();
  const publicKey = address ? { toBase58: () => String(address) } : null;
  const [isTestMode, setIsTestMode] = useState(false);
  const [mockConnected, setMockConnected] = useState(false);

  // Check if we're in test mode on mount
  useEffect(() => {
    const testMode =
      process.env.NEXT_PUBLIC_TEST_MODE === "true" ||
      localStorage.getItem("testMode") === "true";
    setIsTestMode(testMode);

    // Check if mock wallet is connected
    const mockWalletConnected =
      localStorage.getItem("mockWalletConnected") === "true";
    if (mockWalletConnected && testMode) {
      setMockConnected(true);
      injectMockWallet();
    }
  }, []);

  const injectMockWallet = () => {
    // Inject mock wallet into window
    if (typeof window !== "undefined") {
      (window as any).mockSolana = {
        isPhantom: true,
        publicKey: TEST_WALLET_PUBLIC_KEY,
        isConnected: true,
        connect: async () => {
          return { publicKey: TEST_WALLET_PUBLIC_KEY };
        },
        disconnect: async () => {
          localStorage.removeItem("mockWalletConnected");
          setMockConnected(false);
        },
        signTransaction: async (transaction: any) => transaction,
        signAllTransactions: async (transactions: any[]) => transactions,
        signMessage: async (message: Uint8Array) => ({
          signature: new Uint8Array(64),
        }),
      };

      // Dispatch event to notify the app
      window.dispatchEvent(
        new CustomEvent("mock-wallet-ready", {
          detail: { publicKey: TEST_WALLET_PUBLIC_KEY },
        }),
      );
    }
  };

  const connectTestWallet = () => {
    localStorage.setItem("testMode", "true");
    localStorage.setItem("mockWalletConnected", "true");
    setIsTestMode(true);
    setMockConnected(true);
    injectMockWallet();

    // Force a page reload to apply test mode
    window.location.reload();
  };

  const disconnectTestWallet = () => {
    localStorage.removeItem("testMode");
    localStorage.removeItem("mockWalletConnected");
    localStorage.removeItem("userType");
    setIsTestMode(false);
    setMockConnected(false);

    // Remove mock wallet
    if (typeof window !== "undefined") {
      delete (window as any).mockSolana;
    }

    // Force a page reload
    window.location.reload();
  };

  // Don't show if real wallet is connected
  if (connected && publicKey && !isTestMode) {
    return null;
  }

  // Show test controls
  return (
    <div className="flex items-center gap-2">
      {!isTestMode ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={connectTestWallet}
          className="text-xs opacity-70 hover:opacity-100"
          title="Connect test wallet for development"
        >
          <TestTube2 className="h-3 w-3 mr-1" />
          Test Mode
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <TestTube2 className="h-3 w-3 text-orange-500" />
            Test Mode Active
          </span>
          {mockConnected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={disconnectTestWallet}
              className="text-xs"
            >
              Exit Test
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
