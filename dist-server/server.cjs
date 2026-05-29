"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_child_process = require("child_process");
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_https = __toESM(require("https"), 1);
var import_open = __toESM(require("open"), 1);
const currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
const isPkg = typeof process.pkg !== "undefined";
const exeDir = isPkg ? import_path.default.dirname(process.execPath) : currentDir;
const staticDir = isPkg ? import_path.default.join(currentDir, "..", "dist") : import_path.default.join(currentDir, "dist");
const app = (0, import_express.default)();
const PORT = 3001;
app.use((0, import_cors.default)());
app.use(import_express.default.json());
const DOWNLOAD_DIR = import_path.default.join(exeDir, "downloads");
if (!import_fs.default.existsSync(DOWNLOAD_DIR)) {
  import_fs.default.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}
const isWin = process.platform === "win32";
const YTDLP_BIN = import_path.default.join(exeDir, isWin ? "yt-dlp.exe" : "yt-dlp");
const YTDLP_URL = isWin ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" : process.platform === "darwin" ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos" : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
async function downloadYtDlp() {
  if (import_fs.default.existsSync(YTDLP_BIN)) return;
  console.log(`Downloading yt-dlp binary for ${process.platform}...`);
  return new Promise((resolve, reject) => {
    const file = import_fs.default.createWriteStream(YTDLP_BIN);
    const handleResponse = (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        import_https.default.get(response.headers.location, handleResponse).on("error", handleError);
      } else if (response.statusCode === 200) {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          if (!isWin) import_fs.default.chmodSync(YTDLP_BIN, 493);
          resolve();
        });
      } else {
        handleError(new Error(`Failed to download, status code: ${response.statusCode}`));
      }
    };
    const handleError = (err) => {
      import_fs.default.unlink(YTDLP_BIN, () => {
      });
      reject(err);
    };
    import_https.default.get(YTDLP_URL, handleResponse).on("error", handleError);
  });
}
downloadYtDlp().then(() => {
  console.log("yt-dlp binary is ready.");
}).catch((err) => {
  console.error("Failed to download yt-dlp binary:", err);
});
const jobs = /* @__PURE__ */ new Map();
let jobCounter = 0;
function getFormatString(quality) {
  switch (quality) {
    case "1080p":
      return "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
    case "720p":
      return "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
    case "480p":
      return "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
    case "audio":
      return "bestaudio[ext=m4a]/bestaudio/best";
    case "best":
    default:
      return "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
  }
}
app.post("/api/download/start", (req, res) => {
  const { url, quality } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }
  if (!import_fs.default.existsSync(YTDLP_BIN)) {
    return res.status(500).json({ error: "yt-dlp binary is not available. Please check server setup." });
  }
  const jobId = `job_${Date.now()}_${++jobCounter}`;
  const timestamp = Date.now();
  const outputTemplate = import_path.default.join(DOWNLOAD_DIR, `${timestamp}_%(title)s.%(ext)s`);
  jobs.set(jobId, {
    status: "starting",
    progress: 0,
    filePrefix: `${timestamp}_`,
    outputFile: null,
    error: null,
    clients: []
  });
  const formatStr = getFormatString(quality || "best");
  const args = [
    url,
    "-o",
    outputTemplate,
    "-f",
    formatStr,
    "--no-warnings",
    "--newline"
    // Force newline output to make regex parsing reliable
  ];
  console.log(`[${jobId}] Starting download: ${url} (Quality: ${quality || "best"})`);
  const child = (0, import_child_process.spawn)(YTDLP_BIN, args);
  const updateClients = (job) => {
    job.clients.forEach((client) => {
      client.write(`data: ${JSON.stringify({ status: job.status, progress: job.progress, error: job.error })}

`);
    });
  };
  child.stdout.on("data", (data) => {
    const text = data.toString();
    const match = text.match(/\[download\]\s+([\d\.]+)\%/);
    if (match) {
      const progress = parseFloat(match[1]);
      const job = jobs.get(jobId);
      if (job && progress > job.progress) {
        job.progress = progress;
        job.status = "downloading";
        updateClients(job);
      }
    }
  });
  child.stderr.on("data", (data) => {
    console.error(`[${jobId} ERROR]: ${data.toString().trim()}`);
  });
  child.on("close", (code) => {
    const job = jobs.get(jobId);
    if (!job) return;
    if (code === 0) {
      const files = import_fs.default.readdirSync(DOWNLOAD_DIR);
      const downloadedFile = files.find((f) => f.startsWith(job.filePrefix));
      if (downloadedFile) {
        job.status = "completed";
        job.progress = 100;
        job.outputFile = downloadedFile;
        updateClients(job);
      } else {
        job.status = "error";
        job.error = "Downloaded file not found on disk";
        updateClients(job);
      }
    } else {
      job.status = "error";
      job.error = `Download failed. It may be restricted or requires a login.`;
      updateClients(job);
    }
    setTimeout(() => {
      job.clients.forEach((c) => c.end());
      job.clients = [];
    }, 3e3);
  });
  res.json({ jobId });
});
app.get("/api/download/stream/:jobId", (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ status: job.status, progress: job.progress, error: job.error })}

`);
  job.clients.push(res);
  req.on("close", () => {
    job.clients = job.clients.filter((c) => c !== res);
  });
});
app.get("/api/download/file/:jobId", (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);
  if (!job || job.status !== "completed" || !job.outputFile) {
    return res.status(404).json({ error: "File not ready or job not found" });
  }
  const filePath = import_path.default.join(DOWNLOAD_DIR, job.outputFile);
  res.download(filePath, job.outputFile, (err) => {
    if (err) console.error(`[${jobId}] Error sending file:`, err);
    try {
      import_fs.default.unlinkSync(filePath);
      console.log(`[${jobId}] Cleaned up file: ${filePath}`);
    } catch (cleanupErr) {
      console.error(`[${jobId}] Error cleaning up file:`, cleanupErr);
    }
    jobs.delete(jobId);
  });
});
app.use(import_express.default.static(staticDir));
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(import_path.default.join(staticDir, "index.html"));
  }
});
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Application running on http://127.0.0.1:${PORT}`);
  (0, import_open.default)(`http://127.0.0.1:${PORT}`);
});
