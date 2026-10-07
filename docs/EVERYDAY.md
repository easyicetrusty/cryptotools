# Everyday use · 0.7.3-beta.1

This revision also rechecks portfolio access after awaited tools and before later model requests. If access changes, pending or previous portfolio results are withheld and the operation aborts with a clear message. Data already sent cannot be recalled. Earlier v0.7.2/v0.7.2-beta.2 tags/images are retained and superseded. The higher patch version lets original v0.7.2 installations detect the update.

Information only. Paper research, no orders or optimiser. Data sources remain off until the user accepts their terms and enables them. Acceptance is not a data licence.

## AI budget accounting

Each configured provider has one persistent shared budget for assistant chat and all worker roles/models. Defaults are **50,000 budgeted tokens per UTC day** and **10 HTTP requests per rolling minute**. Every tool round counts as another request. Settings accepts explicit unlimited checkboxes; zero daily cap stops requests. Changing the cap does not erase usage. The assistant/workers screens show counters, remaining policy and UTC reset time. Failed jobs retain clear daily/rate refusal messages.

Before dispatch, reserve serialized request UTF-8 byte length plus the maximum output of 700 tokens. This counts messages, system text and tool schemas/results. It is deliberately more conservative than a typical token estimate. If reported total usage is higher, increase the debit; never refund a reservation. Native Anthropic input/output and cache-write/cache-read usage are included. Missing/invalid usage keeps the reservation. Failures count because a provider may have processed a request before transport failed. Unknown usage is labelled in the meter. Requests reserve synchronously in the single app process so workers and concurrent chats cannot overbook it. Provider-reported usage can exceed the reserve; that debt prevents further requests but cannot undo that provider's bill.

**This is not a billing guarantee or dollar cap.** Tokenizers, hidden reasoning, cache pricing and provider reporting vary. Keep a dedicated spending-limited key and set hard limits at the provider too. Daily usage is charged to the UTC day at dispatch, even if a response crosses midnight. The rolling minute survives midnight and restart. Usage history is local; it is not telemetry.

## OpenCode Zen preset and terms

