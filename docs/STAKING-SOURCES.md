# Staking information: source-limited beta (0.4.0)

Checked 7 October 2026. This screen supplies neutral information, not recommendations. It is **not yet a cross-venue comparison**: only one Lido liquid-staking option qualifies for the current feed. More rows require suitable public data and verified permission to use it. No exchange keys, transactions, affiliate links or referrals are implemented.

## Implemented: Lido public read-only API

- Integration documentation: https://docs.lido.fi/integrations/api/ explicitly describes APIs to integrate in apps/websites and read-only access.
- Feed: https://eth-api.lido.fi/v1/protocol/steth/apr/sma , schema https://eth-api.lido.fi/api-json . Anonymous requests returned data without a key or payment.
- The `smaApr` value is the simple moving average of seven daily **APR** observations, expressed as a percentage. It is not compounded APY. Show APR separately and APY/base APY/reward APY as unknown, not a guessed conversion.
- Source observation timestamp is the newest `data.aprs[].timeUnix`, not the HTTP fetch time. Both are shown with ages. The seven-day lookback is part of the rate type label.
- Metadata identifies Ethereum stETH. Protocol/type/custody description is sourced from the integration docs, https://lido.fi/terms-of-use and https://docs.lido.fi/prd/ . On-chain custody does not mean funds stay outside smart contracts.
- Slashing, smart contract and secondary-market price-deviation (depeg) risks are listed from the PRD, not a score or an exhaustive risk assessment. No 'safe' or quality badge.
- APY, base/reward split, precise lock/unbonding time, minimum, USD TVL, promo status and EU/France availability are unknown in this feed. The screen does not infer zero or universal access. A max-lock or min-TVL filter excludes unknowns; hiding promos excludes unknown promo status.
- API quota is unspecified in the checked API docs/Swagger. This is not a promise of unlimited access. The app limits refresh to once per 15 minutes per SQLite database, deduplicates in-flight reads, persists failure cooldowns, times out in 10 seconds and never silently replaces failed data with sample rows.
- Cached data becomes stale after 15 minutes since fetch. Observations older than 36 hours get a separate stale-source label. These are application display thresholds, not source SLAs. No row is called 'live'.
- Integration documentation is the basis for use, not a claim of legal clearance or a blanket licence for all Lido material. Recheck terms before commercial launch; the previously required avocat review still applies.

## Excluded or deferred

| Source | Direct check | Decision |
| --- | --- | --- |
| DefiLlama | https://yields.llama.fi/pools works anonymously. https://defillama.com/terms clauses 7/8 restrict commercial use and republishing without permission. APY methodology: https://github.com/DefiLlama/yield-server | Excluded pending written permission. A public API and an open adapter repository do not establish API-data reuse permission. API numeric quota unverified. |
| Bybit | https://api.bybit.com/v5/earn/fixed-term/product works anonymously. Canonical docs https://bybit-exchange.github.io/docs/v5/finance/earn/fixed-saving/product say authentication not required, up to 50 requests/sec/IP. FlexibleSaving listing also responded, but canonical docs not established. Checked API terms help article returned 'not supported'; legal pages did not provide usable terms text in the captured static response. | Excluded: reuse permission unverified. Public fixed-term listing is **not** key-required. |
| OKX | Public https://www.okx.com/api/v5/finance/savings/lending-rate-summary works. Official docs: annual borrowing rates, 6 requests/sec/IP. Earn offers are private in ccxt; https://www.okx.com/help/okx-api-agreement sections 9.3/9.4 restrict commercial integrations and redistribution, including anonymous data. | Borrowing rate is not earn APY. Earn: needs read-only key, later, plus permission review. Public-data terms also warrant review of the pre-existing OKX spot-data feature before commercial launch. |
| Kraken | ccxt 4.5.85 declares `Earn/Strategies` under private POST. No credential supplied or request sent to private endpoints. Initial guessed docs URLs returned 404. | Needs read-only key, later. Recheck canonical docs, permissions and limits before an adapter. |
| Binance | ccxt 4.5.85 declares `simple-earn/flexible/list` under authenticated SAPI GET. Official Simple Earn documentation URL challenged the static fetch. | Needs read-only key, later. Recheck canonical docs, permissions and limits before an adapter. |
| Coinbase | Public product-list docs describe market products, not a verified earn/staking feed. | Earn feed/auth/reuse unknown; not implemented. |

## Neutral controls and assistant

Default asset A–Z is a mechanical ordering, not a judgement of yield or quality. All displayed table columns can be sorted ascending/descending; unknown values remain last. Filters never impute values. The read-only `get_staking_options({filters})` tool uses the exact same normalization, cache, filtering and sorting as the screen API and returns source URLs, fetch and observation timestamps, ages, freshness, unknowns and coverage gaps. It contains no recommendation/ranking/quality fields; model prose remains untrusted under the existing neutral system policy.

Net-of-inflation yield is omitted. No verifiable, comparable inflation feed is integrated; nominal APR minus a guessed token-inflation number would be misleading. The rate is not adjusted for gas, taxes, individual execution costs or currency changes.

Fixture `tests/fixtures/lido-sma-recorded-2026-10-07.json` is a labelled recorded real API response with its actual capture time. Mutated values in unit tests are expressly test-only. Browser screenshots fetch the actual public feed; production never seeds from this fixture.
