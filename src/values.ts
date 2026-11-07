/**
 * Feste Werte des MCP-Servers, ohne Abhängigkeiten: Version und die Auswahlen, die die API kennt. Die Pakete von
 * Bellchain sind privat, deshalb Kopien; apps/web/test/mcp-values.test.ts vergleicht sie mit node-spec und dem Dialog
 * „Preisalarm“, packages/mcp/test die Version mit package.json.
 */

export const VERSION = '1.4.1';

/** Zeiteinheiten der Kerzen, wie `TIMEFRAMES` in node-spec. */
export const TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'] as const;

/** Preisalarm wie im Dialog: steigt über, fällt unter, steigt um %, fällt um %. */
export const PRICE_ALERT_KINDS = ['above', 'below', 'rise', 'fall'] as const;
export const PRICE_ALERT_WINDOWS = ['1m', '5m', '15m', '1h', '4h', '24h'] as const;
export const PRICE_ALERT_CHANNELS = ['telegram', 'push', 'email'] as const;
/** Weitere Bedingungen wie im Dialog (Satz-Baukasten): wovon die Rede ist, Vergleich, Linie, Kerzen; höchstens vier zusammen. */
export const CONDITION_SUBJECTS = ['price', 'ema9', 'ema20', 'ema50', 'ema100', 'ema200', 'sma20', 'sma50', 'sma100', 'sma200', 'rsi7', 'rsi14', 'rsi21', 'stoch', 'macd', 'volume'] as const;
export const CONDITION_OPERATORS = ['below', 'above', 'crossesAbove', 'crossesBelow'] as const;
export const CONDITION_TARGETS = ['price', 'ema9', 'ema20', 'ema50', 'ema100', 'ema200', 'sma20', 'sma50', 'sma100', 'sma200', 'bbUpper', 'bbMiddle', 'bbLower', 'signal', 'zero'] as const;
export const CONDITION_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
export const MAX_CONDITIONS = 4;

/** Höchstens so viele Coins hat ein Scanner (`MAX_SCANNER_PAIRS`). */
export const MAX_PAIRS = 100;
/** So weit reicht ein Replay höchstens (Trader und Community). */
export const MAX_REPLAY_DAYS = 365;

/** Kategorien der Bausteine wie in der Bausteinleiste, `CATEGORIES` in node-spec. */
export const NODE_CATEGORIES = ['src', 'ind', 'cond', 'logic', 'data', 'act', 'tool'] as const;

/** Muster aus dem JSON-Schema des Chain-Formats (`$defs` in chain-1.json): id und Typ eines Bausteins, Pin, Einstellung. */
export const CHAIN_PATTERNS = {
  nodeId: '^[A-Za-z][A-Za-z0-9_-]{0,31}$',
  nodeType: '^[a-z][a-z0-9-]*(\\.[a-z0-9][a-z0-9-]*)+(@[0-9]+(\\.[0-9]+){0,2})?$',
  pinRef: '^[A-Za-z][A-Za-z0-9_-]{0,31}\\.[a-z][A-Za-z0-9]{0,31}$',
  setting: '^[a-z][a-zA-Z0-9]{0,31}$',
} as const;

/**
 * Geheime Einstellungen je Baustein-Typ ohne Version, wie `CHAIN_SECRETS` in packages/db: Adressen von Webhook,
 * Discord, Slack, Teams und Google Chat, Header-Wert des Webhooks, User Key von Pushover, Thema und Token von ntfy,
 * Adresse und Code der Trading-Bots, Passwort für MQTT, Tokens für Matrix, Notion und Airtable, Skript-Adresse für Google Sheets. Der Server leert sie selbst, auch wenn eine ältere API sie noch mitschickt.
 */
export const SECRET_SETTINGS: Readonly<Record<string, readonly string[]>> = {
  'core.webhook': ['url', 'headerValue'],
  'core.discord': ['url'],
  'core.pushover': ['user'],
  'core.ntfy': ['topic', 'token'],
  'core.bot': ['url', 'token'],
  'core.slack': ['url'],
  'core.teams': ['url'],
  'core.googlechat': ['url'],
  'core.mqtt': ['password'],
  'core.matrix': ['token'],
  'core.notion': ['token'],
  'core.airtable': ['token'],
  'core.sheets': ['url'],
};
