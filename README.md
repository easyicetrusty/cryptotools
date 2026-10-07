# Crypto tools · 0.2.0 paper prototype

Local single-user research, never order execution.

## Run

Docker Engine/Desktop and Compose v2 are prerequisites. Windows uses Linux containers.

```sh
CRYPTOTOOLS_IMAGE=cryptotools:0.2.0-amd64 LOCAL_IMAGE=1 OPEN_BROWSER=0 ./install.sh
```

```powershell
./install.ps1 -Image cryptotools:0.2.0-amd64 -LocalImage -NoBrowser
```

Open http://127.0.0.1:8080 on the Docker host. Set a 12+ character password and complete the three onboarding steps. Health is public; bootstrap state/setup/login necessarily precede a session. All other /api routes require a session. Optional TOTP is in Settings. Login sessions expire after eight hours. Logout revokes the current session. Browser theme is remembered locally.

The app and internal feedback service use separate named volumes. Containers are nonroot, have read-only roots, drop capabilities, and bind the app to loopback. `docker compose down` stops them without removing data. Never use `down -v` for an update.

## Data and security boundary

- ccxt spot adapters: Kraken, OKX, Bybit. A transport guard allows only GET requests to audited public market paths. No exchange keys or application order routes.
- Strategy signals use closed candles; fills use the next open. Full equity, long-only, fractional units. Fees and adverse slippage per fill. Hold uses the same symbol/capital/costs; it is a BTC benchmark when BTC is selected.
- SMA crossover, 7-day weekly trend on daily candles, Wilder RSI reversion, hold. Final open positions are marked at the last close, not forcibly sold. Completed trades and open positions are separate. Undefined profit factor is represented as null.
- Partial exchange coverage is explicitly shown. Internal candle gaps reject a test. Public endpoints can be unavailable or rate-limited. Quote currencies are not converted or summed.
- Paper holdings are manual and value against live public Kraken prices. CSV includes quote-currency P&L. This is not an exchange balance.
- Provider API keys are AES-256-GCM ciphertext in SQLite. The encryption key is SHA256-derived from `MASTER_SECRET` (at least 32 bytes; use random material), or a random persistent 32-byte file at `MASTER_SECRET_FILE` (default `/data/master.secret`, mode 0600). Back up the master file together with the database; losing it loses key access. Someone with both volume files can decrypt keys. This is at-rest protection, not hardware isolation.
- Passwords are salted scrypt hashes. TOTP setup is deliberately shown once for enrollment; it is not an AI API key. TOTP secrets are encrypted. Recovery, password reset and TOTP disable UI are deferred. Do not enable 2FA without retaining your authenticator.
- Provider choices: OpenAI, DeepSeek, Mistral, OpenRouter (including free models), Gemini compatible endpoint, Ollama, native Anthropic. Configure the model ID explicitly. Endpoint overrides are owner-configured; local plain HTTP is for model/mock services only. No real hosted provider keys have been tested.
- An AI request sends its prompt and any requested tool data (including paper holdings) to the chosen provider. It never automatically sends them to feedback. Read-only tools: tickers, OHLCV, run_backtest, get_portfolio. Unknown tools fail closed.
- Jobs split a goal into four ordered workers: research, backtest, risk, reviewer. Each has a provider/model. Reviewer defaults to Anthropic while the others default to OpenAI. Reviewer must differ from the research provider. Configure all selected providers before starting. Prior worker context sent to the next model is bounded to the last 3,000 characters; full results remain stored. Jobs/worker results persist in SQLite. On restart queued/running jobs and workers become explicitly interrupted; retry is a new deliberate job, not an automatic rerun.
- Feedback submits only version, screen and user-entered comment. Strict schemas reject extra fields and known secret-like strings, but free-text regex is not a comprehensive secret scrubber. Never paste private material.
- Optional usage counters are off by default. Only allowlisted screen/feature names and counts are stored/sent. Opting out stops new counts; existing counts are not automatically erased.
- This remains a localhost prototype, not a public hosting security approval. No HTTPS proxy/trusted-proxy configuration, recovery UI, migrations/backups, invite service, crash reporting or production abuse controls have been validated. Use `SECURE_COOKIE=1` only behind a correctly configured HTTPS deployment after review.

## Reproduce tests in Linux test VM

Node 22 runs in Docker; the host's Node 20 is used only for Playwright tooling.

```sh
sudo -n docker run --rm --network host -u 1000:1000 -v "$PWD:/app" -w /app node:22-bookworm-slim sh -c 'npm run build && npm test'
sudo -n docker build -t cryptotools:0.2.0-amd64 .
```

`tests/seed.mjs` seeds deterministic candles into the disposable `test-data` database, never into the installation's volume. `tests/step3-browser.mjs` expects the mock server on 9090, app/feedback test containers on 8080/8081, and a fresh fixture DB. It checks full browser flow, genuine public portfolio quotes, mock-compatible/Anthropic tools, restart interruption, both themes/widths and TOTP. It deliberately creates synthetic credentials and never prints them. `tests/public.mjs` checks three genuine public candle feeds and disables network on the second fetch to prove SQLite reuse. `tests/local-model.mjs` expects a separate app on 8083 and local Ollama on 11434.

For container test topology, use `--network host -e HOST=127.0.0.1` only in Linux test VM. Standard installation uses Compose instead; its published app port is explicitly `127.0.0.1:8080`, and feedback is internal.

## Multi-arch local build

```sh
sudo -n docker buildx build --builder cryptotools-builder --platform linux/amd64,linux/arm64 --output type=oci,dest=cryptotools-step3-multiarch.tar --metadata-file evidence-step3/multiarch-metadata.json .
sudo -n docker buildx build --builder cryptotools-builder --platform linux/arm64 -t cryptotools:0.2.0-arm64 --load .
```

Use the architecture-appropriate local tag with either installer. Native ARM, macOS, Windows, registry distribution and public beta hosting are future gates. PowerShell-on-Linux is not Windows testing. Do not publish images or use live money from this prototype.
