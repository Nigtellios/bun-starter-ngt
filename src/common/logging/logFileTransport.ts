import type { Writable } from "node:stream";
import { createLogDestination } from "./logFileWriter.ts";

export type LogFileTransportOptions = {
  rootDir: string;
  maxLines: number;
  sessionPrefix: string;
};

/**
 * Pino transports run in their own worker thread/process. Exporting a default async
 * factory keeps the API compatible with both ESM and CJS execution environments.
 * @param options
 * @returns
 */
export default async function logFileTransport(options: LogFileTransportOptions): Promise<Writable> {
  return createLogDestination(options);
}
