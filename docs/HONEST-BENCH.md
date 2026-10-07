# Honest spot test bench (0.7.0)

This is a research model, not an exchange fill guarantee, forecast or recommendation. No orders are sent.

## Timing and startup

Each candle opens at its OHLCV timestamp and becomes available at timestamp + timeframe. At a shared timestamp the phases are: previous candle closes, strategy decides, next candle opens and simulated fill occurs. This assumes zero delay. Strategy code uses only earlier closed candles for a fill; the fill's opening price is used for simulated execution, not for its signal.

Before the requested range the app requests indicator history: one bar for hold, `slow` for SMA, `rsiPeriod + 1` for Wilder RSI, fourteen daily bars for weekly momentum. Only range candles enter the equity series. Capital and positions reset at the range start. If the provider supplies less history, indicators remain inactive until their startup requirement is met. The panel records required/available history; RSI can remain sensitive to longer preceding history. BTC deploys on the same evaluation range using a previous closed-bar hold signal where history exists. Final inventory is marked, never forced out.

## Venue rules

Public ccxt loadMarkets is refreshed through the enabled-source boundary. Every run stores the exact normalized snapshot, capture time and canonical SHA-256. Its data includes amount/price precision mode and granularity, minimum amount/cost and maximum/price bounds where available. Unknown bounds are unverified, not zero. Missing precision blocks the run rather than claiming exchange feasibility. Binance's ccxt market amount maximum is preferred where present.

Amounts truncate with ccxt's tick-size, decimal-place or significant-digit semantics. Modelled prices round adversely to the price grid: acquisition up, disposal down. This is a conservative grid assumption, not a claim about the exact mechanics of real market orders. Quantity is sized after reserving quote fees and adverse impact. Residual cash and inventory dust remain in the ledger. Rounded orders violating bounds are skipped, counted and logged. A failed disposal leaves the position open. Repeated intents can each be rejected on successive opens.

Current metadata is applied to historical candles. Historical changes, dynamic exchange filters, regional rules and actual order acceptance are not reconstructed. This model checks supplied static bounds only; it does not establish that an order would be accepted by a venue.

## Fees

Every fill pays **taker**, charged in quote currency on rounded fill notional. Maker metadata is displayed, not used for a hypothetical passive fill. Exchange mode uses ccxt market/adapter maker/taker metadata, with its version and capture date; these are not private account fee-tier quotes and may be outdated. No private fee endpoints are called. Override mode uses the user's bps on both legs and the BTC benchmark; exchange mode uses each market's own metadata.

The 2026-10-07 captured Kraken published general spot tier-one schedule differs from ccxt 4.5.85's defaults. For explicitly identified ordinary BTC/ETH/SOL-base pairs the effective default is published maker 40 bps / taker 80 bps. Source: https://www.kraken.com/features/fee-schedule, captured 2026-10-07T19:43:32+02:00, SHA-256 `d645a82958d510e952e0078ece90c2305030780e7eed2d5ceab0855afb866e98`. The snapshot retains original ccxt values and the publication hash. Applicability, account and regional tiers still require user verification. Special/unknown Kraken pairs keep labelled ccxt metadata, not an inferred schedule. Other captured ccxt BTC/USDT maker/taker bps: OKX 10/15, Bybit 10/10, Binance 10/10, Coinbase Exchange 40/60. These are metadata observations, not assurances of current account charges. Unavailable fee metadata requires an explicit override rather than a zero-fee fallback. No unsupported published rate is invented when a fee page is inaccessible.

This deliberately simplifies native base/quote/discount-token fee policies to quote-equivalent charges. Account discounts, fee-asset rounding, maker rebates, historical fees and special pair schedules are not reconstructed.

## Slippage

Flat bps: adverse price adjustment on each acquisition/disposal before grid rounding.

Optional causal volatility/volume model:

`bps = flatBps + 10000 * sigma * sqrt(requestedBaseQuantity / meanBaseVolume)`

`sigma` is population standard deviation of log close returns within at most twenty preceding closed candles. `meanBaseVolume` is the mean volume of those same candles. Entry requested quantity is fee-reserved cash divided by the unadjusted next open; actual size shrinks after impact. Disposal requested quantity is held inventory. Empty/zero volume skips the intent. There is no impact cap; non-positive disposal prices skip. Few observations can give zero estimated volatility, disclosed by the formula/window. Current or future candle volume never enters its own opening fill.

This is a user-chosen synthetic impact assumption. Total bar volume is not executable liquidity at the opening price. Total slippage in the ledger includes adverse price-grid rounding.

## Accounting, replay and compatibility

Per-bar cash + quantity × close = marked equity. The ledger retains cash, inventory, close, cumulative fee/slippage and each rejection. Completed trade P&L is separate from open marked inventory. BTC has its own candles, rules and fee snapshot; native BTC quote uses unchanged native cash without fictitious swaps.

Every new saved result has an immutable SQLite bundle of evaluation/pre-range asset and BTC candles, coverage, requested/actual dates, parameters, costs, both snapshots, versioned engine/app identity and canonical hashes. Re-run exactly uses only that local bundle, still requiring the source to remain enabled. Hashes detect input corruption. The UI reports identical or differing result fields; engine/app changes can legitimately differ. New provider candles or mutable cache changes cannot rewrite an old bundle. Old saved tests remain legacy fractional results, explicitly labelled and lacking exact replay. The existing candle and saved-test tables are preserved.

Not modelled: order-book depth, partial fills, latency, funding (spot), taxes, outages, dynamic filters, native fee-asset/discount policies and historical changes. Data-source enablement/terms and the user's rights remain separate from software licensing. Acceptance does not grant reuse rights. Saved raw datasets are local, not distributed provider data.

## Tests

Independently authored synthetic arithmetic, precision/minimum/dust, all-strategy prefix/future-mutation/startup, accounting and replay/source-boundary fixtures. Recorded public metadata is explicitly labelled and dated in `tests/fixtures/market-rules-recorded-20261007.json`; it is not a synthetic feed or historical schedule. Existing strategy/BTC/provenance/source tests continue to run. Passing these cases is not universal bias-freedom or profitability validation.
