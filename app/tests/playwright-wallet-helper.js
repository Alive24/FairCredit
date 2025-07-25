/**
 * Playwright Wallet Helper
 * Use this in Playwright tests to connect wallets programmatically
 */

// Connect the test wallet directly (bypass UI)
async function connectTestWallet(page) {
  console.log("🔧 Connecting test wallet via Playwright backdoor...");
  
  // Execute the wallet connection in the browser context
  const result = await page.evaluate(async () => {
    // Check if the wallet manager is available
    if (typeof window.connectTestWallet === 'function') {
      try {
        await window.connectTestWallet();
        return { success: true, message: "Test wallet connected successfully" };
      } catch (error) {
        return { success: false, message: error.message };
      }
    } else {
      return { success: false, message: "Wallet manager not available. Make sure you're on the right page." };
    }
  });
  
  if (result.success) {
    console.log("✅", result.message);
    // Wait for the page to reload after wallet connection
    await page.waitForLoadState('networkidle');
  } else {
    console.error("❌", result.message);
    throw new Error(result.message);
  }
  
  return result;
}

// Check wallet connection status
async function checkWalletStatus(page) {
  return await page.evaluate(() => {
    return {
      isDevWalletConnected: window.walletManager?.isDevWalletConnected() || false,
      hasWalletManager: typeof window.walletManager !== 'undefined',
      hasConnectTestWallet: typeof window.connectTestWallet === 'function'
    };
  });
}

// Wait for wallet to be ready
async function waitForWalletReady(page, timeout = 10000) {
  console.log("⏳ Waiting for wallet to be ready...");
  
  await page.waitForFunction(() => {
    return typeof window.connectTestWallet === 'function';
  }, { timeout });
  
  console.log("✅ Wallet system ready");
}

module.exports = {
  connectTestWallet,
  checkWalletStatus,
  waitForWalletReady
};