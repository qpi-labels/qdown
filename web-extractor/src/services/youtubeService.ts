import { ffmpegService } from './ffmpegService';

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  author: string;
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
   * Download YouTube video completely on the client side using Piped & Invidious CORS-enabled stream APIs
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

    onProgress(15, 'CORS 허용 미디어 스트림 검색 중...');

    // Public Piped & Invidious API instances with open CORS headers (Access-Control-Allow-Origin: *)
    const pipedInstances = [
      'https://api.piped.video',
      'https://pipedapi.kavin.rocks',
      'https://pipedapi.tokhmi.xyz',
      'https://piped-api.garudalinux.org',
    ];

    const invidiousInstances = [
      'https://inv.tux.pizza',
      'https://invidious.drgns.space',
      'https://invidious.projectsegfau.lt',
    ];

    let targetVideoUrl: string | null = null;
    let targetAudioUrl: string | null = null;
    let selectedTitle = sanitizedTitle;

    // 1. Try Piped API Instances
    for (const instance of pipedInstances) {
      try {
        onProgress(20, `스트림 서버 연결 중 (${new URL(instance).hostname})...`);
        const res = await fetch(`${instance}/streams/${videoId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.title) selectedTitle = data.title.replace(/[\\/:*?"<>|]/g, '_');

          if (options.downloadType === 'audio') {
            // Find highest quality audio stream
            const audioStreams = data.audioStreams || [];
            if (audioStreams.length > 0) {
              // Sort by bitrate descending
              audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
              targetAudioUrl = audioStreams[0].url;
            }
          } else {
            // Video download
            const videoStreams = data.videoStreams || [];
            const targetQualityNum = options.quality === 'best' ? 2160 : parseInt(options.quality.replace('p', ''), 10) || 1080;

            // Search combined stream or video stream
            const sortedVideos = videoStreams.sort((a: any, b: any) => Math.abs((a.height || 0) - targetQualityNum) - Math.abs((b.height || 0) - targetQualityNum));
            if (sortedVideos.length > 0) {
              targetVideoUrl = sortedVideos[0].url;
            }

            // Find audio stream for merging if separate
            const audioStreams = data.audioStreams || [];
            if (audioStreams.length > 0) {
              audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
              targetAudioUrl = audioStreams[0].url;
            }
          }

          if (targetAudioUrl || targetVideoUrl) {
            break;
          }
        }
      } catch (err) {
        console.warn(`Piped instance ${instance} failed, trying next...`);
      }
    }

    // 2. Fallback: Invidious API Instances
    if (!targetVideoUrl && !targetAudioUrl) {
      for (const instance of invidiousInstances) {
        try {
          onProgress(25, `보조 스트림 서버 연결 중 (${new URL(instance).hostname})...`);
          const res = await fetch(`${instance}/api/v1/videos/${videoId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.title) selectedTitle = data.title.replace(/[\\/:*?"<>|]/g, '_');

            if (options.downloadType === 'audio') {
              const adaptiveFormats = data.adaptiveFormats || [];
              const audioFormats = adaptiveFormats.filter((f: any) => f.type && f.type.includes('audio'));
              if (audioFormats.length > 0) {
                audioFormats.sort((a: any, b: any) => (parseInt(b.bitrate || '0', 10) - parseInt(a.bitrate || '0', 10)));
                targetAudioUrl = audioFormats[0].url;
              }
            } else {
              const formatStreams = data.formatStreams || [];
              if (formatStreams.length > 0) {
                targetVideoUrl = formatStreams[0].url;
              } else {
                const adaptiveFormats = data.adaptiveFormats || [];
                const videoFormats = adaptiveFormats.filter((f: any) => f.type && f.type.includes('video'));
                if (videoFormats.length > 0) targetVideoUrl = videoFormats[0].url;

                const audioFormats = adaptiveFormats.filter((f: any) => f.type && f.type.includes('audio'));
                if (audioFormats.length > 0) targetAudioUrl = audioFormats[0].url;
              }
            }

            if (targetAudioUrl || targetVideoUrl) break;
          }
        } catch (err) {
          console.warn(`Invidious instance ${instance} failed...`);
        }
      }
    }

    // Check if stream was found
    if (!targetVideoUrl && !targetAudioUrl) {
      throw new Error('스트림 다운로드 주소를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }

    // 3. Perform Download into Client-Side RAM Memory
    if (options.downloadType === 'audio' && targetAudioUrl) {
      onProgress(35, '오디오 스트림 브라우저 수신 중...');
      const audioBlob = await this.fetchStreamBlob(targetAudioUrl, (p, msg) => onProgress(35 + Math.round(p * 0.45), msg));

      const ext = options.audioFormat === 'default' ? 'mp3' : options.audioFormat;
      if (ext === 'mp3' || ext === 'm4a') {
        onProgress(85, '오디오 트랙 저장 처리 중...');
        onProgress(100, '다운로드 완료!');
        return { blob: audioBlob, filename: `${selectedTitle}.${ext}` };
      }

      onProgress(85, 'FFmpeg WASM 오디오 변환 중...');
      const tempFile = new File([audioBlob], `temp.m4a`);
      const convertedBlob = await ffmpegService.extractAudio(
        tempFile,
        ext,
        options.audioBitrate === 'best' ? '320k' : options.audioBitrate,
        (p, msg) => onProgress(85 + Math.round(p * 0.15), msg),
        onLog
      );
      onProgress(100, '다운로드 완료!');
      return { blob: convertedBlob, filename: `${selectedTitle}.${ext}` };
    }

    // Video Download Logic
    if (targetVideoUrl) {
      onProgress(35, '비디오 스트림 수신 중...');
      const videoBlob = await this.fetchStreamBlob(targetVideoUrl, (p, msg) => onProgress(35 + Math.round(p * 0.45), msg));

      const targetExt = options.videoFormat === 'default' ? 'mp4' : options.videoFormat;

      onProgress(90, '비디오 패키징 중...');
      onProgress(100, '다운로드 완료!');
      return {
        blob: videoBlob,
        filename: `${selectedTitle}.${targetExt}`,
      };
    }

    throw new Error('다운로드 가능한 미디어 스트림을 찾을 수 없습니다.');
  }

  /**
   * Helper to fetch direct stream with progress tracking
   */
  private static async fetchStreamBlob(
    streamUrl: string,
    onProgress: (progressPercentage: number, message: string) => void
  ): Promise<Blob> {
    const res = await fetch(streamUrl);
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
