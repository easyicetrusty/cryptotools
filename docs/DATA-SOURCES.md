# Your data, your access (0.5.0)

The app supplies connectors, not data, a data subscription or rights to reuse a provider's data. Every connector is off on a new installation. Upgrading an existing installation creates off-by-default connectors and a one-time notice. Old snapshots are not exposed while their source is disabled. Review the provider's own terms, tick the acceptance box and save an enabled source. Acceptance in this app does not grant permission or override commercial-use or redistribution restrictions. You are responsible for your use under your account and access rights. A source may still be unavailable in your region.

Disabled sources cannot be tested or fetched. Prices, history, staking and AI read-only tools use the same gate. A connection test makes a real read-only request only after acceptance and enabling. Failures return generic status text rather than vendor errors, URLs containing keys or response bodies. Market sources are keyless; exchange keys are used only for product listings, never account balances, orders or money movement.

## Connectors and checks

Checks were made on 7 October 2026. Public availability is not legal permission. Links are the provider's own pages; a challenged or unavailable page is not evidence of permission. Live keys were not used.

| Connector | Provides | Key | Terms | API docs | Verification |
|---|---|---|---|---|---|
| Kraken | Spot quotes, candles | No | [Legal](https://www.kraken.com/legal) | [API](https://docs.kraken.com/api/) | Existing ccxt public adapter; public endpoint allowlist; prior real quotes/candles tested |
| OKX | Spot quotes, candles | No | [API agreement](https://www.okx.com/help/okx-api-agreement) | [API](https://www.okx.com/docs-v5/en/) | Existing public adapter; terms restrict commercial integration/redistribution, including public data |
| Bybit | Spot quotes, candles | No | [Terms](https://www.bybit.com/en/help-center/article/Bybit-Terms-and-Conditions) | [Market API](https://bybit-exchange.github.io/docs/v5/market/tickers) | Existing ccxt public adapter; reuse rights not inferred |
| Binance | Spot quotes, candles | No | [Terms](https://www.binance.com/en/terms) | [Spot API](https://developers.binance.com/docs/binance-spot-api-docs/rest-api) | ccxt spot adapter and network allowlist; geography/access can block it |
| Coinbase Exchange | Spot quotes, candles (BTC/USD, not BTC/USDT) | No | [User agreement](https://www.coinbase.com/legal/user_agreement/united_states) | [Exchange API](https://docs.cdp.coinbase.com/exchange/introduction/welcome) | ccxt `coinbaseexchange` public adapter, not the authenticated Advanced Trade API |
| DefiLlama free | Yield pools, APY split, TVL | No | [Terms](https://defillama.com/terms) | [API](https://api-docs.defillama.com/) | Real free response/render; units already percent. Custody, pool classification, lock-up, risks and availability unknown. Terms clauses 7/8 restrict commercial use and republishing; acceptance does not remove those restrictions |
| DefiLlama Pro | Yield pools via your subscription | Yes | [Terms](https://defillama.com/terms) | [API](https://api-docs.defillama.com/llms.txt) | Official Pro mapping `/yields/pools` verified; encrypted path key is never included in output. Not tested with a paid key |
| Lido | stETH seven-day SMA APR | No | [Terms](https://lido.fi/terms-of-use) | [Integration API](https://docs.lido.fi/integrations/api/) | Real public response and recorded-response normalization; APR is not APY; listed slashing/contract/depeg risks have a protocol link |
| Bybit earn | Available public fixed-term products | No | [Terms](https://www.bybit.com/en/help-center/article/Bybit-Terms-and-Conditions) | [Product API](https://bybit-exchange.github.io/docs/v5/earn/fixed-term/product) | Official docs and recorded anonymous response; same-coin single reward percent APY only. Tiered or multi-coin rewards stay unknown. No inferred reuse permission |
| Kraken earn | Authenticated strategies | Read-only | [Legal](https://www.kraken.com/legal) | [Strategies](https://docs.kraken.com/api-reference/earn/list-earn-strategies) | Official response example tested; APR ranges are not collapsed into one rate. Minimum and lock type preserved. Not yet tested with a real key |
| Binance earn | First page of flexible Simple Earn products (up to 100) | Read-only | [Terms](https://www.binance.com/en/terms) | [Flexible list](https://developers.binance.com/docs/simple_earn/flexible-locked/earn) | Official Binance Swagger examples tested; fractional latest APR converted to percent; bonus tiers excluded. Not a complete list. Not yet tested with a real key |
| OKX earn | Staking/DeFi offers | Read-only | [API agreement](https://www.okx.com/help/okx-api-agreement) | [Offers](https://www.okx.com/docs-v5/en/#financial-product-staking-get-offers) | Official response example tested. Estimated annualization has an unverified APR/APY basis, so the comparable rate stays unknown. Not yet tested with a real key |

Unverified yield fields remain `unknown`, never zero. EU/France availability stays unknown even if an endpoint responds. DefiLlama rows are not assigned an invented custody or risk classification. Staking defaults to asset A–Z, never a quality ranking. Filters and sort operate on the full retrieved snapshot; the screen displays the first 100 matches and discloses truncation. Narrow filters to inspect other pools. There is no inflation-adjusted yield feed.

## Read-only key checks

Create a dedicated read-only key with **no trading, transfers or withdrawals**. On your VPS, whitelist its fixed IP at the exchange. Keys, secrets and passphrases use the same AES-256-GCM vault as AI keys. The local master key lives beside the database by default: someone who can read both can decrypt keys. The API returns only configured flags, not credentials. Delete key removes the stored ciphertext, disables its connector and clears its staking cache. It is not a secure-erasure guarantee for backups or SQLite free pages.

The app checks permissions before enabling and again before each authenticated product fetch:

- Binance: `GET /sapi/v1/account/apiRestrictions`. Required read/permission flags must be booleans; reading must be allowed, all detected trade, futures, margin, options, portfolio-margin, withdrawal and transfer capabilities must be false. Unknown/malformed required fields refuse the key. Official [Swagger](https://github.com/binance/binance-api-swagger/blob/master/spot_api.yaml).
- OKX: `GET /api/v5/account/config`; `perm` must contain only `read_only`. [Account docs](https://www.okx.com/docs-v5/en/#trading-account-rest-api-get-account-configuration).
- Kraken: `POST /0/private/GetApiKeyInfo`; accept only an allowlist of query permissions (an empty permission list is allowed because listing strategies requires no specific permission). Write, withdrawal and unknown permissions refuse the key. [Key-info docs](https://docs.kraken.com/api-reference/account-data/get-api-key-info). This endpoint was located in the current official sitemap; it supersedes the initial assumption that Kraken permissions were uncheckable.

A source can be enabled only after these checks pass. Replacing a key invalidates the previous enabled state before verification. Errors are generic; no vendor exception is logged or returned. Each authenticated client's transport is limited to its permission endpoint and product-listing endpoint. Kraken uses POST for read-only queries; POST itself is not evidence of trading. The code has no ccxt order, transfer, withdrawal, subscription, deposit or staking transaction paths. A test scans source and built application call sites.

## Hosted tester sandbox

Set `CRYPTOTOOLS_SANDBOX=1` on the app service. All keyed data connectors are unavailable, including DefiLlama Pro; existing keyed connectors are disabled on startup. Key fields and enable controls are disabled in the UI. The backend also rejects enabling or saving data credentials. Only keyless sources can be enabled after acceptance. AI BYOK is separate and unaffected by this data-source flag. This is a single-user research prototype, not a claim that a public multi-tenant deployment is secure.

Staking source requests are limited by a persisted 15-minute refresh/failure cooldown. This is an app policy, not a provider quota or SLA. Test connection is an explicit user request; it may fetch outside that cache interval. Cached observations preserve retrieval time separately from provider observation time. Disabled cached sources are hidden. The app does not bypass provider access controls, buy access, grant licences or resell data.
