import { createWriteStream, mkdirSync } from 'node:fs';
import { join } from 'node:path';

let initialized = false;

export function initializeFileLogging(): void {
  if (initialized) {
    return;
  }

  const enabled = String(process.env.LOG_TO_FILE ?? 'true').toLowerCase() !== 'false';
  if (!enabled) {
    return;
  }

  const logDir = process.env.LOG_DIR?.trim() || join(process.cwd(), 'logs');
  mkdirSync(logDir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const dailyLogPath = join(logDir, `nest-api-${date}.log`);
  const latestLogPath = join(logDir, 'latest.log');

  const dailyStream = createWriteStream(dailyLogPath, { flags: 'a' });
  const latestStream = createWriteStream(latestLogPath, { flags: 'a' });

  const writeToFiles = (chunk: unknown): void => {
    const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    dailyStream.write(text);
    latestStream.write(text);
  };

  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = ((chunk: unknown, ...args: unknown[]) => {
    writeToFiles(chunk);
    return originalStdoutWrite(chunk as never, ...(args as never[]));
  }) as typeof process.stdout.write;

  process.stderr.write = ((chunk: unknown, ...args: unknown[]) => {
    writeToFiles(chunk);
    return originalStderrWrite(chunk as never, ...(args as never[]));
  }) as typeof process.stderr.write;

  process.on('exit', () => {
    dailyStream.end();
    latestStream.end();
  });

  initialized = true;
}
