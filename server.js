import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { exec } from 'child_process';
import os from 'os';

// Determine the current directory safely
const isESM = typeof __dirname === 'undefined';
const currentDir = isESM ? process.cwd() : __dirname;

// Determine if we are running in Electron or PKG
const isPkg = typeof process.pkg !== 'undefined';
const isElectron = typeof process.versions !== 'undefined' && process.versions.electron;

// If we are bundled into dist-server via esbuild, the root is one level up
const rootDir = (currentDir.endsWith('dist-server') || currentDir.endsWith('dist-server\\')) ? path.join(currentDir, '..') : currentDir;

// Where to find the frontend dist folder
const staticDir = path.join(rootDir, 'dist');

const logToFile = (msg) => {
  try {
    const logPath = path.join(os.tmpdir(), 'qdown-crash.log');
    fs.appendFileSync(logPath, `[SERVER LOG] ${msg}\n`);
  } catch (e) {}
};

try {
  const logPath = path.join(os.tmpdir(), 'qdown-crash.log');
  fs.appendFileSync(logPath, `[SERVER INIT] currentDir: ${currentDir}\n`);
  fs.appendFileSync(logPath, `[SERVER INIT] rootDir: ${rootDir}\n`);
  fs.appendFileSync(logPath, `[SERVER INIT] staticDir: ${staticDir}\n`);
  fs.appendFileSync(logPath, `[SERVER INIT] staticDir exists: ${fs.existsSync(staticDir)}\n`);
} catch (e) {}

// Where to store downloads and yt-dlp binary
// In Electron packaged mode, we use the user's Downloads folder to avoid permission issues
const exeDir = (isElectron && !isESM) ? path.join(os.homedir(), 'Downloads', 'qDown') : rootDir;

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DOWNLOAD_DIR = path.join(exeDir, 'downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

const isWin = process.platform === 'win32';
const YTDLP_BIN = path.join(exeDir, isWin ? 'yt-dlp.exe' : 'yt-dlp');
const YTDLP_URL = isWin 
  ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
  : (process.platform === 'darwin' ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos' : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp');

async function downloadYtDlp() {
  if (fs.existsSync(YTDLP_BIN)) return;
  console.log(`Downloading yt-dlp binary for ${process.platform}...`);
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(YTDLP_BIN);
    const handleResponse = (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location, handleResponse).on('error', handleError);
      } else if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          if (!isWin) fs.chmodSync(YTDLP_BIN, 0o755);
          resolve();
        });
      } else {
        handleError(new Error(`Failed to download, status code: ${response.statusCode}`));
      }
    };
    
    const handleError = (err) => {
      fs.unlink(YTDLP_BIN, () => {});
      reject(err);
    };

    https.get(YTDLP_URL, handleResponse).on('error', handleError);
  });
}

downloadYtDlp().then(() => {
  console.log('yt-dlp binary is ready.');
  logToFile('yt-dlp binary is ready.');
}).catch(err => {
  console.error('Failed to download yt-dlp binary:', err);
  logToFile(`Failed to download yt-dlp binary: ${err.stack || err.toString()}`);
});

// Memory store for active download jobs
const jobs = new Map();
let jobCounter = 0;

function getFormatString(quality) {
  switch(quality) {
    case '1080p': return 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
    case '720p': return 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
    case '480p': return 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
    case 'audio': return 'bestaudio[ext=m4a]/bestaudio/best';
    case 'best':
    default:
      return 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
  }
}

