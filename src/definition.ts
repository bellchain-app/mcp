/**
 * Chains im Chain-Format als Eingabe der Werkzeuge create_chain, update_chain und replay_definition (Doku:
 * developers/chain-format). Das Schema beschreibt dem Assistenten die Form; geprüft wird bei Bellchain wie beim
 * Import, und was hier nicht auffällt, meldet die API mit Stelle und Code. Unbekannte Felder gehen deshalb mit zur API
 * (`looseObject`), statt still zu verschwinden. Positionen auf dem Board darf der Assistent weglassen, denn er sieht
 * sie nicht; geheime Einstellungen bleiben leer.
 */
import * as z from 'zod/v4';
import { CHAIN_PATTERNS, MAX_PAIRS, NODE_CATEGORIES } from './values.ts';

export const nodeType = z.string().regex(new RegExp(CHAIN_PATTERNS.nodeType)).describe('Node type such as "core.rsi", from list_nodes.');

export const nodeCategory = z
  .enum(NODE_CATEGORIES)
  .describe('src sources (candles, schedule), ind indicators, cond conditions, logic logic and timing, data message templates, act actions (push, email, Telegram, webhooks …), tool helpers.');

const pinRef = z.string().regex(new RegExp(CHAIN_PATTERNS.pinRef));

export const definition = z
  .looseObject({
    name: z.string().min(1).max(120).describe('Name of the chain; messages show it as {{kette}}.'),
    version: z.literal(1).optional(),
    description: z.string().max(2000).optional(),
    pauseAfterAlert: z.boolean().optional().describe('Pause the chain after its first alert.'),
    scanner: z
      .looseObject({
        node: z.string().regex(new RegExp(CHAIN_PATTERNS.nodeId)),
        pairs: z.array(z.string().max(26)).min(1).max(MAX_PAIRS).optional(),
        top: z.object({ count: z.number().int().min(1).max(MAX_PAIRS), quote: z.string().max(10) }).optional(),
      })
      .optional()
      .describe('Scanner: the candle "node" runs once per coin, for a list (pairs, such as ["ETH/USDT"]) or the top N by volume (top: {"count": 20, "quote": "USDT"}).'),
    nodes: z
      .array(
        z.looseObject({
          id: z.string().regex(new RegExp(CHAIN_PATTERNS.nodeId)).describe('Unique in the chain, starts with a letter, no dot, such as c1 or rsi1.'),
          type: nodeType,
          settings: z
            .record(z.string().regex(new RegExp(CHAIN_PATTERNS.setting)), z.union([z.number(), z.string(), z.boolean()]))
            .optional()
            .describe('Settings by name; missing ones take their default (get_node).'),
          position: z.object({ x: z.number(), y: z.number() }).optional().describe('Place on the board; leave it out and Bellchain arranges the nodes.'),
        }),
      )
      .max(200),
    edges: z
      .array(z.object({ from: pinRef.describe('Output pin as node.pin, such as c1.close.'), to: pinRef.describe('Input pin as node.pin, such as r1.in.') }))
      .max(1000)
      .describe('Connections from an output to an input of the same pin type; each input takes one. Growing inputs such as AND are in0, in1 …'),
    customNodes: z.array(z.record(z.string(), z.unknown())).max(20).optional().describe('Own nodes with formulas, as in the chain format docs.'),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .describe(
    'A chain in the Bellchain chain format (https://docs.bellchain.app/en/developers/chain-format/): nodes with id, type and settings, edges from output to input pins. Actions such as core.telegram fire when their input turns true at a candle close.',
  );

/** Gleicher Name trotz anderer Unicode-Schreibweise oder Leerzeichen am Rand. */
export function sameName(stored: unknown, given: string): boolean {
  return typeof stored === 'string' && stored.normalize('NFC').trim() === given.normalize('NFC').trim();
}
