# Security

Please report vulnerabilities privately to [hello@bellchain.app](mailto:hello@bellchain.app), not in a public issue.

The server reads your API key from `BELLCHAIN_API_KEY` and sends it only to `https://api.bellchain.app/v1`, never to the assistant. Secret settings of chains, such as webhook addresses and bot codes, never reach the assistant. Details are in the [README](README.md#security).
