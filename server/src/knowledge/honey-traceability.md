# HoneyChain Knowledge Base: Honey Traceability & Batch Architecture

## 1. Traceability Principle
- In HoneyChain, raw honey must never appear out of nowhere. Every consumer batch is cryptographically tied to verified source colonies and real beekeeper registrations.
- Traceability data includes: Apiary location, Extraction date, Floral classification, Source Hive IDs, Moisture %, Beekeeper identification, and Public verification status.

## 2. Batch Creation Lifecycle
- When a harvest is recorded in HoneyChain, a batch code with prefix `HC-` (e.g., `HC-2026-B001`) is minted.
- The batch is stored privately under the beekeeper's account and synchronized to the public verification registry `public_batches/{batchCode}`.
- The public record contains immutable verification data viewable by consumers without needing login.

## 3. Combating Adulteration
- Traditional honey in commercial markets is frequently adulterated with C4/C3 inverted sugar syrups, rice syrup, or high-fructose corn syrup (HFCS).
- HoneyChain ensures origin integrity by linking harvest volume directly to hive scale weight drops and registered colony capacities.

