# Results you can inspect (0.7.1-beta.2)

The original v0.7.1 tag is retained. This correction closes a cross-timeframe seal/seen-history gap: changing timeframe on the same source/market/dates cannot bypass an active seal or claim fresh evidence. Metrics, fills and existing saved results retain their original definitions.

Past behaviour of a simulation. Not a forecast. Not financial advice.

This is descriptive information, not a strategy ranking or a recommendation. The user selects runs and parameters. It does not establish an edge. Existing spot execution/cost/feasibility assumptions remain in [HONEST-BENCH.md](HONEST-BENCH.md). Each asset is an independent run, not a shared-wallet portfolio.

## Series and clocks

Metrics version `daily-equity-1` reads the existing per-bar cash/inventory marked-equity ledger. A bar starting at `time` is marked at `time + interval`; its close belongs to UTC day `floor((time + interval - 1ms) / 86400000)`. Keep the last mark per UTC day. Require contiguous bars/days and strictly positive finite equity; fail rather than fill gaps with invented returns. First daily return is first daily equity / starting capital - 1. Later returns are daily equity / previous daily equity - 1. Indicator-only warm-up never contributes returns or exposure.

All annualisation uses **365 UTC daily observations**, not 252 stock-market sessions. Partial first/last days are retained, not padded or silently annualised as hourly observations. Coverage discloses actual boundaries. Partial months are included and labelled. Very short samples may give extreme CAGR and unstable ratios.

Default annual risk-free rate is **0**, editable in the metrics panel or report query. `dailyRf = (1 + annualRf)^(1/365) - 1`, with -1 < annualRf <= 1. This input is not a forecast of interest rates. Report methods record the chosen value. Risk-free changes do not alter fills or saved economics.

Let `r` be daily simple returns, `x = r - dailyRf`, `n` observation count, `s` sample standard deviation (divisor n-1), `mk = mean((r - mean(r))^k)`.

| Metric | Definition |
|---|---|
| Total return | final marked equity / starting capital - 1 |
| CAGR | (1 + total return)^(365/n) - 1 |
| Annualised volatility | s(r) * sqrt(365); null for n < 2 |
| Sharpe | mean(x) / s(x) * sqrt(365) |
| Sortino | mean(x) / sqrt(sum(min(x,0)^2)/n) * sqrt(365); denominator uses all observations, not only negative ones |
| Calmar | CAGR / abs(max daily drawdown) |
| Underwater / max drawdown | equity / running maximum including starting capital - 1; maximum drawdown is the minimum signed fraction, not a positive loss magnitude |
| Drawdown table | deepest five episodes by signed depth; start = preceding peak, trough = deepest mark, recovery = first mark >= peak, or null/unrecovered |
| Drawdown length / duration | UTC calendar days from peak to recovery or final observation if unrecovered; duration metric = longest episode across **all**, not only top five |
| Historical VaR 95% | signed-return empirical 5th percentile with linear interpolation at index (n-1)*.05 |
| Historical CVaR 95% | mean observed daily returns <= that VaR threshold; no normal-distribution tail extrapolation |
| Daily/monthly best/worst | observed maximum/minimum; monthly return = product(1+r) - 1 within each UTC calendar month |
| Daily/monthly win rate | positive nonzero periods / all nonzero periods; null if all zero; **not** completed-trade win rate |
| Exposure | fraction of equal-duration evaluation bars with base quantity > 0, including a held position whose return is zero; missing legacy quantities = undefined, not zero; native BTC cash benchmark has zero simulated base exposure |
| Sample skew | sqrt(n*(n-1))/(n-2) * m3/m2^(3/2), n >= 3 |
| Excess sample kurtosis | (n-1)/((n-2)*(n-3)) * ((n+1)*m4/m2² - 3*(n-1)), n >= 4 |
| Rolling Sharpe / volatility | same formulas on trailing full 30 and 90 daily observations, including the last observation; null before a full window |

Zero variance, zero downside, zero drawdown, too few moments, or an invalid PSR denominator yield **null/Undefined**, never an infinite quality score. Zero volatility with at least two identical observations is zero; it does not establish zero future risk. Monthly heatmap colour encodes signed return and magnitude, with explicit numbers. Equity overlays use original UTC dates, not index alignment; comparisons normalize starting capital to 100 and warn about capital differences.

## Probabilistic Sharpe Ratio

Bailey & López de Prado, *The Sharpe Ratio Efficient Frontier* (2012): benchmark daily Sharpe **0**. Daily observed SR = mean(excess daily returns) / sample std(excess daily returns). Use standardized **population central moments**: g3 = m3/m2^(3/2), g4 = m4/m2² (Pearson kurtosis, normal = 3). With at least four observations:

`PSR = Φ((SR_daily - 0) * sqrt(n-1) / sqrt(1 - g3*SR_daily + (g4-1)*SR_daily²/4))`

Φ uses an independently implemented erf approximation, absolute tolerance 1e-7. Assumptions: IID stationary returns and finite moments. Autocorrelation, fat tails, nonstationarity, parameter selection and repeated tests can undermine this approximation. It is neither a probability of future profit nor proof of a strategy's quality. No deflated Sharpe, multiple-testing correction or optimizer is supplied.

## QuantStats oracle and deliberate differences

