import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:HH:mm:ss | dd.mm.yyyy",
    },
  },
});

logger.info("Logger initialized...");

export default logger;
