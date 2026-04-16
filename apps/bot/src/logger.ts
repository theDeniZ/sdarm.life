/**
 * Structured error logger.
 *
 * Cloudflare Workers have no filesystem, so errors are written to console
 * (captured by Cloudflare Logpush / Workers Tail). All entries are JSON for
 * easy filtering in the Cloudflare dashboard.
 */

interface LogEntry {
  level: 'error' | 'warn';
  context: string;
  message: string;
  stack?: string;
  ts: string;
  [key: string]: unknown;
}

function serialize(entry: LogEntry): string {
  try {
    return JSON.stringify(entry);
  } catch {
    return `{"level":"error","context":"logger","message":"Failed to serialize log entry","ts":"${new Date().toISOString()}"}`;
  }
}

export function logError(context: string, error: unknown, extra?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const entry: LogEntry = { level: 'error', context, message, stack, ts: new Date().toISOString(), ...extra };
  console.error(serialize(entry));
}

export function logWarn(context: string, message: string, extra?: Record<string, unknown>): void {
  const entry: LogEntry = { level: 'warn', context, message, ts: new Date().toISOString(), ...extra };
  console.warn(serialize(entry));
}
