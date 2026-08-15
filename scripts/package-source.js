import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root directory of the project
const rootDir = path.resolve(__dirname, '..');

// Get version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const appVersion = packageJson.version || 'unknown';
const zipName = `qdown-${appVersion}-source.zip`;
const outputPath = path.join(rootDir, zipName);

console.log(`Starting packaging source code to ${zipName}...`);

// Create a file to stream archive data to.
const output = fs.createWriteStream(outputPath);
const archive = new ZipArchive({
  zlib: { level: 9 } // Sets the compression level.
});

// Listen for all archive data to be written
output.on('close', function() {
  console.log(`\nSuccess! Created archive: ${zipName}`);
  console.log(`Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
});

// Good practice to catch this error explicitly
archive.on('error', function(err) {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Define exclusions
const excludePatterns = [
  '.git',
  '.gitignore',
  'node_modules',
  'dist',
  'dist-server',
  'release-app',
  'downloads',
  'yt-dlp.exe',
  'yt-dlp',
  'ffmpeg.exe',
  'ffmpeg',
  'ffmpeg-download.zip',
];

// Read root directory and append files
const items = fs.readdirSync(rootDir);

for (const item of items) {
  if (excludePatterns.includes(item)) {
    continue;
  }
  if (item.endsWith('.zip') || item.endsWith('.part') || item.endsWith('.ytdl') || item.endsWith('.mp4') || item.endsWith('.webm') || item.endsWith('.mp3')) {
    continue;
  }
  
  const fullPath = path.join(rootDir, item);
  const stat = fs.statSync(fullPath);
  
  if (stat.isDirectory()) {
    console.log(`Adding directory: ${item}/`);
    archive.glob('**/*', {
      cwd: fullPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/dist-server/**', '**/.git/**', '**/*.part', '**/*.zip', '**/*.exe']
    }, { prefix: item });
  } else {
    console.log(`Adding file:      ${item}`);
    archive.file(fullPath, { name: item });
  }
}

// Finalize the archive
archive.finalize();
