import { test as base, BrowserContext } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createBrowserContextWithPhantom, setupPhantomFirstTime, unlockPhantom } from '../setup/phantom-extension'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') })

// Define the fixture types
type PhantomFixtures = {
  phantomContext: BrowserContext
  phantomPage: any
}

// Create a custom test fixture
export const test = base.extend<PhantomFixtures>({
  phantomContext: async ({}, use: (context: BrowserContext) => Promise<void>) => {
    // Create context with Phantom extension
    const context = await createBrowserContextWithPhantom({
      viewport: { width: 1280, height: 720 }
    })
    
    // Setup wallet if needed
    const seedPhrase = process.env.DEV_MNEMONIC
    if (seedPhrase) {
      await setupPhantomFirstTime(context, seedPhrase)
    }
    
    // Use the context
    await use(context)
    
    // Cleanup
    await context.close()
  },
  
  phantomPage: async (
    { phantomContext }: { phantomContext: BrowserContext },
    use: (page: Page) => Promise<void>,
  ) => {
    // Create a new page in the Phantom context
    const page = await phantomContext.newPage()
    
    // Navigate to the app
    await page.goto('http://localhost:3000')
    
    // Use the page
    await use(page)
    
    // Cleanup
    await page.close()
  }
})

export { expect } from '@playwright/test'
