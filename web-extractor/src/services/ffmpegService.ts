import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface ProgressCallback {
  (progress: number, message: string): void;
}

export interface LogCallback {
  (log: string): void;
}

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private isLoading = false;

  async load(onProgress?: ProgressCallback, onLog?: LogCallback): Promise<FFmpeg> {
    if (this.isLoaded && this.ffmpeg) {
      return this.ffmpeg;
    }

    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      if (this.ffmpeg && this.isLoaded) return this.ffmpeg;
    }

    this.isLoading = true;
    onProgress?.(5, 'FFmpeg WebAssembly 코어 엔진 로드 중...');

    try {
      this.ffmpeg = new FFmpeg();

      this.ffmpeg.on('log', ({ message }) => {
        if (onLog) onLog(message);
      });

      this.ffmpeg.on('progress', ({ progress }) => {
        const percent = Math.min(Math.max(Math.round(progress * 100), 0), 100);
        if (onProgress) onProgress(percent, `처리 중... ${percent}%`);
      });

      // Load FFmpeg core WASM from unpkg / jsdelivr CDN
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.isLoaded = true;
      this.isLoading = false;
      onProgress?.(100, 'FFmpeg 엔진 준비 완료!');
      return this.ffmpeg;
    } catch (error: any) {
      this.isLoading = false;
      console.error('FFmpeg WASM Load Error:', error);
      throw new Error(`FFmpeg 엔진을 로드하지 못했습니다: ${error?.message || error}`);
    }
  }

  // 1. Trim / Clip Video
  async trimVideo(
    file: File,
    startTime: number, // seconds
    endTime: number,   // seconds
    outputFormat: string = 'mp4',
    onProgress?: ProgressCallback,
    onLog?: LogCallback
  ): Promise<Blob> {
    const ffmpeg = await this.load(onProgress, onLog);
    const inputName = `input_${Date.now()}.${this.getFileExtension(file.name)}`;
    const outputName = `output_${Date.now()}.${outputFormat}`;

    onProgress?.(10, '파일을 브라우저 가상 메모리로 전송 중...');
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    onProgress?.(25, '영상 구간 자르기 처리 중...');
    const duration = endTime - startTime;

    // Command: ffmpeg -ss startTime -i inputName -t duration -c copy outputName
    await ffmpeg.exec([
      '-ss', startTime.toFixed(2),
      '-i', inputName,
      '-t', duration.toFixed(2),
      '-c', 'copy',
      outputName
    ]);

    onProgress?.(90, '결과 파일 추출 중...');
    const data = await ffmpeg.readFile(outputName);
    
    // Cleanup
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    const mimeType = outputFormat === 'mp4' ? 'video/mp4' : outputFormat === 'webm' ? 'video/webm' : 'video/x-matroska';
    return new Blob([new Uint8Array(data as Uint8Array)], { type: mimeType });
  }

  // 2. Extract Audio (MP3, WAV, AAC)
  async extractAudio(
    file: File,
    audioFormat: string = 'mp3',
    bitrate: string = '192k',
    onProgress?: ProgressCallback,
    onLog?: LogCallback
  ): Promise<Blob> {
    const ffmpeg = await this.load(onProgress, onLog);
    const inputName = `input_${Date.now()}.${this.getFileExtension(file.name)}`;
    const outputName = `output_${Date.now()}.${audioFormat}`;

    onProgress?.(10, '영상에서 오디오 트랙을 메모리로 읽는 중...');
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    onProgress?.(30, `${audioFormat.toUpperCase()} 오디오 인코딩 중... (${bitrate})`);

    const args = ['-i', inputName, '-vn'];

    if (audioFormat === 'mp3') {
      args.push('-c:a', 'libmp3lame', '-b:a', bitrate);
    } else if (audioFormat === 'wav') {
      args.push('-c:a', 'pcm_s16le');
    } else if (audioFormat === 'aac' || audioFormat === 'm4a') {
      args.push('-c:a', 'aac', '-b:a', bitrate);
    }

    args.push(outputName);
    await ffmpeg.exec(args);

    onProgress?.(95, '오디오 파일 저장 중...');
    const data = await ffmpeg.readFile(outputName);

    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    const mimeMap: Record<string, string> = {
      mp3: 'audio/mp3',
      wav: 'audio/wav',
      aac: 'audio/aac',
      m4a: 'audio/mp4',
    };

    return new Blob([new Uint8Array(data as Uint8Array)], { type: mimeMap[audioFormat] || 'audio/mpeg' });
  }

  // 3. Extract Animated GIF
  async extractGif(
    file: File,
    startTime: number,
    endTime: number,
    fps: number = 10,
    width: number = 480,
    onProgress?: ProgressCallback,
    onLog?: LogCallback
  ): Promise<Blob> {
    const ffmpeg = await this.load(onProgress, onLog);
    const inputName = `input_${Date.now()}.${this.getFileExtension(file.name)}`;
    const outputName = `output_${Date.now()}.gif`;

    await ffmpeg.writeFile(inputName, await fetchFile(file));
    const duration = endTime - startTime;

    onProgress?.(30, 'GIF 애니메이션 인코딩 중...');
    // Generate high quality palette for GIF
    await ffmpeg.exec([
      '-ss', startTime.toFixed(2),
      '-i', inputName,
      '-t', duration.toFixed(2),
      '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos`,
      outputName
    ]);

    const data = await ffmpeg.readFile(outputName);
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    return new Blob([new Uint8Array(data as Uint8Array)], { type: 'image/gif' });
  }

  // 4. Convert & Compress Video
  async convertAndCompress(
    file: File,
    targetFormat: string = 'mp4',
    qualityPreset: 'high' | 'medium' | 'low' = 'medium',
    scaleWidth: number | null = null,
    onProgress?: ProgressCallback,
    onLog?: LogCallback
  ): Promise<Blob> {
    const ffmpeg = await this.load(onProgress, onLog);
    const inputName = `input_${Date.now()}.${this.getFileExtension(file.name)}`;
    const outputName = `output_${Date.now()}.${targetFormat}`;

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    onProgress?.(20, '포맷 변환 및 용량 압축 처리 중...');

    // Preset mapping
    const crfMap = { high: '23', medium: '28', low: '34' };
    const crf = crfMap[qualityPreset] || '28';

    const args = ['-i', inputName];

    if (scaleWidth) {
      args.push('-vf', `scale=${scaleWidth}:-2`);
    }

    if (targetFormat === 'mp4') {
      args.push('-c:v', 'libx264', '-crf', crf, '-preset', 'ultrafast', '-c:a', 'aac');
    } else if (targetFormat === 'webm') {
      args.push('-c:v', 'libvpx-vp9', '-crf', crf, '-b:v', '0', '-c:a', 'libvorbis');
    }

    args.push(outputName);
    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(outputName);
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    return new Blob([new Uint8Array(data as Uint8Array)], { type: `video/${targetFormat}` });
  }

  // 5. Merge Video + Audio Streams (Zero-Re-encode fast muxing using client CPU/WASM)
  async mergeVideoAndAudio(
    videoBlob: Blob,
    audioBlob: Blob,
    outputFormat: string = 'mp4',
    onProgress?: ProgressCallback,
    onLog?: LogCallback
  ): Promise<Blob> {
    const ffmpeg = await this.load(onProgress, onLog);
    const videoExt = videoBlob.type.includes('webm') ? 'webm' : 'mp4';
    const audioExt = audioBlob.type.includes('webm') ? 'webm' : audioBlob.type.includes('mp4') ? 'm4a' : 'm4a';
    const videoName = `video_${Date.now()}.${videoExt}`;
    const audioName = `audio_${Date.now()}.${audioExt}`;
    const outputName = `merged_${Date.now()}.${outputFormat}`;

    onProgress?.(10, '스트림 데이터를 브라우저 가상 메모리에 기록 중...');
    await ffmpeg.writeFile(videoName, await fetchFile(videoBlob));
    await ffmpeg.writeFile(audioName, await fetchFile(audioBlob));

    onProgress?.(40, '비디오와 오디오 트랙을 고속 합성(Muxing)하는 중...');

    const isInputWebm = videoExt === 'webm';
    const isOutputWebm = outputFormat === 'webm';

    const args: string[] = ['-i', videoName, '-i', audioName];

    if (isInputWebm && !isOutputWebm) {
      // VP9/WebM to MP4 container conversion
      args.push('-c:v', 'copy', '-c:a', 'aac', '-strict', 'experimental', '-shortest', outputName);
    } else if (isOutputWebm) {
      args.push('-c:v', 'copy', '-c:a', 'libopus', '-shortest', outputName);
    } else {
      args.push('-c:v', 'copy', '-c:a', 'aac', '-shortest', outputName);
    }

    try {
      await ffmpeg.exec(args);
    } catch (muxErr) {
      // Fallback: full copy
      await ffmpeg.exec(['-i', videoName, '-i', audioName, '-c', 'copy', outputName]);
    }

    onProgress?.(90, '완성된 영상 파일 추출 중...');
    const data = await ffmpeg.readFile(outputName);

    await ffmpeg.deleteFile(videoName);
    await ffmpeg.deleteFile(audioName);
    await ffmpeg.deleteFile(outputName);

    const mimeMap: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      mkv: 'video/x-matroska'
    };

    return new Blob([new Uint8Array(data as Uint8Array)], { type: mimeMap[outputFormat] || 'video/mp4' });
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop() || 'mp4';
  }
}

export const ffmpegService = new FFmpegService();
