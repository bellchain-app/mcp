# Contributing

This repository is the public copy of the Bellchain MCP server. The code lives in Bellchain’s main repository and is copied here with each release, so the history here shows releases rather than single changes.

- **Bugs and ideas:** please open an issue. Questions about your account go to [hello@bellchain.app](mailto:hello@bellchain.app).
- **Pull requests** for small fixes are welcome. We carry them over into the main repository by hand, and the next release brings them back here.
- **Security:** see [SECURITY.md](SECURITY.md).

Before a pull request:

```bash
npm ci
npm run typecheck && npm test
npm run build && npm run smoke
```
