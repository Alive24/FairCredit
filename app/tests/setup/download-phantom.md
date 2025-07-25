# Downloading Phantom Extension for Playwright

## Overview
Playwright cannot install browser extensions from the Chrome Web Store directly. You need to manually download the Phantom extension and place it in the project directory.

## Method 1: Using CRX Extractor (Recommended)

1. Install a CRX downloader extension in Chrome:
   - [CRX Extractor/Downloader](https://chrome.google.com/webstore/detail/crx-extractordownloader/ajkhmmldknmfjnmeedkbkkojgobmljda)

2. Visit the Phantom wallet page:
   - https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa

3. Click the CRX Extractor icon and download the extension

4. Extract the downloaded CRX file:
   ```bash
   # Create the extensions directory
   mkdir -p app/tests/extensions/phantom
   
   # Unzip the CRX file (it's just a ZIP file)
   unzip phantom.crx -d app/tests/extensions/phantom/
   ```

## Method 2: Extract from Chrome Profile

1. Install Phantom in Chrome normally

2. Find your Chrome profile directory:
   - macOS: `~/Library/Application Support/Google/Chrome/Default/Extensions/`
   - Linux: `~/.config/google-chrome/Default/Extensions/`
   - Windows: `%USERPROFILE%\AppData\Local\Google\Chrome\User Data\Default\Extensions\`

3. Copy the Phantom extension:
   ```bash
   # Find the Phantom extension ID directory
   cd ~/Library/Application Support/Google/Chrome/Default/Extensions/
   ls | grep bfnaelmomeimhlpmgjnjophhpkkoljpa
   
   # Copy to your project
   cp -r bfnaelmomeimhlpmgjnjophhpkkoljpa/[VERSION]/* /path/to/FairCredit/app/tests/extensions/phantom/
   ```

## Method 3: Using chrome-webstore-api

```bash
# Install the tool
npm install -g chrome-webstore-download

# Download the extension
chrome-webstore-download bfnaelmomeimhlpmgjnjophhpkkoljpa

# Extract to the correct location
unzip bfnaelmomeimhlpmgjnjophhpkkoljpa.zip -d app/tests/extensions/phantom/
```

## Verify Installation

After downloading and extracting:

1. Check that the manifest.json exists:
   ```bash
   cat app/tests/extensions/phantom/manifest.json
   ```

2. The directory structure should look like:
   ```
   app/tests/extensions/phantom/
   ├── manifest.json
   ├── background.js
   ├── content.js
   ├── popup.html
   ├── _locales/
   ├── images/
   └── ... other extension files
   ```

## Important Notes

- The extension files are gitignored for security and licensing reasons
- Each developer needs to download the extension locally
- The extension version may change over time
- Some methods may require you to rename the .crx file to .zip before extracting