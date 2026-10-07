# cryptotools 0.1.0

Deployment-first public-data skeleton. Not a trading product yet.

## Requirements
Docker Engine/Desktop with Compose v2 and a local or published image tag. Use a maintained Docker release for real tester distribution. This prototype was tested only inside Linux test VM Linux, with ARM emulation; Windows/macOS host verification is deferred.

## Local image installation
Linux/macOS, in this folder:

```sh
CRYPTOTOOLS_IMAGE=cryptotools:0.1.0-amd64 LOCAL_IMAGE=1 ./install.sh
```

PowerShell (tested with PowerShell 7 on Linux, not Windows):

```powershell
./install.ps1 -Image cryptotools:0.1.0-amd64 -LocalImage
```

For a future registry image, omit LOCAL_IMAGE / -LocalImage. No registry image exists yet. Scripts pull in that mode and use Compose health gates before opening `http://127.0.0.1:8080`. OPEN_BROWSER=0 / -NoBrowser supports headless use. APP_PORT changes the host port. Do not delete volumes during updates.

## Build in Linux test VM only

```sh
sudo docker buildx build --builder cryptotools-builder --platform linux/amd64,linux/arm64 --provenance=false --output type=oci,dest=cryptotools-multiarch.tar -t cryptotools:0.1.0 .
sudo docker buildx build --builder cryptotools-builder --platform linux/amd64 --load -t cryptotools:0.1.0-amd64 .
sudo docker buildx build --builder cryptotools-builder --platform linux/arm64 --load -t cryptotools:0.1.0-arm64 .
```

The native build stage compiles TypeScript and runs policy tests. Runtime dependencies are installed per target architecture. No push flags are used.

## Architecture
Node 22 + Fastify + ccxt, React/Vite static shell, and two service entrypoints in the same image. `dist/server.js` is headless and exposes GET /health, GET /api/tickers and POST /api/feedback. The app serves the bundled UI. `dist/feedback.js` exposes health and POST /feedback, with no feedback-list route.

The app database `/data/app.sqlite` stores ticker observations; the separate feedback service database `/data/feedback.sqlite` stores comments. Different Docker volumes. SQLite WAL/SHM sidecars may exist while running. SQLite is experimental in Node 22. Nonroot runtime, read-only root filesystem, all capabilities dropped, no-new-privileges, writable data volume and temporary /tmp.

All runtime configuration is through environment variables: HOST, PORT, DATA_FILE, EXCHANGES (only kraken/okx adapters), FEEDBACK_URL. Compose provides defaults; FEEDBACK_URL points to the separate service and can be overridden. Feedback remains server-to-server to avoid sending account state or requiring browser CORS. Host publishing is 127.0.0.1 only; feedback is internal-only.

The ccxt network guard admits GET only to Kraken /0/public/* and OKX /api/v5/public/* or /api/v5/market/*. No API keys or account API are supported. Actual successful requests are logged for boundary audit. Do not broaden this guard to add order access.

Feedback payloads contain only comment (1–2000 chars), version and enumerated screen; extra fields are rejected. Both app and feedback service validate payloads. Known credential/balance-shaped comment text is rejected, but this is not a complete secret detector. Users must never paste sensitive material into free text. Feedback has no authentication, rate limiting, retention management or TLS deployment yet; do not publish it as-is.

## Tests and mockups
`tests/browser.mjs` exercises every shell screen at 390/1440, real feedback writes, payload shape, invalid fields and unsupported routes. `tests/render.mjs` renders all static mockups with Linux test VM Chromium, checks banners/providers/workers/overflow/errors/external requests and creates contact sheets.

```sh
node tests/browser.mjs
python3 mockups/generate.py
node tests/render.mjs
```

Browser testing uses an existing Linux test VM Chromium and playwright-core. Production TypeScript build/test uses Node 22 inside Docker. Clear desk: light green/sidebar. Night shift: dark blue/top navigation/monospaced metrics. Paper ledger: cream/serif/ruled sections. Four screens each, entirely sample/static, no provider calls. Mobile holdings use stacked labelled records.

## Stop without deleting data

```sh
sudo docker compose down
sudo docker rm -f cryptotools-arm-smoke  # only when that optional smoke container exists
sudo docker buildx stop cryptotools-builder
```

Preserve app-data and feedback-data volumes. Not implemented: actual portfolio import/CSV, backtests, AI or workers, credential storage, orders/testnet/paper engine, login/2FA, recovery/alerts, invites/surveys/telemetry/crash reporting, backup/restore UI, automated image updates, public distribution. Those are later stages, not hidden capabilities of the UI mockups.
