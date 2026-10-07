# v0.7.4 security changes (unreleased candidate)

## Text leaving the installation

Feedback and each outgoing AI request are refused when text contains an app-held secret or a common secret pattern. The comparison includes every provider key, all exchange keys/secrets/passphrases, DefiLlama Pro keys, Telegram tokens, SMTP passwords, pending/enabled TOTP secrets and master material (text, hex and base64 representations, plus the derived encryption key). Decryption happens only in the synchronous comparison, without a plaintext cache, log or export. Broken ciphertext fails closed.

The UI says “Remove sensitive information. Nothing was sent.” No silent redaction or resend occurs. Gemini AIza, sk-/sk-ant-, conservative 32-character Mistral-shaped strings, Telegram tokens, JWTs and PEM markers are a second net. This is not a guarantee about unknown secrets, transformed/fragmented secrets or personal data. Do not paste private material.

AI prompts/job goals are checked immediately; the complete model request (including tool results and user-selected model names) is checked before every send. Provider credentials in authentication headers and configured destination credentials are intentional authentication, not feedback text. Notification content is a fixed event allowlist, with user-entered destination fields checked separately. Telemetry accepts only fixed counter names/counts. There is no crash-report sender; arbitrary exception messages remain suppressed.

## Outbound address policy

SMTP and custom AI destinations resolve anew for each connection. All returned addresses must satisfy the policy; the socket connects to the checked literal IP, retaining the original SMTP/HTTPS TLS server name and certificate verification. This prevents a second DNS lookup from bypassing the check. Redirects are not followed. Default refusal covers loopback, RFC1918, link-local/metadata, CGNAT, mapped/private IPv6 and other reserved ranges. Custom AI requires public HTTPS.

**Allow local/private SMTP server** is off by default. Its warning explicitly permits access to the internal network on SMTP ports 465/587 for a trusted self-hosted relay. TLS/certificate verification remain mandatory. Sandbox disables this override, including previously saved overrides at delivery time.

**Allow loopback Ollama endpoint** is separate, off by default, only for provider `ollama`, and unavailable in sandbox. It permits HTTP only to loopback; private-LAN addresses and arbitrary local custom providers remain denied. Existing local/custom configurations may need to be changed on upgrade.

In normal Docker Compose, `127.0.0.1` means the app container. For self-hosted Ollama, share the app container's network namespace with a separate Ollama service (`network_mode: service:app` for the Ollama service, with Ollama listening on 127.0.0.1:11434). Keep Ollama's port unpublished and retain the app's loopback-only port binding. Configure the Ollama endpoint `http://127.0.0.1:11434/v1` and explicitly enable the loopback setting. This is a deployment example, not native-platform validation; bring your own reviewed Ollama image/model and resource limits. Do not expose either service publicly.

FEEDBACK_URL defaults to the fixed companion URL http://feedback:8081/feedback on the Docker private network. Only that exact service is exempted for private HTTP. Custom overrides require public HTTPS and are resolved/pinned per request for both feedback and telemetry. Private overrides fail before any connection. Provider/data endpoints and Telegram's origin are otherwise fixed or checked. Protect operator environment configuration.

## Refusals and sessions

Typed known refusals (sandbox, tools, permissions, sensitive text and outbound-address policy) reach the UI. Unknown upstream errors keep the generic message so vendor responses cannot leak credentials. No arbitrary exception text is shown.

Sessions are random bearer tokens stored only as hashes. The server enforces 30 minutes idle and 8 hours absolute lifetime; each accepted authenticated request refreshes only the idle timestamp. Background browser polling can keep a session active but never past 8 hours. Timestamps persist across restart. Logout deletes the server-side session. Enabling TOTP invalidates every old session and issues a new one for the confirming browser. The migration invalidates old sessions without touching data. The cookie remains HttpOnly/SameSite=Strict and needs SECURE_COOKIE=1 behind reviewed HTTPS hosting.

## Installers

Release assets contain install.sh/install.ps1 with a pinned multi-architecture image digest, matching compose.yaml, image-reference.txt and SHA256SUMS. Scripts verify assets and retain the pin in .env; update resolves the newest published release, including beta releases, and uses its digest. Source templates fail closed. Manual Compose use can still use :latest deliberately. Checksums do not authenticate a compromised publisher; review provenance and release source. Publication must follow independent review of the untagged candidate, not precede it.

The local paper-beta boundaries, at-rest encryption limitations, data-access obligations and native-platform validation limits still apply. See ../SECURITY.md for private reporting.
