# Contributing

Use the in-app feedback button or GitHub issues for bugs and feedback. Describe what you expected, what happened, your app revision, operating system and Docker version. Small reproduction steps with synthetic data are useful. Do not attach databases or credentials. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

For code work, discuss the change in an issue first, keep it focused, and run `npm ci && npm test` with Node 22 plus a Docker build. Browser tests need disposable fixture services; native Windows/macOS results are especially useful and should include the actual tested setup.

Keep the product data-only and paper-only. Do not add order execution, exchange credentials, financial recommendations or undisclosed remote data transfers. Clearly label synthetic data and fake test credentials.

Licence: contributions are accepted under the GNU Affero General Public License v3.0 (AGPL-3.0), the licence of this repository. See [LICENSE](LICENSE).
