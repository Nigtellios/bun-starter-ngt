import RuntimeConfig from "config/runtimeConfig.ts";
import pino from "pino";

const logFileTransportTarget = new URL("./logFileTransport.ts", import.meta.url).href;

const targets: pino.TransportTargetOptions[] = [
  {
    target: "pino-pretty",
    level: RuntimeConfig.LOG_LEVEL,
    options: {
      colorize: true,
      translateTime: "SYS:HH:mm:ss | dd.mm.yyyy",
    },
  },
];

if (RuntimeConfig.PRESERVE_LOGS) {
  targets.push({
    target: logFileTransportTarget,
    options: {
      rootDir: RuntimeConfig.LOG_DIRECTORY,
      maxLines: RuntimeConfig.LOG_MAX_LINES,
      sessionPrefix: RuntimeConfig.LOG_SESSION_PREFIX,
    },
    level: RuntimeConfig.LOG_LEVEL,
  });
}

const logger = pino({
  level: RuntimeConfig.LOG_LEVEL,
  transport: {
    targets,
  },
});

if (RuntimeConfig.PRESERVE_LOGS) {
  logger.info(
    `Logger initialized at ${RuntimeConfig.LOG_LEVEL} level (console + JSON files, ${RuntimeConfig.LOG_MAX_LINES} lines per file)`,
  );
} else {
  logger.info(`Logger initialized at ${RuntimeConfig.LOG_LEVEL} level (console only)`);
}

export default logger;
