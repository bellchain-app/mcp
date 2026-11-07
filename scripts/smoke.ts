/**
 * Startet den gebauten Server, wie ein Assistent es tut: über stdio, ohne Schlüssel. Er muss genau die Werkzeuge aus
 * mcpb/manifest.json nennen. Das prüfen auch Glama und der Katalog von Docker, bevor sie einen Server aufnehmen.
 *
 * Aufruf nach dem Bauen: pnpm --filter @bellchain-app/mcp smoke (startet dist/cli.js). Mit einem Befehl dahinter startet
 * es stattdessen diesen, im öffentlichen Repo etwa das Image: npm run smoke -- docker run --rm -i bellchain-mcp
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/client/stdio';

const root = fileURLToPath(new URL('..', import.meta.url));
const [command = process.execPath, ...args] = process.argv.length > 2 ? process.argv.slice(2) : [process.execPath, 'dist/cli.js'];
const manifest = JSON.parse(readFileSync(new URL('../mcpb/manifest.json', import.meta.url), 'utf8')) as { readonly tools: readonly { readonly name: string }[] };

// Nur die Umgebung, die das SDK Servern ohnehin mitgibt, also nie BELLCHAIN_API_KEY aus der eigenen Shell. Was der
// Server nach stderr schreibt (Version, fehlender Schlüssel, Fehler), steht im Protokoll.
const client = new Client({ name: 'bellchain-smoke', version: '0' });
await client.connect(new StdioClientTransport({ command, args, cwd: root, env: getDefaultEnvironment(), stderr: 'inherit' }));
const tools = (await client.listTools()).tools.map((tool) => tool.name);
await client.close();
const listed = manifest.tools.map((tool) => tool.name);
if (JSON.stringify(tools) !== JSON.stringify(listed)) throw new Error(`mcpb/manifest.json lists ${listed.join(', ')}; the server lists ${tools.join(', ')}.`);
console.log(`${[command, ...args].join(' ')}: starts without a key and lists ${tools.length} tools, as in mcpb/manifest.json.`);
