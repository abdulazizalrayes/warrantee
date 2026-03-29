type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

function formatLog(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  };
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry = formatLog(level, message, context);
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const output = JSON.stringify(entry);
    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  } else {
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    const msg = `${prefix} ${message}`;
    switch (level) {
      case 'error':
        console.error(msg, context || '');
        break;
      case 'warn':
        console.warn(msg, context || '');
        break;
      case 'debug':
        console.log(msg, context || '');
        break;
      default:
        console.log(msg, context || '');
    }
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
};

export default logger;
