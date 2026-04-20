const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const targetName = args[0] || 'latest.log';
const once = args.includes('--once');
const linesArg = args.find((arg) => arg.startsWith('--lines='));
const maxLines = Number(linesArg?.split('=')[1] || '120');

const logPath = path.resolve(process.cwd(), 'logs', targetName);

function readTail(filePath, lineCount) {
  if (!fs.existsSync(filePath)) {
    return '';
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  return lines.slice(-lineCount).join('\n');
}

function printHeader() {
  process.stdout.write(`Tailing ${logPath}\n`);
  process.stdout.write('Press Ctrl+C to stop.\n\n');
}

if (!fs.existsSync(path.dirname(logPath))) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
}

if (!fs.existsSync(logPath)) {
  fs.writeFileSync(logPath, '');
}

const initial = readTail(logPath, Number.isFinite(maxLines) ? maxLines : 120);
if (initial) {
  process.stdout.write(`${initial}\n`);
}

if (once) {
  process.exit(0);
}

printHeader();

let offset = fs.statSync(logPath).size;

fs.watchFile(logPath, { interval: 500 }, () => {
  try {
    const stats = fs.statSync(logPath);

    if (stats.size < offset) {
      offset = 0;
    }

    if (stats.size > offset) {
      const stream = fs.createReadStream(logPath, { start: offset, end: stats.size });
      stream.on('data', (chunk) => process.stdout.write(chunk));
      offset = stats.size;
    }
  } catch (error) {
    process.stderr.write(`Failed to read log updates: ${error.message}\n`);
  }
});

process.on('SIGINT', () => {
  fs.unwatchFile(logPath);
  process.exit(0);
});
