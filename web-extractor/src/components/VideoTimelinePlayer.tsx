import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Scissors, Camera, RotateCcw, Volume2, VolumeX, Clock } from 'lucide-react';
import { BrowserMediaService } from '../services/browserMediaService';

interface VideoTimelinePlayerProps {
  videoUrl: string | null;
  startTime: number;
  endTime: number;
  onRangeChange: (start: number, end: number) => void;
  onVideoLoaded: (duration: number, width: number, height: number, element: HTMLVideoElement) => void;
  onInstantSnapshot: (blob: Blob, dataUrl: string, timestamp: number) => void;
}

export const VideoTimelinePlayer: React.FC<VideoTimelinePlayerProps> = ({
  videoUrl,
  startTime,
  endTime,
  onRangeChange,
  onVideoLoaded,
  onInstantSnapshot,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      const w = videoRef.current.videoWidth;
      const h = videoRef.current.videoHeight;
      setDuration(dur);
      onRangeChange(0, dur);
      onVideoLoaded(dur, w, h, videoRef.current);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);

      // Loop preview within selected range if playing
      if (endTime > 0 && videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime;
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const handleStartSet = () => {
    const newStart = Math.min(currentTime, endTime - 0.5);
    onRangeChange(Math.max(0, newStart), endTime);
  };

  const handleEndSet = () => {
    const newEnd = Math.max(currentTime, startTime + 0.5);
    onRangeChange(startTime, Math.min(duration, newEnd));
  };

  const handleTakeSnapshot = async () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    try {
      const result = await BrowserMediaService.captureFrame(videoRef.current, currentTime);
      onInstantSnapshot(result.blob, result.dataUrl, result.timestamp);
    } catch (err) {
      console.error('Instant frame capture failed:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!videoUrl) return null;

  return (
    <div className="pdf-panel" style={{ padding: '20px' }}>
      <div className="pdf-panel-header pdf-flex-row pdf-justify-between pdf-items-center">
        <div className="pdf-flex-row pdf-items-center pdf-gap-100">
          <Clock size={18} style={{ color: 'var(--color-functional-red)' }} />
          <span className="pdf-text-label-16" style={{ fontWeight: 700 }}>
            2. 타임라인 미리보기 & 구간 선택 (Interactive Player)
          </span>
        </div>
        <button
          onClick={handleTakeSnapshot}
          disabled={isCapturing}
          className="pdf-btn-primary pdf-btn-sm"
          style={{ height: '32px', fontSize: '12px' }}
        >
          <Camera size={14} />
          {isCapturing ? '캡처 중...' : '현재 프레임 스냅샷 캡처'}
        </button>
      </div>

      {/* Video Preview Element */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          backgroundColor: '#000000',
          borderRadius: '8px',
          overflow: 'hidden',
          aspectRatio: '16/9',
          maxHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--color-border-default)',
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          muted={isMuted}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </div>

      {/* Main Playback Bar */}
      <div className="pdf-flex-col pdf-gap-150 pdf-mt-200">
        <div className="pdf-flex-row pdf-items-center pdf-gap-150">
          <button
            onClick={togglePlay}
            className="pdf-btn-primary"
            style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0 }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
          </button>

          <span className="pdf-text-label-14-mono" style={{ minWidth: '130px' }}>
            {BrowserMediaService.formatTime(currentTime)} / {BrowserMediaService.formatTime(duration)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            style={{
              flex: 1,
              accentColor: 'var(--color-functional-red)',
              cursor: 'pointer',
            }}
          />

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="pdf-secondary-btn"
            style={{ width: '36px', height: '36px', padding: 0 }}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <select
            value={playbackRate}
            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
            className="pdf-input"
            style={{ width: '70px', height: '36px', padding: '0 8px', fontSize: '12px' }}
          >
            <option value={0.5}>0.5x</option>
            <option value={1.0}>1.0x</option>
            <option value={1.5}>1.5x</option>
            <option value={2.0}>2.0x</option>
          </select>
        </div>

        {/* Range Selector Controls */}
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--color-border-default)',
          }}
          className="pdf-flex-col pdf-gap-100"
        >
          <div className="pdf-flex-row pdf-justify-between pdf-items-center">
            <span className="pdf-text-label-14-mono pdf-text-muted" style={{ fontSize: '12px' }}>
              추출/자르기 선택 구간 (Selected Range):
            </span>
            <span className="pdf-text-label-14-mono pdf-text-red" style={{ fontWeight: 700 }}>
              {BrowserMediaService.formatTime(startTime)} ~ {BrowserMediaService.formatTime(endTime)} (총 {(endTime - startTime).toFixed(1)}초)
            </span>
          </div>

          <div className="pdf-flex-row pdf-gap-150 pdf-items-center">
            <button
              onClick={handleStartSet}
              className="pdf-secondary-btn pdf-btn-sm"
              style={{ fontSize: '12px' }}
            >
              <Scissors size={13} />
              시작 지점으로 설정 ({BrowserMediaService.formatTime(currentTime)})
            </button>

            <button
              onClick={handleEndSet}
              className="pdf-secondary-btn pdf-btn-sm"
              style={{ fontSize: '12px' }}
            >
              <Scissors size={13} />
              종료 지점으로 설정 ({BrowserMediaService.formatTime(currentTime)})
            </button>

            <button
              onClick={() => onRangeChange(0, duration)}
              className="pdf-secondary-btn pdf-btn-sm"
              style={{ fontSize: '12px' }}
            >
              <RotateCcw size={13} />
              전체 구간 재설정
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
