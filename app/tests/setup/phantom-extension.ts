/**
 * Phantom Wallet Extension Setup for Playwright
 * 
 * This module helps configure Playwright to run with the Phantom wallet extension
 */

// @ts-ignore - playwright test types not available in this context
// import { chromium, BrowserContext, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// Type definitions for Playwright (to avoid import errors)
type BrowserContext = any
type Page = any

// Phantom Extension IDs
const PHANTOM_EXTENSION_ID = 'bfnaelmomeimhlpmgjnjophhpkkoljpa'
const PHANTOM_CHROME_STORE_URL = `https://chrome.google.com/webstore/detail/phantom/${PHANTOM_EXTENSION_ID}`

/**
 * Instructions for setting up Phantom with Playwright
 */
export const SETUP_INSTRUCTIONS = `
To use Phantom with Playwright, you need to:

1. Download the Phantom extension manually:
   - Visit: ${PHANTOM_CHROME_STORE_URL}
   - Use a Chrome extension downloader to get the .crx file
   - Or extract from an existing Chrome profile

2. Place the extension in: app/tests/extensions/phantom/

3. The extension will be automatically loaded when running tests
`

/**
 * Path to the Phantom extension directory
 */
export const PHANTOM_EXTENSION_PATH = path.join(__dirname, '../extensions/phantom')

/**
 * Check if Phantom extension is available
 */
export function isPhantomExtensionAvailable(): boolean {
  return fs.existsSync(PHANTOM_EXTENSION_PATH) && fs.readdirSync(PHANTOM_EXTENSION_PATH).length > 0
}

/**
 * Create a browser context with Phantom extension loaded
 */
export async function createBrowserContextWithPhantom(options?: {
  headless?: boolean
  viewport?: { width: number; height: number }
}): Promise<BrowserContext> {
  if (!isPhantomExtensionAvailable()) {
    throw new Error(`
      Phantom extension not found!
      ${SETUP_INSTRUCTIONS}
    `)
  }

  // Note: This function requires @playwright/test to be installed
  // const browser = await chromium.launch({
  throw new Error('This function requires Playwright to be properly installed. Please install @playwright/test and update imports.')
  /*
  const browser = await chromium.launch({
    headless: false, // Extensions only work in headed mode
    args: [
      `--disable-extensions-except=${PHANTOM_EXTENSION_PATH}`,
      `--load-extension=${PHANTOM_EXTENSION_PATH}`,
    ],
  })

  const context = await browser.newContext({
    viewport: options?.viewport || { width: 1280, height: 720 },
    // Persist storage to maintain wallet state between tests
    storageState: path.join(__dirname, '../.auth/phantom-state.json'),
  })

  return context
  */
}

/**
 * Wait for Phantom to be ready in the page
 */
export async function waitForPhantomReady(page: Page): Promise<void> {
  // Wait for Phantom to inject its global object
  await page.waitForFunction(
    () => {
      return typeof (window as any).solana !== 'undefined' && (window as any).solana.isPhantom
    },
    { timeout: 30000 }
  )
}

/**
 * Get Phantom extension popup page
 */
export async function getPhantomPopup(context: BrowserContext): Promise<Page> {
  // Get all pages
  const pages = context.pages()
  
  // Find the Phantom popup or open it
  let popup = pages.find((p: any) => p.url().includes('chrome-extension://bfnaelmomeimhlpmgjnjophhpkkoljpa'))
  
  if (!popup) {
    popup = await context.newPage()
    await popup.goto('chrome-extension://bfnaelmomeimhlpmgjnjophhpkkoljpa/popup.html')
  }
  
  return popup
}

/**
 * Setup Phantom wallet for the first time
 */
export async function setupPhantomFirstTime(context: BrowserContext, seedPhrase: string, password: string = 'TestPassword123!'): Promise<void> {
  const popup = await getPhantomPopup(context)
  
  try {
    // Check if already set up
    const hasWallet = await popup.locator('text="Unlock"').isVisible({ timeout: 5000 }).catch(() => false)
    if (hasWallet) {
      console.log('Phantom wallet already set up')
      return
    }
  } catch {}
  
  // Wait for the welcome screen
  await popup.waitForLoadState('networkidle')
  
  // Click "Import an existing wallet"
  await popup.locator('button:has-text("Import an existing wallet")').click()
  
  // Click "Import secret recovery phrase"
  await popup.locator('button:has-text("Import secret recovery phrase")').click()
  
  // Enter the seed phrase
  const words = seedPhrase.split(' ')
  for (let i = 0; i < words.length; i++) {
    await popup.locator(`input[placeholder="Word ${i + 1}"]`).fill(words[i])
  }
  
  // Click continue
  await popup.locator('button:has-text("Import")').click()
  
  // Set password
  await popup.locator('input[placeholder="Password"]').first().fill(password)
  await popup.locator('input[placeholder="Confirm password"]').fill(password)
  await popup.locator('input[type="checkbox"]').check() // Terms checkbox
  
  // Click continue
  await popup.locator('button:has-text("Continue")').click()
  
  // Wait for success and click finish
  await popup.locator('button:has-text("Finish")').click()
  
  console.log('Phantom wallet setup complete')
}

/**
 * Unlock Phantom wallet
 */
export async function unlockPhantom(context: BrowserContext, password: string = 'TestPassword123!'): Promise<void> {
  const popup = await getPhantomPopup(context)
  
  // Check if unlock screen is visible
  const needsUnlock = await popup.locator('text="Unlock"').isVisible({ timeout: 5000 }).catch(() => false)
  
  if (needsUnlock) {
    await popup.locator('input[type="password"]').fill(password)
    await popup.locator('button:has-text("Unlock")').click()
    await popup.waitForLoadState('networkidle')
  }
}

/**
 * Connect Phantom to a website
 */
export async function connectPhantomToSite(page: Page, context: BrowserContext): Promise<void> {
  // Wait for Phantom to be ready
  await waitForPhantomReady(page)
  
  // Click connect wallet button on the site
  await page.locator('button:has-text("Select Wallet")').click()
  
  // Click Phantom option
  await page.locator('button:has-text("Phantom")').click()
  
  // Handle the Phantom popup
  const popupPromise = context.waitForEvent('page')
  const popup = await popupPromise
  
  // Wait for connect button and click it
  await popup.waitForLoadState('networkidle')
  await popup.locator('button:has-text("Connect")').click()
  
  // Wait for connection to complete
  await page.waitForTimeout(2000)
}

/**
 * Get the expected wallet address for testing
 * This is the address for the test seed phrase
 */
export function getTestWalletAddress(): string {
  // This is the public key for the test mnemonic
  // Example mnemonic omitted intentionally; derive and hardcode your local test wallet pubkey instead.
  // You would need to calculate this once and hardcode it
  return 'YOUR_TEST_WALLET_PUBLIC_KEY'
}
