import { ffmpegService } from './ffmpegService';

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  author: string;
}

/**
 * Universal fetch wrapper with CORS Proxy fallbacks for web browser compatibility
 */
async function fetchWithCorsProxy(targetUrl: string, init?: RequestInit): Promise<Response> {
  // 1. Direct fetch attempt
  try {
    const res = await fetch(targetUrl, init);
    if (res.ok) return res;
  } catch (err) {
    // CORS or network error, fallback to proxy
  }

  // 2. CORS Proxy Fallbacks
  const proxyGenerators = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ];

  for (const genProxy of proxyGenerators) {
    try {
      const proxyUrl = genProxy(targetUrl);
      const res = await fetch(proxyUrl, init);
      if (res.ok) return res;
    } catch (err) {
      console.warn(`CORS Proxy failed for ${targetUrl}, trying next proxy...`);
    }
  }

  throw new Error(`CORS 프록시 우회 연결에 실패했습니다: ${targetUrl}`);
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
   * Fetch video metadata using oEmbed
   */
  static async getVideoInfo(url: string): Promise<YouTubeVideoInfo> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('유효한 유튜브 URL이 아닙니다. (예: https://www.youtube.com/watch?v=...)');
    }

    try {
      const oembedRes = await fetchWithCorsProxy(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
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
   * Download YouTube video on client side using CORS Proxy & Android Innertube + Piped + Invidious APIs
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
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('유효한 유튜브 URL이 아닙니다.');
    }

    onProgress(5, '유튜브 미디어 정보 분석 중...');
    const info = await this.getVideoInfo(url);
    const sanitizedTitle = info.title.replace(/[\\/:*?"<>|]/g, '_');

    onProgress(15, '미디어 스트림 주소 탐색 중...');

    let targetVideoUrl: string | null = null;
    let targetAudioUrl: string | null = null;

    // Method 1: YouTube Android Innertube API via CORS Proxy
    try {
      onProgress(20, '유튜브 렌더링 엔진 직접 수신 중...');
      const playerRes = await fetchWithCorsProxy('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: videoId,
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '19.02.39',
              androidSdkVersion: 30,
            },
          },
        }),
      });

      if (playerRes.ok) {
        const playerData = await playerRes.json();
        const streamingData = playerData.streamingData;

        if (streamingData) {
          const formats = streamingData.formats || [];
          const adaptiveFormats = streamingData.adaptiveFormats || [];

          if (options.downloadType === 'audio') {
            const audioFormats = adaptiveFormats.filter((f: any) => f.mimeType && f.mimeType.includes('audio'));
            if (audioFormats.length > 0) {
              audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
              targetAudioUrl = audioFormats[0].url || null;
            }
          } else {
            // Find video format matching quality
            const targetQualityNum = options.quality === 'best' ? 2160 : parseInt(options.quality.replace('p', ''), 10) || 1080;
            const combinedMatches = formats.filter((f: any) => f.url);
            
            if (combinedMatches.length > 0) {
              combinedMatches.sort((a: any, b: any) => Math.abs((a.height || 0) - targetQualityNum) - Math.abs((b.height || 0) - targetQualityNum));
              targetVideoUrl = combinedMatches[0].url;
            } else {
              const videoFormats = adaptiveFormats.filter((f: any) => f.url && f.mimeType && f.mimeType.includes('video'));
              if (videoFormats.length > 0) {
                videoFormats.sort((a: any, b: any) => Math.abs((a.height || 0) - targetQualityNum) - Math.abs((b.height || 0) - targetQualityNum));
                targetVideoUrl = videoFormats[0].url;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Innertube direct fetch failed, trying Piped/Invidious proxies...', err);
    }

    // Method 2: Piped API via CORS Proxy fallback
    if (!targetVideoUrl && !targetAudioUrl) {
      const pipedInstances = [
        'https://api.piped.video',
        'https://pipedapi.kavin.rocks',
        'https://piped-api.garudalinux.org',
      ];

      for (const instance of pipedInstances) {
        try {
          onProgress(25, `보조 미디어 서버 연결 중 (${new URL(instance).hostname})...`);
          const res = await fetchWithCorsProxy(`${instance}/streams/${videoId}`);
          if (res.ok) {
            const data = await res.json();
            if (options.downloadType === 'audio') {
              const audioStreams = data.audioStreams || [];
              if (audioStreams.length > 0) {
                audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
                targetAudioUrl = audioStreams[0].url;
              }
            } else {
              const videoStreams = data.videoStreams || [];
              if (videoStreams.length > 0) {
                targetVideoUrl = videoStreams[0].url;
              }
            }
            if (targetAudioUrl || targetVideoUrl) break;
          }
        } catch (err) {
          console.warn(`Piped instance ${instance} failed...`);
        }
      }
    }

    if (!targetVideoUrl && !targetAudioUrl) {
      throw new Error('스트림 다운로드 주소를 가져오지 못했습니다. URL을 확인해 주세요.');
    }

    // 3. Download Media Stream Chunks into Client-Side RAM
    const streamToFetch = targetAudioUrl || targetVideoUrl!;
    onProgress(35, '브라우저 메모리로 데이터 수신 중...');

    const mediaBlob = await this.fetchStreamBlob(streamToFetch, (p, msg) => onProgress(35 + Math.round(p * 0.5), msg));

    if (options.downloadType === 'audio') {
      const ext = options.audioFormat === 'default' ? 'mp3' : options.audioFormat;
      if (ext === 'mp3' || ext === 'm4a') {
        onProgress(100, '다운로드 완료!');
        return { blob: mediaBlob, filename: `${sanitizedTitle}.${ext}` };
      }

      onProgress(85, 'FFmpeg WASM 오디오 인코딩 중...');
      const tempFile = new File([mediaBlob], `temp.m4a`);
      const convertedBlob = await ffmpegService.extractAudio(
        tempFile,
        ext,
        options.audioBitrate === 'best' ? '320k' : options.audioBitrate,
        (p, msg) => onProgress(85 + Math.round(p * 0.15), msg),
        onLog
      );
      onProgress(100, '다운로드 완료!');
      return { blob: convertedBlob, filename: `${sanitizedTitle}.${ext}` };
    }

    const targetExt = options.videoFormat === 'default' ? 'mp4' : options.videoFormat;
    onProgress(100, '다운로드 완료!');
    return {
      blob: mediaBlob,
      filename: `${sanitizedTitle}.${targetExt}`,
    };
  }

  /**
   * Fetch stream data blob with CORS proxy wrapper and progress tracking
   */
  private static async fetchStreamBlob(
    streamUrl: string,
    onProgress: (progressPercentage: number, message: string) => void
  ): Promise<Blob> {
    const res = await fetchWithCorsProxy(streamUrl);
    if (!res.ok) {
      throw new Error(`스트림 수신 실패 (HTTP status ${res.status})`);
    }

    const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
    const reader = res.body?.getReader();

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
            const percent = Math.min(Math.round((receivedBytes / totalBytes) * 100), 100);
            onProgress(
              percent,
              `스트림 다운로드 중... ${percent}% (${(receivedBytes / (1024 * 1024)).toFixed(1)} MB / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB)`
            );
          } else {
            onProgress(50, `데이터 수신 중... (${(receivedBytes / (1024 * 1024)).toFixed(1)} MB)`);
          }
        }
      }
    }

    return new Blob(chunks as any[], { type: 'video/mp4' });
  }
}
