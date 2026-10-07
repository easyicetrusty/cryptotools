# Crypto tools

A local, single-user crypto research workspace. This is a free beta prototype for paper research only. It uses public market data, cost-aware historical tests, manually entered paper holdings and an optional AI assistant.

**No live trading, no orders and no exchange credentials.** There is no testnet order execution either. This is information, not financial advice. The user decides. Historical results and model output are not forecasts. Read [DISCLAIMER.md](DISCLAIMER.md).

Licence: GNU Affero General Public License v3.0 (AGPL-3.0). See [LICENSE](LICENSE). Copyright (C) 2026 easyicetrusty.

## What works today

- Public spot data through ccxt for Kraken, OKX and Bybit, subject to endpoint availability and history limits.
- Historical hold, SMA crossover, daily weekly-trend and RSI tests with per-fill fees and slippage. Strategy results are compared with timestamp-aligned BTC hold using the same quote currency, starting capital and modeled costs.
- Manual paper holdings valued with public Kraken quotes, plus CSV export. These are not exchange account balances. Different quote currencies are not summed.
- A BYOK assistant and four read-only background workers: research, backtest, risk and reviewer. Supported provider configurations: OpenAI, Anthropic, Mistral, Gemini's compatible endpoint, DeepSeek, OpenRouter and local Ollama. You choose the provider and model; provider charges may apply.
- Password login, optional authenticator TOTP, dark and light themes, in-app feedback and optional usage counters (off by default).

The assistant is instructed to return neutral data rather than recommendations. Model prose remains untrusted. Code limits its tools to public data, backtests and paper holdings; a prompt is not a security boundary.

## Install

Prerequisites: Docker Engine or Docker Desktop running with Docker Compose v2, Internet access and a free local port 8080. Windows requires Linux containers. No Git checkout, Node installation or registry login is needed. Images are published for **linux/amd64 and linux/arm64**.

**Read the script first**: [shell installer](install.sh) or [PowerShell installer](install.ps1). These commands download and execute code; review it before running. The installer downloads the versioned Compose file into `$HOME/.cryptotools`, pulls `ghcr.io/easyicetrusty/cryptotools:latest` and starts it.

Linux or macOS (Docker must be usable by your account):

```sh
curl -fsSL https://raw.githubusercontent.com/easyicetrusty/cryptotools/main/install.sh | sh
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/easyicetrusty/cryptotools/main/install.ps1 | iex
```

Open http://127.0.0.1:8080 on the Docker host. Create a password of at least 12 characters and complete onboarding. No AI key is needed for the test bench or paper portfolio. The installer opens a browser when possible; set `OPEN_BROWSER=0` (shell) or download the PowerShell script and use `-NoBrowser` to disable that.

### Update and stop

Updates pull the image and recreate both services, retaining the `cryptotools_app-data` and `cryptotools_feedback-data` named volumes. Back up both volumes before updating. There is no automatic updater or database recovery UI.

```sh
curl -fsSL https://raw.githubusercontent.com/easyicetrusty/cryptotools/main/install.sh | sh -s -- update
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/easyicetrusty/cryptotools/main/install.ps1))) -Update
```

The app binds to loopback. It is not approved for public hosting. Stop without deleting your data:

```sh
docker compose -f "$HOME/.cryptotools/compose.yaml" down
```

PowerShell: `docker compose -f "$HOME/.cryptotools/compose.yaml" down`. Never use `down -v` unless you deliberately want to delete the data volumes.

### Manual Docker Compose alternative

Download and review [compose.yaml](compose.yaml), then run from its directory:

```sh
docker compose pull && docker compose up -d --wait --wait-timeout 180
```

To pin a release instead of `latest`, set `CRYPTOTOOLS_IMAGE=ghcr.io/easyicetrusty/cryptotools:0.3.0` (PowerShell: `$env:CRYPTOTOOLS_IMAGE = 'ghcr.io/easyicetrusty/cryptotools:0.3.0'`). `APP_PORT` overrides port 8080 and `CRYPTOTOOLS_DIR` overrides the install directory. Repeat any overrides when updating or stopping. The Compose project name and volume names stay `cryptotools`; changing the install directory does not create a separate instance.

## Where data goes

Your database, cached candles, paper holdings, backtest/job records and saved settings stay in Docker volumes on your machine by default. Individual assistant replies are kept in the browser page state, not saved as chat history. The feedback service has its own local volume in this Compose configuration.

There are important exceptions:

- Public prices and candles are fetched from exchanges over the Internet.
- If you enable a hosted AI provider, prompts and requested tool data, including paper holdings, go to that provider. Its terms and retention rules apply. Local Ollama avoids a hosted AI provider but requires a reachable model service and explicit endpoint configuration. Inside Docker, `127.0.0.1` refers to the container, not your host.
- Feedback sends version, screen and what you type to the configured feedback service. The default is local. An overridden `FEEDBACK_URL` can be remote. Never paste private material; the free-text filter is incomplete.
- Optional usage counters send only allowlisted names and counts to the configured feedback service. Opting out stops new counts, not deletion of existing counts.

Provider keys and TOTP secrets are encrypted at rest. The default randomly generated master key is stored alongside the database in the app volume. Someone who can read both can decrypt them. Back up both together; losing the master key loses access to saved keys. This is not hardware isolation. Authentication recovery and TOTP disable/reset UI are not implemented; retain your authenticator before enabling 2FA. See [SECURITY.md](SECURITY.md).

## Screenshots

Captured on 7 October 2026. Bench screenshots use 365 public Kraken BTC/USDT daily candles from 7 October 2025 to 7 October 2026 (exclusive), SMA 5/20, 10 bps fees and 5 bps slippage per fill. They show one historical test, not a strategy recommendation. Portfolio quantities and costs are paper inputs; displayed quotes are public Kraken prices at the timestamp shown. Details: [docs/screenshots/README.md](docs/screenshots/README.md) and [PROVENANCE.md](PROVENANCE.md).

![Dark desktop bench with public data provenance](docs/screenshots/night-bench-1440.png)

![Light mobile bench with public data provenance](docs/screenshots/clear-bench-390.png)

![Paper portfolio with timestamped public Kraken quotes](docs/screenshots/night-portfolio-1440.png)

## Development and test status

Node 22 is required for the built-in SQLite API. From a fresh checkout:

```sh
npm ci && npm test
```

`npm test` builds TypeScript and the frontend before running unit tests. The prepared revision passed 21 unit tests and a linux/amd64 Docker build in a Linux VM. Previous focused browser checks covered both themes at 390 and 1440 pixels, real public candles and mocked provider protocols.

**Native Windows and macOS installation are not yet verified.** PowerShell-on-Linux testing is not Windows testing. The arm64 release is checked under QEMU on Linux, not on native ARM hardware. Real hosted AI credentials have not been validated; provider support describes implemented configurations, not a compatibility guarantee.

Browser integration scripts in `tests/` require disposable databases and the fixture services they name. Synthetic candles and fake provider credentials are test fixtures, not public market data or usable API keys. Unknown historical candle provenance is labelled synthetic conservatively. See [PROVENANCE.md](PROVENANCE.md).

Feedback: use the in-app button or [GitHub issues](https://github.com/easyicetrusty/cryptotools/issues). For vulnerabilities, use private reporting rather than an issue.
