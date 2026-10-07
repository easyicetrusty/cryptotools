# Trends: observed activity, not prediction

The screen and read-only `get_trends({filters})` tool use only public connectors you enabled and accepted in Data sources. All connectors still start off. Provider terms acceptance is not a licence or permission to redistribute data. No credentials, execution, sentiment, social feeds or stablecoin-flow feeds are added here.

## Volume leaders

Rolling 24-hour spot turnover, mechanically sorted by the numeric value. The combined view sums markets by each exchange's base-asset code. Codes can collide across unrelated tokens; they are not verified on-chain identities. Each exchange subtotal stays visible, with individual market details and exclusion counts. First five base codes are shown initially, with a control for twenty; per-exchange tables show ten markets. Calculations use every normalized market, not just displayed rows.

USD, USDT, USDC, DAI, FDUSD and TUSD quotes assume one USD per unit. This is an approximation, not a depeg-adjusted FX conversion. Other fiat/crypto quotes are excluded and counted. If source quote turnover is absent, base volume times last price is used and marked approximate. Invalid or absent volume is excluded, never filled with zero. Coinbase Exchange's ccxt batch spark-line endpoint omits turnover: its leader/surge values are unknown with missing-data counts, while its selected-market trade flow works. This release does not make hundreds of individual Coinbase ticker requests to manufacture a whole-venue ranking. Reported volume may be distorted by wash trading. Turnover is not unique people, net capital inflows or popularity verified independently of providers.

## Volume surges

Rolling 24-hour turnover divided by that market's mean turnover over the previous thirty complete UTC daily candles. Daily quote turnover is approximated by base volume times closing price. This differs from exact intraday quote turnover and from a rolling 24-hour daily window. The current incomplete day is excluded. Thirty contiguous, unique daily candles and a positive average are required; insufficient history produces an unknown ratio, with available daily history still shown.

Daily OHLCV is fetched only when this metric is requested. Universe: the top N eligible USD-quoted spot markets by reported volume on each enabled venue, default 50, choices 25/50/100. Stablecoin filters apply before universe selection. This is a market universe, not N distinct assets. Coverage discloses all active spot markets, eligible normalized markets, completed attempts, failed/incomplete history and cache hits. Partial rows appear during scanning; displayed ratios sort numerically with unknowns last. Initially ten rows per venue are shown; expand to all scanned markets.

History jobs are bounded to two globally and one per exchange. Starts respect ccxt rateLimit; ccxt weighted endpoint throttling stays enabled. Identical running/fresh scans coalesce for five minutes. Entering the view, changing controls or checking snapshots initiates one scan; progress polling only reads it and never launches another. Closed daily candles persist by exchange/symbol/time and are reused across filters, universe changes and midnight, including public test-bench candles and legacy trend history. Only contiguous missing ranges are requested. Incomplete/failed histories remain unknown; failures advance progress. No whole-market historical crawler runs in the background.

## Stablecoin filters

Leaders and surges default to excluding stablecoin-to-stablecoin pairs. A separate stablecoin-base exclusion defaults off. Both can be unticked/ticked and are saved with universe size in the single-user workspace. They are neutral classifications, not quality or safety judgments. Fiat USD is not a stablecoin; unknown token codes stay unclassified. The conservative list is maintained in `src/stablecoins.ts`, with issuer documentation links also shown in the UI: Tether USDT, Circle USDC/EURC, Sky DAI/USDS, First Digital FDUSD, TrueUSD TUSD, Paxos USDP/PYUSD/USDG/BUSD (BUSD retained for legacy market codes), Ethena USDE. Codes may collide and are not verified token identities or peg guarantees. Coverage counts stablecoin-filter exclusions separately. No flow or futures filtering is implied.

## Aggressor flow

Every trade has a buyer and a seller. This shows which side was more eager (crossed the spread), not that more people bought than sold.

A selected exchange spot market and requested 1-hour or 24-hour window use one public trade request, capped at 1,000 records. Provider limits can be smaller. Explicit raw fields are required: Kraken public side, OKX taker side, Bybit initiating side, Binance buyer-maker flag, Coinbase maker-side inversion. Missing fields are unknown, not inferred from a parser default. Duplicate trade IDs are counted once. Unknown sides or turnover are excluded and counted.

Full-window totals are unknown unless the bounded sample reaches the start and has records within one minute of capture; any unclassified records also make full-window totals unknown. The observed sample and its actual timestamps remain separately labelled. This test of endpoints is not a guarantee against gaps in provider history. Bucket charts represent only that sample. Sparse-market histories may remain unknown even when an exchange supplied everything it has.

## New listings

Successful active spot-market lists are persisted and compared. First use says baseline taken. A new market receives the time this installation first observed it, not an invented exchange launch date. First-seen records survive later snapshots and restart. Market lists are checked at most once per fifteen minutes; markets appearing and disappearing between checks can be missed. A user disabling a source can create a snapshot gap. Previous first-seen records are retained (up to fifty displayed).

## Futures positioning

Only existing enabled public Binance, Bybit or OKX adapters expose linear perpetual metrics in this version. A matching base and quote spot market is selected by the user. Kraken's spot connector and Coinbase Exchange do not expose keyless perpetual metrics through these adapters; values stay unknown.

- Funding rate: periodic contract transfer rate, not a staking yield or an annual rate. Next funding time and source observation time may be unknown.
- Open interest: outstanding positions, with amount in the provider/ccxt units and USD value only when explicitly supplied. No invented contract-size conversion.
- Basis: `(perpetual last price / spot last price - 1) × 100`, not annualized. Quotes are successive snapshots, not an atomic cross-market observation. Missing prices yield unknown basis.

Funding snapshot history in this installation produces a mini-chart after two captures. Volume market snapshot history is also retained. Daily turnover and sample-flow charts appear when available; a single point or unavailable series says history unknown.

## Test bench and AI

The link preselects the actual spot exchange and symbol in the existing test bench. It tests past behaviour only, after the bench's modeled costs. No strategy type or prediction is added. Trend tool payloads carry definitions, enabled sources, source links, fetch/observation times, ages, breakdowns and unknown values, without judgment scores or action fields. Hosted AI receives requested tool data under its own terms. Its prose remains untrusted; a word filter is not a fact checker or a complete advice detector.

## Persistence and limits

Volume/futures snapshots cache for five minutes, trades for one minute and listings for fifteen minutes. Disabled sources are checked before connector creation, each HTTP call and cached output. Network failures return unknown for that venue. Surge progress polling reads only the current scan while the view is open; it never starts a new fetch. The app never enables sources itself.

Staking presets compose with manual filters, persist in the single-user workspace and are optional. The default remains asset A–Z with none applied. TVL threshold is editable. Explicit source categories alone map staking, liquid staking and lending; protocol names never infer a type. The promo/reward preset requires explicit non-promo status, positive base APY and zero reward APY, excluding unknowns. Contradictory custody presets produce an empty result.

Tests scan UI literal strings, rendered trend pages and trend tool payloads for directional/action words. The exact required aggressor explanation above is the only copy exception. Mechanical source-market codes are not investment judgments. Native Windows/macOS/ARM hardware and commercial legal clearance remain outside these checks.
