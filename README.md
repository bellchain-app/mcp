# Bellchain MCP server

Use your [Bellchain](https://bellchain.app) crypto alert chains from AI assistants such as Claude, Cursor, VS Code or Codex: ask about your chains and alerts in plain language, find out why an alert fired and how each alert did with its take-profit and stop-loss, test templates and price alerts in the replay, scored with take-profit and stop-loss (also in ATR, with TP levels and a trailing stop), and create, change, activate, pause or delete chains, also freely from building blocks, with your own Bellchain API key (Trader plan). Bellchain runs no AI of its own; your assistant does the thinking.

Full guide: [English](https://docs.bellchain.app/en/developers/mcp/) · [Deutsch](https://docs.bellchain.app/de/developers/mcp/)

## Setup

1. Create an API key in Bellchain under **Settings → API**. “Read only” is enough for questions and replays; “Read and change” lets the assistant create, change, activate, pause and delete chains.
2. In Claude Desktop, the easiest way is the extension: download [bellchain.mcpb](https://docs.bellchain.app/downloads/bellchain.mcpb), double-click it and enter the key; Claude keeps it in your system’s keychain. Other assistants start the server themselves, for example Claude Code:

   ```bash
   claude mcp add --scope user --env BELLCHAIN_API_KEY=bc_… --transport stdio bellchain -- npx -y @bellchain-app/mcp@1
   ```

   or in a JSON configuration (Claude Desktop, Cursor):

   ```json
   { "mcpServers": { "bellchain": { "command": "npx", "args": ["-y", "@bellchain-app/mcp@1"], "env": { "BELLCHAIN_API_KEY": "bc_…" } } } }
   ```

Needs Node.js 20 or later.

## Tools

`get_account`, `list_chains`, `get_chain`, `list_alerts`, `explain_alert`, `list_templates`, `get_template`, `get_price`, `list_nodes`, `get_node`, `replay_chain`, `replay_template`, `replay_price_alert`, `replay_definition` read only. `create_chain_from_template`, `create_price_alert` and `create_chain` (from building blocks in the chain format) create drafts; `update_chain`, `activate_chain`, `pause_chain` and `delete_chain` change chains and are marked as such, so assistants ask before calling them. Changes are saved as a new revision that an active chain picks up only with `activate_chain`; only paused chains and drafts can be deleted, after a check of their name.

## Agent Skill

[`skills/bellchain-crypto-alerts/SKILL.md`](skills/bellchain-crypto-alerts/SKILL.md) tells agents when Bellchain fits and how to work with it: templates and price alerts first, test in the replay before anything goes live, report results after fees as a look back, and ask before changing a chain. Without an API key it links to the free replay.

## Security

- The key is read from `BELLCHAIN_API_KEY` and sent only to `https://api.bellchain.app/v1` over HTTPS, never to the assistant.
- Secret settings of chains (webhook and chat addresses, tokens, bot codes) never reach the assistant and cannot be set through this server; changing a chain keeps them.
- Texts from chains, alerts and templates are returned as marked data so that assistants don’t follow instructions inside them.
- Logs go to stderr only; stdout carries the protocol.

`BELLCHAIN_API_URL` points the server at another Bellchain API, for tests only (HTTPS, or HTTP for localhost).

## Source

The code is on GitHub in [bellchain-app/mcp](https://github.com/bellchain-app/mcp), a copy of the server in Bellchain’s main repository that is updated with each release. In a clone:

```bash
npm ci
npm run typecheck && npm test
npm run build && npm run smoke
```

`npm run smoke` starts the built server without a key and checks that it lists all its tools. To run it in Docker instead of Node.js, with the key from your shell:

```bash
docker build -t bellchain-mcp .
docker run --rm -i -e BELLCHAIN_API_KEY bellchain-mcp
```

## Deutsch

Mit diesem Server nutzt du deine Chains und Alarme aus KI-Assistenten heraus, mit deinem eigenen API-Schlüssel (ab Trader). Einrichtung und Beispiele stehen in der [Doku](https://docs.bellchain.app/de/developers/mcp/).

## License

MIT
