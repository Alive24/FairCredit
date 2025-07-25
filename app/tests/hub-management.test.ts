import { test, expect } from '@playwright/test';
import { getConnection, getHubAuthorityKeypair, testConfig } from './playwright-config';
import { PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

test.describe('Hub Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the hub management page
    await page.goto('http://localhost:3000/hub');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display hub information', async ({ page }) => {
    // Check that hub authority is displayed
    await expect(page.locator('text=Hub Authority')).toBeVisible();
    await expect(page.locator(`text=${testConfig.hubAuthority.publicKey}`)).toBeVisible();
    
    // Check for provider section
    await expect(page.locator('text=Accepted Providers')).toBeVisible();
  });

  test('should connect wallet using dev wallet', async ({ page }) => {
    // Click connect wallet button
    await page.click('button:has-text("Connect Wallet")');
    
    // Select Dev Wallet option
    await page.click('text=Dev Wallet (Real Transactions)');
    
    // Import the hub authority keypair
    await page.click('button:has-text("Import Dev Key")');
    
    // Wait for dialog
    await page.waitForSelector('text=Import Development Keypair');
    
    // Enter the base64 encoded keypair
    const base64Keypair = Buffer.from(testConfig.hubAuthority.getKeypair().secretKey).toString('base64');
    await page.fill('textarea[placeholder*="base64"]', base64Keypair);
    
    // Click import
    await page.click('button:has-text("Import Keypair")');
    
    // Wait for success message
    await expect(page.locator('text=Keypair imported successfully')).toBeVisible();
    
    // Close dialog
    await page.click('button:has-text("Cancel")');
    
    // Verify wallet is connected
    await expect(page.locator(`text=${testConfig.hubAuthority.publicKey.slice(0, 4)}`)).toBeVisible();
  });

  test('should handle provider addition flow', async ({ page, context }) => {
    // This test demonstrates the flow but won't actually add a provider
    // since no providers exist yet
    
    // First connect wallet (reuse the connection flow)
    await page.click('button:has-text("Connect Wallet")');
    await page.click('text=Dev Wallet (Real Transactions)');
    await page.click('button:has-text("Import Dev Key")');
    await page.waitForSelector('text=Import Development Keypair');
    const base64Keypair = Buffer.from(testConfig.hubAuthority.getKeypair().secretKey).toString('base64');
    await page.fill('textarea[placeholder*="base64"]', base64Keypair);
    await page.click('button:has-text("Import Keypair")');
    await page.waitForSelector('text=Keypair imported successfully');
    await page.click('button:has-text("Cancel")');
    
    // Check for add provider button
    await expect(page.locator('button:has-text("Add Provider")')).toBeVisible();
    
    // Click add provider
    await page.click('button:has-text("Add Provider")');
    
    // Check for provider wallet input
    await expect(page.locator('input[placeholder*="Provider wallet address"]')).toBeVisible();
  });

  test('should fetch hub data correctly', async ({ page }) => {
    // Use the connection to verify hub data matches what's displayed
    const connection = getConnection();
    const hubPDA = new PublicKey(testConfig.hubPDA);
    
    // Check if hub account exists
    const hubAccount = await connection.getAccountInfo(hubPDA);
    expect(hubAccount).toBeTruthy();
    
    // Verify the hub owner is our program
    expect(hubAccount!.owner.toBase58()).toBe(testConfig.programId);
    
    // Check that the page displays correct hub information
    await expect(page.locator('text=Hub Status: Active')).toBeVisible();
  });
});

test.describe('Direct Blockchain Interaction', () => {
  test('should be able to query hub directly', async () => {
    const connection = getConnection();
    const keypair = getHubAuthorityKeypair();
    
    // Verify we can connect and the wallet has balance
    const balance = await connection.getBalance(keypair.publicKey);
    console.log(`Hub authority balance: ${balance / 1e9} SOL`);
    expect(balance).toBeGreaterThan(0);
    
    // Verify hub PDA exists
    const hubPDA = new PublicKey(testConfig.hubPDA);
    const hubInfo = await connection.getAccountInfo(hubPDA);
    expect(hubInfo).toBeTruthy();
    expect(hubInfo!.owner.toBase58()).toBe(testConfig.programId);
  });
});