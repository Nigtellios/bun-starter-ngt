import RuntimeConfig from "config/runtimeConfig.ts";
import pino from "pino";

const logger = pino({
  level: RuntimeConfig.LOG_LEVEL,
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:HH:mm:ss | dd.mm.yyyy",
    },
  },
});

logger.info(`Logger initialized at ${RuntimeConfig.LOG_LEVEL} level`);

export default logger;
