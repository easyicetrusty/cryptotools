# What’s new

## 0.7.1 · Results you can inspect
- Strategy and BTC daily marked-equity metrics: returns/CAGR, annualised volatility, Sharpe/Sortino/Calmar, drawdown episodes/duration, historical VaR/CVaR, observed periods, held-time exposure, skew/kurtosis and PSR against SR 0. Crypto annualisation 365; RF 0 by default/editable; undefined values and PSR assumptions explicit.
- Equity/underwater plots, monthly returns heatmaps and trailing 30/90-day Sharpe/volatility. Independent TypeScript formulas with pinned cowork-only QuantStats oracle; committed real Kraken/OKX and synthetic fixtures keep Python out of CI and the image.
- Escaped self-contained, light print-friendly HTML report for saved frozen runs: disclaimer, source provenance, full manifest, modelled/omitted panel, metrics, charts, daily returns and both ledgers. No external URLs/requests. Downloads remain outside later source revocation.
- User-selected 2–4 saved runs, neutral side-by-side metrics and normalized equity. Manifest source/range/fee/rule and other mismatches warn rather than hide differences.
- Tuning/sealed chronological experiments evaluate tuning only until explicit confirmed one-time unseal. Independent capital; immutable protocol annotation and persistent inspection state. Later parameter changes/overlapping inspected windows marked seen. Local workflow, not cryptographic concealment; no optimizer.
- Read-only saved-run metrics AI tool; ordinary AI/backtests cannot cross active sealed windows. History, reports, comparisons and experiments preserve enabled-source gates. Existing frozen/legacy economics retained. [All formulas and limitations](docs/RESULTS.md).

## 0.7.0-beta.2 · Correct legacy constraints disclosure
- Legacy saved results explicitly state that constraints are unavailable, rather than falling through to a current-snapshot availability message. Two regression fixtures and the real upgrade/browser check cover this disclosure.
- New prerelease revision; the published v0.7.0 tag is preserved. The execution model and costs are unchanged. Saved v0.7.0 bundles replay with an app-version difference rather than a false identical claim after upgrade.

## 0.7.0 · Honest test bench
- Dated, hashed public ccxt market-rule snapshots, exchange precision rounding, minimum/bound rejections and retained residual cash/dust. Skipped attempts are counted rather than silently filled; unknown constraints remain unverified.
- Taker fee defaults with source/date and explicit overrides; independent BTC rules/fees. The captured current Kraken general-spot schedule replaces stale ccxt defaults on identified BTC/ETH/SOL-base pairs, with both values retained.
- Optional causal volatility/volume slippage alongside flat bps, with formula and zero-volume handling shown. No order-book or real-fill claims.
- Explicit closed-bar signal / next-open contract, pre-range indicator startup and bar-by-bar cash/inventory/fee/slippage ledger. Synthetic all-strategy causality/accounting tests and dated recorded market fixtures.
- Every result has a modelled/omitted panel. New saved runs freeze candles, warm-up, market/fee snapshots, parameters, source, range and versions; Re-run exactly uses the source-gated local bundle and shows identical or differences. Older results remain labelled legacy.
- Existing BTC comparisons, provenance, source/access gates and paper-only boundaries retained. [Methods and limitations](docs/HONEST-BENCH.md).

## 0.6.1 · Wider activity coverage
- Surge universe defaults to 50 markets per enabled exchange, selectable 25/50/100. Visible scan progress, partial rows, market coverage and failed/incomplete histories. Mechanical ratio sort; ten rows initially with an all-scanned-markets control.
- Two concurrent history jobs globally, one per venue, respecting ccxt rate limits. Identical scans coalesce and cache for five minutes; passive progress reads never start scans. Closed UTC candles persist and reuse across filters, universe changes and midnight; only gaps are fetched.
- Exclude stablecoin-to-stablecoin pairs on by default for leaders and surges. Optional stablecoin-base exclusion off by default. Neutral reversible controls saved with universe size; conservative explicit code list with issuer source links, unknown codes unclassified.
- Broader real Kraken/OKX captures in both themes at 390/1440. Existing source/access gates, approximate-turnover disclosures and beta boundaries remain unchanged.

## 0.6.0 · Observed activity and saved views
- Trends from your enabled public sources only: spot volume leaders with exchange breakdowns and quote/data exclusions; lazy top-N volume ratios against thirty complete daily candles; selected-market initiating-side trade samples; persisted market-list changes; keyless perpetual funding, open interest and basis where supported.
- Inline definitions, source links, timestamps/ages, unknown values and mini-charts when history exists. Wash-trading and stable-quote approximation notices stay visible on volume metrics.
- Test in bench opens the actual spot market, labelled past behaviour only. Existing strategies and cost model retained.
- Read-only get_trends(filters) AI tool shares the same observed snapshots. UI/tool neutrality tests and a model-prose word guard; model text remains untrusted.
- Optional, combinable, editable staking presets saved in the single-user workspace. Default remains unfiltered asset A–Z. Explicit source categories only; unknown types and promo/reward fields remain unknown.
- Public-only endpoint boundaries extended for recent trades and supported perpetual observations. All sources stay off by default. Access rights and provider restrictions remain the user's responsibility.

## 0.5.0 · Your data, your access
- Twelve off-by-default source connectors with provider terms/docs, explicit acceptance, enable controls, connection tests and last-fetch status.
- Onboarding source choice (skippable), honest empty states and one-time migration notice. Disabled sources are gated at the network boundary and hidden from cached reads and AI tools.
- Kraken, OKX, Bybit, Binance and Coinbase Exchange keyless spot adapters; user-enabled DefiLlama free/Pro, Lido and Bybit fixed-term staking data.
- Kraken/Binance/OKX read-only earn-listing adapters tested with official response examples, **not yet tested with real keys**. DefiLlama Pro paid-key access also untested. Unknown rates/risks/custody/availability are not invented.
- Data credentials use the existing encrypted AI-key vault, are omitted from API metadata and rejected if pasted into feedback. Delete key disables the source and clears its staking cache.
- Binance, OKX and Kraken permission introspection rejects unsafe/unverified keys before enablement and each product fetch. Explicit read-only endpoint allowlists; no order, transfer, withdrawal or staking transaction paths.
- `CRYPTOTOOLS_SANDBOX=1` blocks all keyed data sources in the UI and backend, leaving explicitly accepted keyless connectors.
- Terms acceptance is not a licence. Each user is responsible for access rights and provider terms. Neutral data only, never advice or a complete market survey.

## 0.4.0 · Source-limited staking information beta
- Neutral staking information screen with all columns sortable and asset/type/custody/lock-up/TVL/promo filters. Asset A–Z default, not a quality judgment.
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
- Cost-aware strategy tests with a same-cost BTC hold comparison.
- Manual paper holdings, public price valuation and CSV.
- Built-in BYOK assistant and four read-only background workers.
- Single-user login, optional TOTP and encrypted provider storage.
- Night shift and Clear desk, onboarding and opt-in counters.

Paper only. No orders, exchange credentials or return promises.
