import { ffmpegService } from './ffmpegService';

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  author: string;
  downloadUrl?: string;
  audioUrl?: string;
}

export class YouTubeService {
  /**
   * Extract video ID from various YouTube URL formats
   */
  static extractVideoId(url: string): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)/;
    const match = url.match(regExp);
    if (match && match[0]) {
      const parts = url.split(regExp);
      if (parts[2]) {
        return parts[2].split(/[^a-zA-Z0-9_-]/)[0];
      }
    }
    const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch && shortsMatch[1]) {
      return shortsMatch[1];
    }
    return null;
  }

  /**
   * Fetch video metadata using oEmbed and public client endpoints
   */
  static async getVideoInfo(url: string): Promise<YouTubeVideoInfo> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('유효한 유튜브 URL이 아닙니다. (예: https://www.youtube.com/watch?v=...)');
    }

    try {
      // 1. Fetch title and author via oEmbed
      const oembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
      const oembedData = await oembedRes.json();

      const title = oembedData.title || `YouTube Video (${videoId})`;
      const author = oembedData.author_name || 'YouTube Channel';
      const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      return {
        id: videoId,
        title,
        thumbnail,
        duration: 0,
        author,
      };
    } catch (err) {
      return {
        id: videoId,
        title: `YouTube Video (${videoId})`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: 0,
        author: 'YouTube',
      };
    }
  }

  /**
   * Download YouTube video completely on the client side using public API proxies & FFmpeg WASM muxing
   */
  static async downloadVideo(
    url: string,
    options: {
      quality: string;
      downloadType: 'video' | 'audio' | 'video_only';
      videoFormat: string;
      audioFormat: string;
      audioBitrate: string;
    },
    onProgress: (progress: number, status: string) => void,
    onLog?: (log: string) => void
  ): Promise<{ blob: Blob; filename: string }> {
    onProgress(5, '유튜브 영상 정보를 분석하는 중...');

    const info = await this.getVideoInfo(url);
    const sanitizedTitle = info.title.replace(/[\\/:*?"<>|]/g, '_');

    onProgress(15, '미디어 스트림 다운로드 주소 요청 중...');

    // We fetch media stream via client-side Cobalt / CORS fallback API endpoints
    let downloadResult: { videoUrl?: string; audioUrl?: string; streamUrl?: string } = {};

    const apiEndpoints = [
      'https://api.cobalt.tools/api/json',
      'https://co.wuk.sh/api/json',
    ];

    let success = false;

    for (const endpoint of apiEndpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            url: url,
            vQuality: options.quality === 'best' ? 'max' : options.quality.replace('p', ''),
            isAudioOnly: options.downloadType === 'audio',
            aFormat: options.audioFormat === 'default' ? 'mp3' : options.audioFormat,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            downloadResult.streamUrl = data.url;
            success = true;
            break;
          } else if (data.status === 'stream' || data.status === 'redirect') {
            downloadResult.streamUrl = data.url;
            success = true;
            break;
          } else if (data.picker) {
            // Pick highest quality stream
            const item = data.picker[0];
            downloadResult.streamUrl = item.url;
            success = true;
            break;
          }
        }
      } catch (err) {
        console.warn(`Endpoint ${endpoint} failed, trying next fallback...`, err);
      }
    }

    // Fallback: If public endpoint unavailable, use direct stream proxy
    if (!success || !downloadResult.streamUrl) {
      onProgress(25, 'CORS 프록시 스트림으로 우회 연결 중...');
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://www.youtube.com/watch?v=${info.id}`)}`;
      downloadResult.streamUrl = `https://v2.convert2mp3s.com/api/widget?url=${encodeURIComponent(url)}`;
    }

    onProgress(40, '브라우저 메모리로 미디어 데이터 수신 중...');

    // Fetch stream blob into memory
    try {
      const streamRes = await fetch(downloadResult.streamUrl!);
      if (!streamRes.ok) {
        throw new Error('미디어 스트림을 가져올 수 없습니다.');
      }

      const totalBytes = parseInt(streamRes.headers.get('content-length') || '0', 10);
      const reader = streamRes.body?.getReader();

      let receivedBytes = 0;
      const chunks: Uint8Array[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            receivedBytes += value.length;
            if (totalBytes > 0) {
              const streamProg = 40 + Math.round((receivedBytes / totalBytes) * 45);
              onProgress(streamProg, `다운로드 중... (${(receivedBytes / (1024 * 1024)).toFixed(1)} MB / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB)`);
            } else {
              onProgress(60, `수신 중... (${(receivedBytes / (1024 * 1024)).toFixed(1)} MB)`);
            }
          }
        }
      }

      const rawBlob = new Blob(chunks as any[], {
        type: options.downloadType === 'audio' ? 'audio/mpeg' : 'video/mp4',
      });

      // Post-processing / WASM conversion if format or audio extraction needed
      if (options.downloadType === 'audio' && options.audioFormat !== 'default' && options.audioFormat !== 'mp3') {
        onProgress(88, 'FFmpeg WASM 오디오 변환 중...');
        const tempFile = new File([rawBlob], `temp.${options.audioFormat}`);
        const convertedBlob = await ffmpegService.extractAudio(
          tempFile,
          options.audioFormat,
          options.audioBitrate === 'best' ? '320k' : options.audioBitrate,
          (p, s) => onProgress(88 + Math.round(p * 0.1), s),
          onLog
        );
        onProgress(100, '다운로드 준비 완료!');
        return {
          blob: convertedBlob,
          filename: `${sanitizedTitle}.${options.audioFormat}`,
        };
      }

      const ext = options.downloadType === 'audio' 
        ? (options.audioFormat === 'default' ? 'mp3' : options.audioFormat)
        : (options.videoFormat === 'default' ? 'mp4' : options.videoFormat);

      onProgress(100, '다운로드 준비 완료!');
      return {
        blob: rawBlob,
        filename: `${sanitizedTitle}.${ext}`,
      };
    } catch (err: any) {
      console.error('Client download failed:', err);
      throw new Error(`영상 다운로드 실패: ${err.message || '네트워크 응답 오류'}`);
    }
  }
}
