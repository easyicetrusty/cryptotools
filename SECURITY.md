# Security

## Report a vulnerability privately

Use GitHub private vulnerability reporting:

https://github.com/easyicetrusty/cryptotools/security/advisories/new

On the repository's Security page, choose **Report a vulnerability**. While the repository is private, this feature may be unavailable; do not publish a vulnerability as a workaround. Wait for private reporting to be available or contact the maintainer privately through an existing trusted channel.

Include the affected revision, a description, minimal reproduction steps and impact. Use synthetic data. Never include API keys, passwords, authenticator secrets, database files or master-key files. There is no promised response time or bug bounty.

## Prototype boundary

This beta is for local paper research, not live trading or public hosting. Do not expose its app or feedback ports to the Internet. Use reviewed source and maintained Docker releases. Provider endpoints and feedback destinations are user-configured; check where they point before sending anything.

Saved provider keys and TOTP secrets use AES-256-GCM encryption. The default random master key and database are both in the local app volume. A reader of both can decrypt them. Passwords use salted scrypt hashes. Neither encryption nor login substitutes for protecting the host and backups.

Optional TOTP lacks recovery and disable/reset UI. Losing an authenticator can lock you out. Hosted AI sends prompts and requested tool data to the selected provider. Model text is untrusted. Feedback text filtering cannot reliably scrub every secret.

Only the current prepared beta revision is the maintenance target. Production hosting, security hardening, recovery and native-platform validation remain unfinished. This file is not a claim of a completed security review.
