/**
 * Das Manifest der Desktop-Erweiterung für Claude Desktop (mcpb/manifest.json): gültig nach dem Schema 0.3 aus
 * `@anthropic-ai/mcpb`, dieselbe Version wie package.json, genau die Werkzeuge des Servers, der Schlüssel als
 * vertrauliche Pflichteinstellung. Bauen und packen prüft scripts/mcpb.ts mit dem CLI.
 */
import { readFileSync } from 'node:fs';
import { McpbManifestSchema } from '@anthropic-ai/mcpb/schemas/0.3';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { describe, expect, it } from 'vitest';
import { BellchainApi } from '../src/api.ts';
import { createServer } from '../src/server.ts';

const manifest = JSON.parse(readFileSync(new URL('../mcpb/manifest.json', import.meta.url), 'utf8')) as {
  version: string;
  tools: { name: string; description?: string }[];
  server: { mcp_config: { args: string[]; env: Record<string, string> } };
  user_config: Record<string, { sensitive?: boolean; required?: boolean }>;
};

describe('Desktop-Erweiterung', () => {
  it('ist ein gültiges Manifest 0.3 mit der Version aus package.json', () => {
    const result = McpbManifestSchema.safeParse(manifest);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
    expect(manifest.version).toBe(pkg.version);
  });

  it('nennt genau die Werkzeuge des Servers, jedes mit einem Satz', async () => {
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await createServer(new BellchainApi({ baseUrl: 'https://api.test/v1', apiKey: undefined })).connect(serverSide);
    const client = new Client({ name: 'test', version: '0' });
    await client.connect(clientSide);
    const { tools } = await client.listTools();
    await client.close();
    expect(manifest.tools.map((tool) => tool.name)).toEqual(tools.map((tool) => tool.name));
    for (const tool of manifest.tools) expect(tool.description, tool.name).toMatch(/^[A-Z].{8,80}$/);
  });

  it('der Schlüssel ist eine vertrauliche Pflichteinstellung und geht nur in BELLCHAIN_API_KEY', () => {
    expect(manifest.user_config).toEqual({ api_key: expect.objectContaining({ type: 'string', sensitive: true, required: true }) });
    expect(manifest.server.mcp_config.env).toEqual({ BELLCHAIN_API_KEY: '${user_config.api_key}' });
    expect(manifest.server.mcp_config.args).toEqual(['${__dirname}/server/index.mjs']);
    // Keine Börsennamen in Texten, die Kunden sehen.
    expect(JSON.stringify(manifest)).not.toMatch(/binance|bitstamp|bitvavo|bybit|coinbase|kraken|okx/i);
  });
});
