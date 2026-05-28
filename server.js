import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

const isWin = process.platform === 'win32';
const YTDLP_BIN = path.join(__dirname, isWin ? 'yt-dlp.exe' : 'yt-dlp');
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
}).catch(err => {
  console.error('Failed to download yt-dlp binary:', err);
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
  const { url, quality } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!fs.existsSync(YTDLP_BIN)) {
    return res.status(500).json({ error: 'yt-dlp binary is not available. Please check server setup.' });
  }

  const jobId = `job_${Date.now()}_${++jobCounter}`;
  const timestamp = Date.now();
  const outputTemplate = path.join(DOWNLOAD_DIR, `${timestamp}_%(title)s.%(ext)s`);

  jobs.set(jobId, {
    status: 'starting',
    progress: 0,
    filePrefix: `${timestamp}_`,
    outputFile: null,
    error: null,
    clients: []
  });

  const formatStr = getFormatString(quality || 'best');
  const args = [
    url,
    '-o', outputTemplate,
    '-f', formatStr,
    '--no-warnings',
    '--newline' // Force newline output to make regex parsing reliable
  ];

  console.log(`[${jobId}] Starting download: ${url} (Quality: ${quality || 'best'})`);

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
      const files = fs.readdirSync(DOWNLOAD_DIR);
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

app.get('/api/download/file/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);

  if (!job || job.status !== 'completed' || !job.outputFile) {
    return res.status(404).json({ error: 'File not ready or job not found' });
  }

  const filePath = path.join(DOWNLOAD_DIR, job.outputFile);
  
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

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Backend server running on http://127.0.0.1:${PORT}`);
});