Checked official [Zen docs](https://opencode.ai/docs/zen/) and [privacy policy](https://opencode.ai/legal/privacy-policy) on 7 October 2026. Base URL: `https://opencode.ai/zen/v1`. The docs' endpoint table lists chat completions with `@ai-sdk/openai-compatible`, alongside incompatible Responses, native Anthropic/Google and System One endpoints. The preset admits only captured chat-completions models with tool capability metadata; it does not route every Zen model through the same endpoint. Current model availability can change. No OpenCode coding harness, shell or filesystem tools are shipped.

Keys: sign in to Zen, review billing, add billing details and copy your own API key. Its docs say balance below $5 automatically reloads $20 unless changed/disabled. This app does not create accounts, add credits or disable that setting for you. Never assume a free model means a free account or unchanged terms.

At capture, free models include Big Pickle, Space Bunny Free, LongCat 2.5 Preview Free, Exo Free, Fledge Alpha Free, MiMo-V2.6-Flash Free, MiMo-V2.5 Free, Ling 3.1 Flash Free, Ling 3.0 Flash Fin Free, Nemotron 3 Ultra Free and Nemotron 3.5 Lightning Free (chat-completions compatible); Muse Spark 1.3 Contributor Free uses Responses and Jev 1.13 Free uses System One, so neither is admitted. Free availability is limited-time and not guaranteed.

Official privacy distinctions at capture:
- Big Pickle, Exo, Fledge, MiMo and Ling free periods may collect data to improve models.
- NVIDIA Nemotron free endpoints are trial-only: do not submit personal/confidential data; use is logged for security and product improvement under NVIDIA trial terms.
- Space Bunny and LongCat providers state zero retention and no training, despite being free. The generic caution still appears because terms can change.
- Muse contributor exchanges prompt/completion training permission for pricing; excluded because its protocol is incompatible.
- Other documented exceptions include OpenAI/Anthropic 30-day retention, and provider-specific Mistral/Jev retention. Do not describe the whole gateway as zero-retention.
- The OpenCode privacy policy describes passing prompts upstream and says not stored for that category. These are published provider statements, not our independent audit of its infrastructure.

Only mock HTTP tests and captured documented examples are used. Real hosted model behaviour, keys and billing remain unverified.

## Privacy acknowledgement and portfolio switch

Before using a free/stealth/unknown-labelled model or any custom endpoint, the server refuses requests until the user acknowledges:

> This provider may log or train on your questions and the portfolio data the assistant sends. Use a paid or local model for private data.

Approval is persistent but tied to provider + effective model + endpoint, including worker model overrides. Changed models/endpoints need separate approval. A per-provider **Never send portfolio data to this provider** setting removes `get_portfolio` from both protocol schemas and refuses malicious or in-flight requests for it. Workers do not relay prior outputs to another worker/provider, avoiding indirect portfolio-tool disclosure. The reviewer instead uses its own read-only observations; combined results remain available locally. This is not a content-classifier/DLP promise: user-entered prompts/goals can still disclose holdings or private data. Do not type such material when the provider is unsuitable.

## Paper value history

Startup, each UTC midnight while the app runs, and explicit history views attempt a mark. The first successful observation per day/holdings revision is retained; a holdings edit replaces that day's mark, so it is not a trading-return series. A failed/incomplete valuation is a gap and can be retried on a later explicit view. No daemon creates marks while the container is stopped. Missed days are not backfilled from today's holdings or interpolated. No fees, flows or profits are inferred.

Use the first enabled spot connector in catalogue order, as on the current holdings screen. Each holding must have a finite public quote. Any missing holding price makes that quote-currency mark unknown. Different quote currencies get separate series, never an FX sum. A previously tracked quote with all its paper holdings removed marks zero; no price source is needed for that empty group. UTC day, actual capture time, source IDs and holdings revision are retained in SQLite/CSV. Revoked sources hide affected values and capture details, leaving a visible gap. No historical dataset is bundled.

## JSON strategy-test presets

Schema `schemaVersion: 1`, `bench` object (market, timeframe, UTC date range, strategy, all parameters, capital, fee policy/override and slippage) and `seal: {split: <UTC midnight timestamp or null>}`. These are settings only, not saved results, credentials, executable code or inspection state. Import is limited to 16 KB, rejects unknown schemas/fields and invalid numeric/date/seal values, and fills the existing date-based form. It neither fetches candles nor runs a test/unseals. Imported settings do not reset seen-window history. Review settings and choose Run explicitly. The current UI uses whole UTC dates, including hourly tests.

## Own-channel notifications

Both channels are **off by default**. Telegram requires the user's own bot token + chat ID. Email requires their own SMTP host, sender/recipient and optional authentication; 465 implicit TLS or 587 required STARTTLS, certificate verification on. Secret values use the same authenticated AES-GCM vault as other keys. Metadata returns configured status only; Delete removes the saved credential and disables the channel. In sandbox, no channel exists unless the user supplies one explicitly. No real channel credentials are used in tests.

Select events explicitly: worker job finished, worker job failed, AI daily cap reached, data-source failing, app update available, sealed window unsealed. No arbitrary log forwarding or bot-control commands. Each event has a fixed neutral template, with **no job IDs/goals, error text, prompts, balances, holdings, keys or trades**. The API does not accept message text. Send test message uses another fixed template.

At most five attempts per rolling minute per channel, persisted across restart. Failed deliveries count, are sanitized and are not automatically retried. Job completion, unseal and update IDs deduplicate; cap events deduplicate daily; source failure events coalesce by source per 15 minutes. Disabled/unselected events do nothing. Update checks are explicit and contact public GitHub release metadata; there is no automatic updater. SMTP/Telegram receive connection/delivery metadata and the selected generic status. Review their terms yourself.

## Connector data and fixture boundaries

`src/connector-quirks.json` holds schema/version, capture date, supported timeframes, current-history/page constraints, ccxt base delays/method declarations, fee links and limitations for all twelve sources. The app uses declared bench timeframes and page bounds; Coinbase Exchange 4h is rejected, not silently mapped to 6h. Kraken recent OHLC limit is 720; other total-history limits are unknown. ccxt base delay is not the endpoint's full weight/quota model. ccxt package 4.5.85 reports internal version 4.5.84 in the captured metadata; both are recorded. Public access/eligibility and data rights are separate.

One JSON fixture file per connector: seven fresh public responses, retained public Bybit earn response, three explicitly labelled official private examples, and a free-response Pro-schema example (not actual paid access). Only two DefiLlama pools are retained as parser fixtures, not a bundled market feed. Parsing tests do not establish real keyed permissions or completeness. All source gates and the transaction-call scanner remain in the suite.
