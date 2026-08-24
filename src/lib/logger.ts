type LogLevel = "info" | "warn" | "error";

export const logger = {
  log: (level: LogLevel, event: string, payload?: Record<string, unknown>) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...payload,
    };
    
    // In a real production app this could be piped to Datadog/Axiom/etc.
    // For now, we emit structured JSON to stdout.
    if (level === "error") {
      console.error(JSON.stringify(logEntry));
    } else if (level === "warn") {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  },
  
  info: (event: string, payload?: Record<string, unknown>) => logger.log("info", event, payload),
  warn: (event: string, payload?: Record<string, unknown>) => logger.log("warn", event, payload),
  error: (event: string, payload?: Record<string, unknown>) => logger.log("error", event, payload),
};
