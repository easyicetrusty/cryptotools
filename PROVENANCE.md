# Market-data provenance

Candle rows store `source` (`public` or `synthetic`) and `fetched_at`.
Only the allowlisted public-exchange fetch path assigns `public` and a fetch timestamp.
Test fixtures explicitly assign `synthetic`; schema migration defaults older rows to
`synthetic`, because the old cache mixed real fetches and untagged test candles.
A default synthetic label is conservative: it is not proof that every older row was fabricated.

Result provenance combines the selected asset and the BTC reference. One synthetic
or unknown input keeps the whole result synthetic. Public results show the exchange
and oldest fetch time of the candles used. Candle times/range remain separate from
fetch time. Cache reuse preserves the original timestamp.

Bench, assistant tool-derived responses, and completed worker outputs render the
same prominent synthetic warning. Old stored results without provenance use that
warning too. A model response without tool calls says no market-data tool results;
model text always remains unverified. Provenance is assigned by the backend, not
by trusting the model's prose. Workers may also use manually entered paper holdings.
Portfolio quantities/costs are labelled manual paper inputs; valuations show public
Kraken prices and the complete UTC fetch timestamp, not exchange account balances.

## Fix-round captures and build scope

The 2026-10-07 fix-round bench captures use 365 real Kraken BTC/USDT daily candles,
2025-10-07 through 2026-10-07 (end exclusive), SMA 5/20 versus BTC hold,
10 bps fee and 5 bps slippage per fill. Synthetic bench captures are separate.
Assistant/workers captures use explicitly labelled mock-provider synthetic tests.
The earlier step-3 synthetic bench/assistant/worker gallery is superseded, not market evidence.

Only amd64 was rebuilt in this fix round. The existing arm64 image and multiarch
archives are previous revisions. Rebuild arm64 and archives before distributing this fix
on ARM or presenting those archives as containing it.

## Regression commands (Linux test VM only)

- `npm run build && npm test` under Node 22.
- `node tests/fix1-public.mjs` under Node 22 uses a dedicated real-data cache.
- `node tests/fix1-browser.mjs` uses Linux test VM Chromium and two fixture apps on loopback
  8080 (synthetic) and 8082 (public), plus the test-only mock provider on 9090.
  Its JSON manifest records capture times and DOM labels, including saved form dates/timeframe.

No real exchange credentials are required for these checks.
