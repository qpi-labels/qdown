import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  console.log('1. Building frontend...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('\n2. Bundling server...');
  execSync('npm run bundle:server', { stdio: 'inherit' });

  console.log('\n3. Packaging with pkg (this might take a while)...');
  execSync('npx pkg . --no-bytecode --public --public-packages "*"', { stdio: 'inherit' });

  console.log('\n4. Creating release folders...');
  const releases = {
    'release-windows': {
      source: 'qdown-youtube-downloader-win-x64.exe',
      dest: 'qdown.exe',
      script: 'start.bat',
      scriptContent: '@echo off\nqdown.exe\npause\n'
    },
    'release-mac-x64': {
      source: 'qdown-youtube-downloader-macos-x64',
      dest: 'qdown',
      script: 'start.command',
      scriptContent: '#!/bin/bash\ncd "$(dirname "$0")"\n./qdown\n'
    }
  };

  for (const [folder, config] of Object.entries(releases)) {
    const folderPath = path.join(__dirname, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    // Determine the actual source file name from pkg output
    let actualSource = config.source;
    if (folder === 'release-mac-x64') {
        if (fs.existsSync('qdown-youtube-downloader-macos-x64')) {
            actualSource = 'qdown-youtube-downloader-macos-x64';
        } else if (fs.existsSync('qdown-youtube-downloader-macos')) {
            actualSource = 'qdown-youtube-downloader-macos';
        }
    }

    if (fs.existsSync(actualSource)) {
      fs.copyFileSync(actualSource, path.join(folderPath, config.dest));
      fs.writeFileSync(path.join(folderPath, config.script), config.scriptContent);
      
      if (folder.includes('mac')) {
        try {
          execSync(`chmod +x "${path.join(folderPath, config.script)}"`);
          execSync(`chmod +x "${path.join(folderPath, config.dest)}"`);
        } catch (e) {
          // chmod might fail on Windows, ignore it
        }
      }
      console.log(`Created ${folder}`);
    } else {
      console.warn(`Warning: Could not find ${actualSource}`);
    }
  }

  // Also handle mac-arm64 if it was generated
  if (fs.existsSync('qdown-youtube-downloader-macos-arm64')) {
      const folderPath = path.join(__dirname, 'release-mac-arm64');
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
      
      fs.copyFileSync('qdown-youtube-downloader-macos-arm64', path.join(folderPath, 'qdown'));
      fs.writeFileSync(path.join(folderPath, 'start.command'), '#!/bin/bash\ncd "$(dirname "$0")"\n./qdown\n');
      try {
        execSync(`chmod +x "${path.join(folderPath, 'start.command')}"`);
        execSync(`chmod +x "${path.join(folderPath, 'qdown')}"`);
      } catch (e) {
        // ignore
      }
      console.log(`Created release-mac-arm64`);
  }

  console.log('\nSuccess! You can now zip the release folders and upload them to GitHub.');

} catch (error) {
  console.error('An error occurred during the build process:', error);
}