app.post('/api/download/start', (req, res) => {
  const { 
    url, 
    quality, 
    downloadType, 
    videoFormat, 
    audioFormat, 
    audioBitrate, 
    downloadSubtitles,
    downloadDir
  } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!fs.existsSync(YTDLP_BIN)) {
    return res.status(500).json({ error: 'yt-dlp binary is not available. Please check server setup.' });
  }

  const jobId = `job_${Date.now()}_${++jobCounter}`;
  const timestamp = Date.now();
  
  const targetDir = downloadDir || DOWNLOAD_DIR;
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create target directory:', err);
  }

  const outputTemplate = path.join(targetDir, `${timestamp}_%(title)s.%(ext)s`);

  jobs.set(jobId, {
    status: 'starting',
    progress: 0,
    filePrefix: `${timestamp}_`,
    targetDir: targetDir,
    outputFile: null,
    error: null,
    clients: []
  });

  const args = [
    url,
    '-o', outputTemplate,
    '--no-warnings',
    '--newline' // Force newline output to make regex parsing reliable
  ];

  const type = downloadType || 'video';

  if (type === 'audio') {
    args.push('-f', 'bestaudio/best');
    args.push('--extract-audio');
    
    const fmt = audioFormat && audioFormat !== 'default' ? audioFormat : 'mp3';
    args.push('--audio-format', fmt);
    
    const qualityVal = audioBitrate && audioBitrate !== 'best' ? `${audioBitrate}k` : '0';
    args.push('--audio-quality', qualityVal);
  } else if (type === 'video_only') {
    let fmt = 'bestvideo/best';
    if (quality && quality !== 'best') {
      const height = quality.replace('p', '');
      fmt = `bestvideo[height<=${height}]/bestvideo`;
    }
    args.push('-f', fmt);
    
    const container = videoFormat && videoFormat !== 'default' ? videoFormat : 'mp4';
    args.push('--merge-output-format', container);
  } else {
    // Video + Audio (default)
    let fmt = 'bestvideo+bestaudio/best';
    if (quality && quality !== 'best') {
      const height = quality.replace('p', '');
      fmt = `bestvideo[height<=${height}]+bestaudio/best`;
    }
    args.push('-f', fmt);
    
    const container = videoFormat && videoFormat !== 'default' ? videoFormat : 'mp4';
    args.push('--merge-output-format', container);
  }

  if (downloadSubtitles) {
    args.push('--write-subs', '--sub-langs', 'ko,en', '--embed-subs');
  }

  console.log(`[${jobId}] Starting download: ${url} (Args: ${args.slice(1).join(' ')})`);

  const child = spawn(YTDLP_BIN, args);
  
  const updateClients = (job) => {
    job.clients.forEach(client => {
      client.write(`data: ${JSON.stringify({ status: job.status, progress: job.progress, error: job.error })}\n\n`);
    });
  };

  child.stdout.on('data', (data) => {
    const text = data.toString();
    // Parse progress like "[download]  45.0% of 50.00MiB"
    const match = text.match(/\[download\]\s+([\d\.]+)\%/);
    if (match) {
      const progress = parseFloat(match[1]);
      const job = jobs.get(jobId);
      if (job && progress > job.progress) {
        job.progress = progress;
        job.status = 'downloading';
        updateClients(job);
      }
    }
  });

  child.stderr.on('data', (data) => {
    console.error(`[${jobId} ERROR]: ${data.toString().trim()}`);
  });

  child.on('close', (code) => {
    const job = jobs.get(jobId);
    if (!job) return;

    if (code === 0) {
      // Find the finalized file
      const files = fs.readdirSync(job.targetDir);
      const downloadedFile = files.find(f => f.startsWith(job.filePrefix));
      
      if (downloadedFile) {
        job.status = 'completed';
        job.progress = 100;
        job.outputFile = downloadedFile;
        updateClients(job);
      } else {
        job.status = 'error';
        job.error = 'Downloaded file not found on disk';
        updateClients(job);
      }
    } else {
      job.status = 'error';
      job.error = `Download failed. It may be restricted or requires a login.`;
      updateClients(job);
    }
    
    // Cleanup SSE clients after notifying completion/error
    setTimeout(() => {
      job.clients.forEach(c => c.end());
      job.clients = [];
      if (isElectron) {
        jobs.delete(jobId);
      }
    }, 3000);
  });

  res.json({ jobId });
});

app.get('/api/download/stream/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial state immediately
  res.write(`data: ${JSON.stringify({ status: job.status, progress: job.progress, error: job.error })}\n\n`);

  job.clients.push(res);
  
  req.on('close', () => {
    job.clients = job.clients.filter(c => c !== res);
  });
});

app.get('/api/download/default-dir', (req, res) => {
  res.json({ defaultDir: DOWNLOAD_DIR });
});

app.get('/api/download/file/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);

  if (!job || job.status !== 'completed' || !job.outputFile) {
    return res.status(404).json({ error: 'File not ready or job not found' });
  }

  const filePath = path.join(job.targetDir, job.outputFile);
  
  res.download(filePath, job.outputFile, (err) => {
    if (err) console.error(`[${jobId}] Error sending file:`, err);
    try {
      fs.unlinkSync(filePath);
      console.log(`[${jobId}] Cleaned up file: ${filePath}`);
    } catch (cleanupErr) {
      console.error(`[${jobId}] Error cleaning up file:`, cleanupErr);
    }
    // Remove job to free memory
    jobs.delete(jobId);
  });
});

app.use(express.static(staticDir));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(staticDir, 'index.html'));
  }
});

const server = app.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log(`Application running on ${url}`);
  logToFile(`Express server started and listening on ${url}`);
});

server.on('error', (err) => {
  logToFile(`Express server error event: ${err.code || err.toString()} - ${err.stack || err.toString()}`);
  if (err.code === 'EADDRINUSE') {
    console.warn(`Port ${PORT} is already in use. Assuming the backend is already running.`);
  } else {
    console.error('Server error:', err);
  }
});
