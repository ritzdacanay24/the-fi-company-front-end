const fs = require('node:fs');
const path = require('node:path');

const sourceDir = path.resolve(__dirname, '../src/shared/email/templates');
const destinationDir = path.resolve(__dirname, '../dist/shared/email/templates');

function copyDirectoryRecursive(source, destination) {
  if (!fs.existsSync(source)) {
    return;
  }

  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(sourcePath, destinationPath);
      continue;
    }

    fs.copyFileSync(sourcePath, destinationPath);
  }
}

copyDirectoryRecursive(sourceDir, destinationDir);
