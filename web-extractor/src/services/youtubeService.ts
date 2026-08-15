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
export async function fetchWithCorsProxy(targetUrl: string, init?: RequestInit): Promise<Response> {
  // 1. Direct fetch attempt (works when target allows CORS, like oEmbed)
  try {
    const res = await fetch(targetUrl, init);
    if (res.ok) return res;
  } catch (err) {
    // CORS or network error, fallback to proxy
  }

  // 2. CORS Proxy Fallbacks
  const proxyGenerators = [
    // Primary: Relative path to current domain or deployed app
    (u: string) => {
      const baseUrl = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'https://qdown.qpi.digital'
        : '';
      return `${baseUrl}/api/proxy?url=${encodeURIComponent(u)}`;
    },
    // Fallback public CORS proxies
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
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
   * Extract formats using YouTube's ANDROID_VR Innertube client with visitorData
   */
  private static async extractFormatsFromInnertube(videoId: string): Promise<{
    formats: any[];
    adaptiveFormats: any[];
  }> {
    // 1. Get visitorData by scraping YouTube watch page via CORS proxy
    let visitorData: string | undefined = undefined;
    try {
      const watchPageRes = await fetchWithCorsProxy(`https://www.youtube.com/watch?v=${videoId}`);
      if (watchPageRes.ok) {
        const html = await watchPageRes.text();
        const visitorMatch = html.match(/"visitorData":"([^"]+)"/);
        if (visitorMatch && visitorMatch[1]) {
          visitorData = visitorMatch[1];
        }
      }
    } catch (e) {
      console.warn('Could not fetch visitorData from watch page, using fallback:', e);
    }

    // 2. Request Innertube player endpoint with ANDROID_VR client context
    const playerPayload = {
      videoId: videoId,
      context: {
        client: {
          clientName: 'ANDROID_VR',
          clientVersion: '1.65',
          visitorData: visitorData,
          deviceMake: 'Oculus',
          deviceModel: 'Quest 3',
          osName: 'Android',
          osVersion: '12',
          hl: 'en',
          gl: 'US',
        },
      },
    };

    const playerRes = await fetchWithCorsProxy('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-YouTube-Client-Name': '55',
        'X-YouTube-Client-Version': '1.65',
      },
      body: JSON.stringify(playerPayload),
    });

    if (!playerRes.ok) {
      throw new Error(`Innertube API returned HTTP ${playerRes.status}`);
    }

    const data = await playerRes.json();
    const streamingData = data.streamingData || {};
    const formats = streamingData.formats || [];
    const adaptiveFormats = streamingData.adaptiveFormats || [];

    return { formats, adaptiveFormats };
  }

  /**
   * Fallback: Extract formats via Piped / Invidious instances
   */
  private static async extractFormatsFallback(videoId: string): Promise<{
    videoUrl?: string;
    audioUrl?: string;
  }> {
    const pipedInstances = [
      'https://pipedapi.kavin.rocks',
      'https://api.piped.projectsegfau.lt',
      'https://pipedapi.in.projectsegfau.lt',
      'https://pipedapi.us.projectsegfau.lt',
    ];

    for (const instance of pipedInstances) {
      try {
        const res = await fetchWithCorsProxy(`${instance}/streams/${videoId}`);
        if (res.ok) {
          const data = await res.json();
          const audioStreams = data.audioStreams || [];
          const videoStreams = data.videoStreams || [];

          audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
          const audioUrl = audioStreams[0]?.url;
          const videoUrl = videoStreams[0]?.url;

          if (audioUrl || videoUrl) {
            return { videoUrl, audioUrl };
          }
        }
      } catch (err) {
        // Try next instance
      }
    }

    return {};
  }

  /**
   * Download YouTube video on client side using CORS Proxy & client-side FFmpeg WASM resources
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

    onProgress(12, '미디어 스트림 주소 탐색 중...');

    let targetVideoUrl: string | null = null;
    let targetAudioUrl: string | null = null;
    let isCombinedStream = false;

    // 1. Primary: YouTube Innertube API via Android VR
    try {
      onProgress(18, '유튜브 렌더링 스트림 엔진 수신 중...');
      const { formats, adaptiveFormats } = await this.extractFormatsFromInnertube(videoId);

      const targetQualityNum = options.quality === 'best' ? 2160 : parseInt(options.quality.replace('p', ''), 10) || 1080;

      // Extract Audio URL
      const audioStreams = adaptiveFormats.filter((f: any) => f.url && f.mimeType && f.mimeType.includes('audio'));
      if (audioStreams.length > 0) {
        audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
        targetAudioUrl = audioStreams[0].url;
      }

      if (options.downloadType === 'audio') {
        // Audio only requested
        if (!targetAudioUrl && formats.length > 0 && formats[0].url) {
          targetAudioUrl = formats[0].url;
        }
      } else {
        // Video requested
        // Check if there is a matching pre-combined format with both video & audio
        const combinedMatches = formats.filter((f: any) => f.url && (f.height || 0) >= 360);
        if (options.quality !== 'best' && options.quality !== '1080p' && options.quality !== '1440p' && options.quality !== '2160p') {
          // If low quality (e.g. 720p/360p), check if combined stream exists
          const matchingCombined = combinedMatches.find((f: any) => (f.height || 0) === targetQualityNum);
          if (matchingCombined) {
            targetVideoUrl = matchingCombined.url;
            isCombinedStream = true;
          }
        }

        if (!targetVideoUrl) {
          // Select best matching video stream from adaptive formats
          const videoStreams = adaptiveFormats.filter((f: any) => f.url && f.mimeType && f.mimeType.includes('video'));
          if (videoStreams.length > 0) {
            // Sort by closest height to requested quality
            videoStreams.sort((a: any, b: any) => {
              const diffA = Math.abs((a.height || 0) - targetQualityNum);
              const diffB = Math.abs((b.height || 0) - targetQualityNum);
              if (diffA !== diffB) return diffA - diffB;
              return (b.bitrate || 0) - (a.bitrate || 0);
            });
            targetVideoUrl = videoStreams[0].url;
          } else if (formats.length > 0 && formats[0].url) {
            targetVideoUrl = formats[0].url;
            isCombinedStream = true;
          }
        }
      }
    } catch (innertubeErr) {
      console.warn('Innertube direct fetch failed, trying Piped fallback...', innertubeErr);
    }

    // 2. Fallback: Piped Streams
    if (!targetVideoUrl && !targetAudioUrl) {
      onProgress(22, '보조 미디어 스트림 서버 연결 중...');
      const fallback = await this.extractFormatsFallback(videoId);
      targetVideoUrl = fallback.videoUrl || null;
      targetAudioUrl = fallback.audioUrl || null;
    }

    if (!targetVideoUrl && !targetAudioUrl) {
      throw new Error('스트림 다운로드 주소를 가져오지 못했습니다. URL을 확인해 주세요.');
    }

    // 3. Download Data Chunks into Client Browser RAM
    // Case A: Audio Only
    if (options.downloadType === 'audio') {
      const streamUrl = targetAudioUrl || targetVideoUrl!;
      onProgress(30, '오디오 스트림을 브라우저 메모리로 수신 중...');
      const audioBlob = await this.fetchStreamBlob(streamUrl, (p, msg) => onProgress(30 + Math.round(p * 0.45), msg));

      const ext = options.audioFormat === 'default' ? 'mp3' : options.audioFormat;
      if (ext === 'mp3' || ext === 'wav' || ext === 'aac') {
        onProgress(78, `FFmpeg WASM으로 ${ext.toUpperCase()} 오디오 인코딩 중...`);
        const tempFile = new File([audioBlob], `temp_audio.webm`);
        const convertedBlob = await ffmpegService.extractAudio(
          tempFile,
          ext,
          options.audioBitrate === 'best' ? '320k' : `${options.audioBitrate}k`,
          (p, msg) => onProgress(78 + Math.round(p * 0.2), msg),
          onLog
        );
        onProgress(100, '다운로드 완료!');
        return { blob: convertedBlob, filename: `${sanitizedTitle}.${ext}` };
      }

      onProgress(100, '다운로드 완료!');
      return { blob: audioBlob, filename: `${sanitizedTitle}.${ext}` };
    }

    // Case B: Video Only
    if (options.downloadType === 'video_only') {
      const streamUrl = targetVideoUrl!;
      onProgress(30, '비디오 스트림을 브라우저 메모리로 수신 중...');
      const videoBlob = await this.fetchStreamBlob(streamUrl, (p, msg) => onProgress(30 + Math.round(p * 0.65), msg));

      const targetExt = options.videoFormat === 'default' ? 'mp4' : options.videoFormat;
      onProgress(100, '다운로드 완료!');
      return { blob: videoBlob, filename: `${sanitizedTitle}.${targetExt}` };
    }

    // Case C: Video + Audio (Default)
    if (isCombinedStream || !targetAudioUrl) {
      // Pre-muxed single stream
      onProgress(30, '통합 미디어 스트림을 브라우저 메모리로 수신 중...');
      const mediaBlob = await this.fetchStreamBlob(targetVideoUrl!, (p, msg) => onProgress(30 + Math.round(p * 0.65), msg));

      const targetExt = options.videoFormat === 'default' ? 'mp4' : options.videoFormat;
      onProgress(100, '다운로드 완료!');
      return { blob: mediaBlob, filename: `${sanitizedTitle}.${targetExt}` };
    }

    // Separate High-Quality Video Track + Audio Track -> Merge using client-side FFmpeg WASM!
    onProgress(25, '비디오 트랙을 브라우저 메모리로 수신 중...');
    const videoBlob = await this.fetchStreamBlob(targetVideoUrl!, (p, msg) => onProgress(25 + Math.round(p * 0.35), `[비디오] ${msg}`));

    onProgress(62, '오디오 트랙을 브라우저 메모리로 수신 중...');
    const audioBlob = await this.fetchStreamBlob(targetAudioUrl, (p, msg) => onProgress(62 + Math.round(p * 0.2), `[오디오] ${msg}`));

    const targetExt = options.videoFormat === 'default' ? 'mp4' : options.videoFormat;
    onProgress(84, '사용자 컴퓨터 자원(FFmpeg WASM)으로 비디오+오디오 고속 합성 중...');

    const mergedBlob = await ffmpegService.mergeVideoAndAudio(
      videoBlob,
      audioBlob,
      targetExt,
      (p, msg) => onProgress(84 + Math.round(p * 0.15), msg),
      onLog
    );

    onProgress(100, '다운로드 완료!');
    return {
      blob: mergedBlob,
      filename: `${sanitizedTitle}.${targetExt}`,
    };
  }

  /**
   * Fetch stream data blob with CORS proxy wrapper and chunk-by-chunk progress tracking
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
    const contentType = res.headers.get('content-type') || 'video/mp4';
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
    } else {
      const buffer = await res.arrayBuffer();
      chunks.push(new Uint8Array(buffer));
    }

    return new Blob(chunks as any[], { type: contentType });
  }
}
