/**
 * Baut die Desktop-Erweiterung für Claude Desktop: `mcpb/build/bellchain.mcpb`, ein MCP Bundle (Manifest 0.3) mit
 * demselben Server wie das npm-Paket. Claude Desktop installiert sie per Doppelklick und fragt den API-Schlüssel ab;
 * als vertrauliche Einstellung (`sensitive`) liegt er dann im Schlüsselbund des Systems statt in einer JSON-Datei.
 *
 * Der Server wird mit esbuild zu einer Datei gebündelt: Claude bringt Node.js mit, node_modules braucht es nicht. Die
 * Lizenzen der gebündelten Pakete stehen daneben in THIRD-PARTY-LICENSES.txt. Bevor das CLI `mcpb` prüft (validate)
 * und packt (pack), startet der gebündelte Server einmal über stdio und muss genau die Werkzeuge des Manifests nennen.
 *
 * Aufruf: pnpm --filter @bellchain-app/mcp mcpb. Mit `--out <datei>` kommt eine Kopie dorthin; so legt der Build der
 * Doku die Erweiterung unter docs.bellchain.app/downloads/ ab (apps/docs/package.json).
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'mcpb/build');
const bundle = join(out, 'bundle');
const target = join(out, 'bellchain.mcpb');
const cli = join(root, 'node_modules/.bin/mcpb');

interface Manifest {
  readonly version: string;
  readonly tools: readonly { readonly name: string }[];
}

const manifest = JSON.parse(readFileSync(join(root, 'mcpb/manifest.json'), 'utf8')) as Manifest;
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { readonly version: string };
if (manifest.version !== pkg.version) throw new Error(`mcpb/manifest.json hat Version ${manifest.version}, package.json ${pkg.version}.`);

rmSync(out, { recursive: true, force: true });
mkdirSync(join(bundle, 'server'), { recursive: true });

const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/cli.ts'],
  outfile: join(bundle, 'server/index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  legalComments: 'none',
  metafile: true,
  logLevel: 'warning',
});

/** Die Pakete aus node_modules, die im Bündel stecken, mit Version, Lizenz und Lizenztext. */
function licenses(inputs: readonly string[]): string {
  const dirs = new Set<string>();
  for (const input of inputs) {
    const match = /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(input);
    if (match?.[1]) dirs.add(join(root, match[1]));
  }
  const sections = [...dirs].sort().map((dir) => {
    const info = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { name: string; version: string; license?: string };
    const texts = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'NOTICE', 'NOTICE.md'].filter((name) => existsSync(join(dir, name))).map((name) => readFileSync(join(dir, name), 'utf8').trim());
    return [`== ${info.name} ${info.version} (${info.license ?? 'see license text'}) ==`, ...texts].join('\n\n');
  });
  return `The Bellchain MCP server (MIT, see LICENSE) bundles these packages:\n\n${sections.join('\n\n\n')}\n`;
}

copyFileSync(join(root, 'mcpb/manifest.json'), join(bundle, 'manifest.json'));
// Im öffentlichen Repo bellchain-app/mcp liegt das Symbol neben dem Manifest, im Monorepo kommt es aus der App.
const icon = [join(root, 'mcpb/icon.png'), join(root, '../../apps/web/public/icons/icon-512.png')].find((file) => existsSync(file));
if (!icon) throw new Error('Symbol fehlt: mcpb/icon.png oder apps/web/public/icons/icon-512.png');
copyFileSync(icon, join(bundle, 'icon.png'));
copyFileSync(join(root, 'LICENSE'), join(bundle, 'LICENSE'));
writeFileSync(join(bundle, 'THIRD-PARTY-LICENSES.txt'), licenses(Object.keys(result.metafile.inputs)));

// Der gebündelte Server startet ohne Schlüssel und nennt trotzdem alle Werkzeuge, genau die aus dem Manifest.
const client = new Client({ name: 'bellchain-mcpb-build', version: pkg.version });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(bundle, 'server/index.mjs')], env: { PATH: process.env['PATH'] ?? '' }, stderr: 'ignore' }));
const tools = (await client.listTools()).tools.map((tool) => tool.name);
await client.close();
const listed = manifest.tools.map((tool) => tool.name);
if (JSON.stringify(tools) !== JSON.stringify(listed)) throw new Error(`Werkzeuge im Manifest: ${listed.join(', ')}; der Server nennt: ${tools.join(', ')}.`);
console.log(`Gebündelter Server startet, ${tools.length} Werkzeuge wie im Manifest.`);

execFileSync(cli, ['validate', join(bundle, 'manifest.json')], { stdio: 'inherit' });
execFileSync(cli, ['pack', bundle, target], { stdio: 'inherit' });
console.log(`\n${target}`);

const copy = process.argv.indexOf('--out');
if (copy > 0) {
  const path = resolve(process.argv[copy + 1] ?? '');
  mkdirSync(dirname(path), { recursive: true });
  copyFileSync(target, path);
  console.log(path);
}
