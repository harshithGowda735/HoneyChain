# HoneyChain Knowledge Base: QR Code Generation & Verification

## 1. Jar QR Codes
- Every recorded Honey Batch has a distinct verification QR code generated inside HoneyChain.
- Beekeepers can view and print this QR code by going to **My Apiary** ➔ **Honey Traceability** ➔ **Generate / View QR**.
- The QR contains a universal URL: `https://honeychain.app/verify/<BATCH_CODE>` (or deep link `honeychain://verify/<BATCH_CODE>`).

## 2. Public Consumer Verification (Zero Login Required)
- Consumers do not need an account, app installation, or login to verify a jar.
- Any smartphone camera or browser can open the verification link, displaying:
  - Official HoneyChain Authenticity Seal.
  - Apiary Name & State/District of origin.
  - Harvest date and net quantity.
  - Floral honey classification (e.g. Pure Multifloral Raw Honey).
  - Registry Ready status confirmed against Firestore.

## 3. In-App QR Scanner
- Inside the HoneyChain app, beekeepers and customers can tap the camera QR icon in the top header to scan a physical jar QR directly.
- The scanner parses the batch code and pops up the live verification modal immediately.

