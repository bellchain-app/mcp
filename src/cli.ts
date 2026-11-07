#!/usr/bin/env node
/**
 * Startet den MCP-Server über stdio, so wie Assistenten ihn per `npx -y @bellchain-app/mcp` aufrufen. Der Schlüssel
 * kommt aus `BELLCHAIN_API_KEY`, die Adresse der Schnittstelle aus `BELLCHAIN_API_URL` (nur für Tests). Auf stdout
 * stehen nur Nachrichten des Protokolls; alles für Menschen geht nach stderr, landet also im Protokoll des Assistenten.
 * Fehlt der Schlüssel, startet der Server trotzdem: Jedes Werkzeug sagt dann, wie man ihn einträgt.
 */
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { BellchainApi, apiUrlFrom, keyProblem } from './api.ts';
import { createServer } from './server.ts';
import { VERSION } from './values.ts';

let baseUrl: string;
try {
  baseUrl = apiUrlFrom(process.env['BELLCHAIN_API_URL']);
} catch (error) {
  console.error(`bellchain-mcp: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const apiKey = process.env['BELLCHAIN_API_KEY']?.trim();
const problem = keyProblem(apiKey);
if (problem) console.error(`bellchain-mcp: ${problem}`);

const api = new BellchainApi({ baseUrl, apiKey });
const handle = serveStdio(() => createServer(api), {
  onerror: (error) => console.error(`bellchain-mcp: ${error.message}`),
});
console.error(`bellchain-mcp ${VERSION} on stdio, API ${baseUrl}`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void handle.close().finally(() => process.exit(0));
  });
}
