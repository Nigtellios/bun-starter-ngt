const RuntimeConfig = {
    MODE: process.env.NODE_ENV || "development",
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
};

export default RuntimeConfig;