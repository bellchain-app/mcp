# Installing the Bellchain MCP server

For AI assistants such as Cline that set up MCP servers for their user. Nothing needs to be cloned or built: the server runs from npm.

1. Ask the user for a Bellchain API key. They create it in the Bellchain app under **Settings → API**; the API comes with the Trader plan. “Read only” is enough for questions and replays; “Read and change” also lets you create, change, activate, pause and delete chains. Never make up a key and never repeat it back in the chat.
2. Check that Node.js 20 or later is installed: `node --version`.
3. Add the server to the MCP settings, with the user’s key in place of `bc_…`:

   ```json
   {
     "mcpServers": {
       "bellchain": {
         "command": "npx",
         "args": ["-y", "@bellchain-app/mcp@1"],
         "env": { "BELLCHAIN_API_KEY": "bc_…" }
       }
     }
   }
   ```

4. Test it with the tool `get_account`: it returns the plan and whether the key may change chains. Without a valid key, every tool answers with how to add one.

Before a tool creates, changes, activates, pauses or deletes a chain, tell the user what will happen and wait for their OK. Activating a chain sends real alerts. Full guide: <https://docs.bellchain.app/en/developers/mcp/>