Formula reference and numerical test oracle: **ranaroussi/quantstats 0.0.77**, Apache-2.0. Independent TypeScript implementation; no upstream source copied. QuantStats and Python are **not** installed in the production image. The cowork-only venv adds pinned IPython 9.6.0 because this QuantStats release imports it without declaring it. Complete resolved versions are recorded in `tests/fixtures/results-oracle-requirements.txt`.

`tests/results-record.mjs` records two real 180-day strategy ledgers (Kraken ETH/USDT and OKX SOL/USDT), both real BTC reference ledgers, and one independently authored synthetic ledger. `tests/results-oracle.py` produces the committed JSON fixture. All fifteen same-definition metrics and every computable 30/90 rolling point are compared at risk-free 0% and 4%, with **abs error <= 1e-8 + 1e-8 * abs(expected)**. CI reads JSON and needs only Node. This is numerical convention parity on these inputs, not independent financial validation or profitability evidence.

Definitions deliberately differ, so separate hand-computed fixtures cover them:

- QuantStats 0.0.77 VaR is normal **parametric** mean + normal quantile * sample std; its CVaR filters at that parametric threshold. Ours is historical empirical quantile/tail mean, as required.
- QuantStats exposure counts nonzero returns and rounds upward to whole percentage points. Ours uses actual held bar time and can differ when an invested price is unchanged.
- QuantStats drawdown details start on the first underwater day and end on the last underwater day, inclusive. Ours reports the preceding peak and actual recovery, or explicitly unrecovered; lengths differ. Daily maximum depth and Calmar match the oracle, including starting-capital loss.
- QuantStats PSR uses its sample **excess** kurtosis in an expression that subtracts 3, and handles RF differently from our daily excess-SR population-moment definition. We retain the explicitly stated Bailey/López de Prado convention, with zero-mean .5 and nonzero hand fixtures, rather than imitate this pinned implementation silently.
- Flat all-zero periods have an undefined period win rate here; QuantStats returns 0. Its flat-ratio infinities are null here.

The fixture also records the oracle's alternative definitions for audit. Changing QuantStats versions or formulas must be an explicit fixture/method revision.

## Saved runs and reports

Select **2–4** saved frozen runs. Source guards apply independently to every selected run. Warnings compare manifests: data source, requested/actual range, fees/provenance, market-rule hashes, slippage, symbol/quote, timeframe, starting capital, data hashes and app/engine versions. Current rule capture timestamps can differ; a warning is not evidence that a venue changed its rules. No winning column, preferred strategy or auto-sort by judgement.

Every frozen run, including pre-0.7.1 v0.7.0 bundles, has an additive metric view and downloadable **single-file HTML** report. Original economics, ledger, digest and manifest are retained. Reports include provenance, full manifest, modelled/omitted panel, charts, metrics, daily marked-return breakdown and strategy/BTC fill/rejection ledgers. Text is escaped. CSS/SVG are inline, no script, no external URLs/requests; provider reference strings retain host/path without URL schemes. Default is light and print-friendly. Browser test dark report captures use an inline stylesheet override, not a second export theme.

Old pre-0.7.0 fractional results retain their existing latest-result/legacy panel; they did not have frozen manifests and cannot honestly get a frozen report/replay. Their missing position quantities never imply zero exposure. Run a new test to obtain a frozen report. Downloads are source-gated, but files already downloaded are outside later revocation and may contain provider-restricted data. Terms acceptance remains separate from reuse rights.

## Sealed out-of-sample protocol

From the main test form, choose Start < Split < End with at least three bars in each aligned, disjoint window. Create fetches/evaluates **tuning only**. No sealed equity/metrics are stored or displayed yet. Ordinary backtests (including AI calls) and AI OHLCV cannot cross an active sealed range; ordinary bench guard also covers indicator warm-up. AI has no create/unseal tool. `get_run_metrics` reads saved source-gated metrics with the same neutral framing.

Explicit **Unseal once** plus confirmation evaluates [Split,End). Strategy parameters, actual asset/BTC fee rates, slippage policy and both market-rule snapshots are frozen from the immutable tuning bundle, not looked up again at inspection. Previously recorded preceding tuning timestamps are reused for indicator history; new sealed bars are fetched only now. An engine-version change refuses unseal rather than silently reinterpreting the strategy. Evaluation uses independent starting capital and pre-range indicator-only history, not training inventory or P&L. The one-time result and protocol identity/role/seen state enter the frozen manifest. Persistent experiment inspection state links tuning and sealed run IDs. Repeated unseal returns the existing run; recreating the same configuration cannot re-seal. A concurrent unseal is refused while evaluation is in progress. A failed fetch leaves it sealed; an interrupted in-progress state requires owner recovery rather than silently claiming freshness.

Prior overlapping ordinary saved runs or read-only AI inspections mark a newly created sealed window **seen**. Unsealing another overlapping experiment marks waiting windows seen. Later parameter revisions and ordinary retests on inspected sealed dates carry **SEEN WINDOW** labels and frozen manifest annotations. Initial untouched inspection retains its original seen=false label instead of retroactively changing it after opening.

This is an honest **local workflow, not cryptographic secrecy**. The installation owner can read the database or independently obtain public history. Resetting/deleting a data volume loses inspection history. Changing source/symbol creates a separately tracked data window; changing timeframe does not reset date inspection history. For the same source and market, all timeframes share the seal/seen-date guard; this does not prove information independence. There is no optimizer, automated walk-forward or promise of untampered out-of-sample evidence.
