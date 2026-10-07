# What’s new

## 0.4.0 · Source-limited staking information beta
- Neutral staking information screen with all columns sortable and asset/type/custody/lock-up/TVL/promo filters. Asset A–Z default, not a recommendation.
- One verified Lido liquid-staking feed: seven-day SMA APR, with APY and unsourced fields explicitly unknown. Not yet a cross-venue comparison.
- SQLite snapshots, source/fetch timestamps and ages, stale labels, 15-minute refresh/failure cooldown and concurrent request deduplication.
- Read-only `get_staking_options(filters)` AI tool uses the same neutral data; source and timestamp provenance retained.
- Recorded-real fixtures, cache/filter/unknown tests and both AI protocol tests; real-data renders in both themes at 390–1440 pixels.
- DefiLlama excluded pending reuse permission; Bybit reuse terms unresolved; OKX borrowing rates excluded as not earn APY. Authenticated exchange Earn feeds deferred.

Information only, not financial advice. Rates change; check the venue. EU/France availability remains unknown. No orders, deposits, staking transactions, affiliate/referral links or quality rankings. Inflation-adjusted yield omitted because a verified comparable inflation feed is not integrated.

## 0.3.0 · Public container beta
- GitHub Actions release images for Linux amd64 and arm64 on GHCR.
- Install without a checkout using the shell or PowerShell installer.
- Explicit update command recreates services and retains named data volumes.
- Lightweight push and pull-request test workflow.

Beta, paper research only. Native Windows and macOS validation is pending.

## 0.2.0 · Paper research prototype
- Cost-aware strategy tests with a buy-and-hold comparison.
- Manual paper holdings, public price valuation and CSV.
- Built-in BYOK assistant and four read-only background workers.
- Single-user login, optional TOTP and encrypted provider storage.
- Night shift and Clear desk, onboarding and opt-in counters.

Paper only. No orders, exchange credentials or return promises.
