import { appendFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { Writable } from "node:stream";

type LogFileWriterOptions = {
  rootDir: string;
  maxLines: number;
  sessionPrefix?: string;
};

const LOG_FILE_BASENAME = "log";
const LOG_EXTENSION = ".jsonl";
const PART_PADDING = 3;
const SHUTDOWN_SIGNALS: Array<NodeJS.Signals | "beforeExit" | "exit"> = ["beforeExit", "exit", "SIGINT", "SIGTERM"];

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}${month}${day}`;
};

const formatTime = (date: Date) => {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");

  return `${hours}${minutes}${seconds}`;
};

const ensureTrailingNewline = (payload: string) => (payload.endsWith("\n") ? payload : `${payload}\n`);

class SessionLogWriter {
  private readonly rootDir: string;

  private readonly maxLines: number;

  private readonly sessionPrefix: string;

  private readonly pid = process.pid;

  private readonly startedAt = new Date();

  private sessionDir: string;

  private currentFilePath: string;

  private currentLineCount = 0;

  private partIndex = 1;

  private closed = false;

  private readonly shutdownHandler = () => {
    this.close();
  };

  constructor({ rootDir, maxLines, sessionPrefix = LOG_FILE_BASENAME }: LogFileWriterOptions) {
    this.rootDir = rootDir;
    this.maxLines = Math.max(maxLines, 1);
    this.sessionPrefix = sessionPrefix;

    mkdirSync(this.rootDir, { recursive: true });

    const runningTag = `running-${formatTime(this.startedAt)}-${formatDate(this.startedAt)}`;
    this.sessionDir = join(this.rootDir, `${this.sessionPrefix}-${this.pid}-${runningTag}`);
    mkdirSync(this.sessionDir, { recursive: true });

    this.currentFilePath = this.buildFilePath();

    this.installShutdownHooks();
  }

  write(chunk: string | Buffer) {
    if (this.closed) {
      return;
    }

    const content = ensureTrailingNewline(typeof chunk === "string" ? chunk : chunk.toString());

    appendFileSync(this.currentFilePath, content, "utf8");
    this.currentLineCount += 1;

    if (this.currentLineCount >= this.maxLines) {
      this.rotateLogFile();
    }
  }

  close() {
    if (this.closed) {
      return;
    }

    this.closed = true;

    this.removeShutdownHooks();

    const finishedAt = new Date();
    const finalDirName = `${this.sessionPrefix}-${this.pid}-${formatTime(finishedAt)}-${formatDate(finishedAt)}`;
    const finalDirPath = join(this.rootDir, finalDirName);

    if (!existsSync(this.sessionDir)) {
      return;
    }

    if (finalDirPath === this.sessionDir) {
      return;
    }

    try {
      renameSync(this.sessionDir, finalDirPath);
    } catch (_error) {
      // If a folder with the same final name already exists, append a timestamp-based suffix.
      const fallbackPath = `${finalDirPath}-${Date.now()}`;
      renameSync(this.sessionDir, fallbackPath);
    }
  }

  private rotateLogFile() {
    this.partIndex += 1;
    this.currentLineCount = 0;
    this.currentFilePath = this.buildFilePath();
  }

  private buildFilePath() {
    const paddedPart = `${this.partIndex}`.padStart(PART_PADDING, "0");

    return join(this.sessionDir, `${LOG_FILE_BASENAME}_part${paddedPart}${LOG_EXTENSION}`);
  }

  private installShutdownHooks() {
    for (const signal of SHUTDOWN_SIGNALS) {
      process.once(signal, this.shutdownHandler);
    }
  }

  private removeShutdownHooks() {
    for (const signal of SHUTDOWN_SIGNALS) {
      process.removeListener(signal, this.shutdownHandler);
    }
  }
}

export const createLogDestination = (options: LogFileWriterOptions) => {
  const writer = new SessionLogWriter(options);

  return new Writable({
    write(chunk, _encoding, callback) {
      try {
        writer.write(chunk);
        callback();
      } catch (error) {
        callback(error as Error);
      }
    },
    final(callback) {
      writer.close();
      callback();
    },
  });
};
