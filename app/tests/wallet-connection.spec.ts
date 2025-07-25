import { test, expect } from '@playwright/test'

/**
 * Wallet Connection Tests
 * 
 * These tests verify wallet connection functionality using the development wallet.
 * Make sure you have the DEV_MNEMONIC set in your .env file.
 */

test.describe('Wallet Connection Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/')
  })

  test('should display connect wallet button', async ({ page }) => {
    // Check if the connect wallet button is visible
    const connectButton = page.getByRole('button', { name: 'Connect Wallet' })
    await expect(connectButton).toBeVisible()
  })

  test('should open wallet selection modal when connect wallet is clicked', async ({ page }) => {
    // Click the connect wallet button
    await page.getByRole('button', { name: 'Connect Wallet' }).click()
    
    // Check if the wallet selection modal appears
    await expect(page.getByText('Connect a wallet on Solana to continue')).toBeVisible()
    
    // Check if Phantom and Solflare options are available
    await expect(page.getByText('Phantom')).toBeVisible()
    await expect(page.getByText('Solflare')).toBeVisible()
  })

  test('should show Hub link in navigation', async ({ page }) => {
    // Check if the Hub link is visible in navigation
    const hubLink = page.getByRole('link', { name: 'Hub' })
    await expect(hubLink).toBeVisible()
  })

  test('should navigate to Hub dashboard', async ({ page }) => {
    // Click on the Hub link
    await page.getByRole('link', { name: 'Hub' }).click()
    
    // Verify we're on the Hub page
    await expect(page).toHaveURL('/hub')
    await expect(page.getByText('Hub Administration')).toBeVisible()
  })

  test('should navigate to Provider dashboard', async ({ page }) => {
    // Navigate to provider dashboard
    await page.goto('/dashboard')
    
    // Should see the provider dashboard content
    await expect(page.getByText('Provider Dashboard')).toBeVisible()
  })
})

test.describe('Role Selection Flow', () => {
  test('should show role selection modal after wallet connection', async ({ page }) => {
    // Note: This test would require actual wallet connection
    // which needs Phantom extension installed in the test browser
    
    await page.goto('/')
    
    // For now, we can test the UI elements exist
    await expect(page.getByText('Choose Your Role')).toBeVisible()
    await expect(page.getByText("I'm a Student")).toBeVisible()
    await expect(page.getByText("I'm a Provider")).toBeVisible()
    await expect(page.getByText("I'm a Supervisor")).toBeVisible()
    await expect(page.getByText("I'm a Verifier")).toBeVisible()
  })
})