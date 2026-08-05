export interface FrameCaptureResult {
  blob: Blob;
  dataUrl: string;
  timestamp: number;
  width: number;
  height: number;
}

export class BrowserMediaService {
  /**
   * Captures a single image frame (PNG/JPEG) from a video at a specific timestamp in seconds using HTML5 Canvas.
   */
  static async captureFrame(
    videoElement: HTMLVideoElement,
    timestamp: number,
    format: 'image/png' | 'image/jpeg' = 'image/png',
    quality: number = 0.95
  ): Promise<FrameCaptureResult> {
    return new Promise((resolve, reject) => {
      const originalTime = videoElement.currentTime;

      const onSeeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = videoElement.videoWidth || 1920;
          canvas.height = videoElement.videoHeight || 1080;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            videoElement.currentTime = originalTime;
            reject(new Error('Canvas 2D Context 생성 실패'));
            return;
          }

          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

          const dataUrl = canvas.toDataURL(format, quality);

          canvas.toBlob(
            (blob) => {
              videoElement.currentTime = originalTime;
              if (blob) {
                resolve({
                  blob,
                  dataUrl,
                  timestamp,
                  width: canvas.width,
                  height: canvas.height,
                });
              } else {
                reject(new Error('Canvas Blob 생성 실패'));
              }
            },
            format,
            quality
          );
        } catch (err) {
          videoElement.currentTime = originalTime;
          reject(err);
        } finally {
          videoElement.removeEventListener('seeked', onSeeked);
        }
      };

      videoElement.addEventListener('seeked', onSeeked, { once: true });
      videoElement.currentTime = timestamp;
    });
  }

  /**
   * Helper to format seconds to HH:MM:SS or MM:SS string
   */
  static formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (h > 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms)}`;
    }
    return `${pad(m)}:${pad(s)}.${pad(ms)}`;
  }

  /**
   * Helper to trigger instant file download in browser
   */
  static downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
