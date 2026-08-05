import React, { useState, useEffect } from 'react';
import { Download, Loader2, Settings, AlertTriangle, CheckCircle, Cloud, HelpCircle, HardDrive, Cpu } from 'lucide-react';
import { YouTubeService, YouTubeVideoInfo } from './services/youtubeService';
import { BrowserMediaService } from './services/browserMediaService';

export function App() {
  const [url, setUrl] = useState('');
  const [quality, setQuality] = useState<string>(() => {
    return localStorage.getItem('qdown-quality') || 'best';
  });
  const [downloadType, setDownloadType] = useState<'video' | 'audio' | 'video_only'>(() => {
    return (localStorage.getItem('qdown-download-type') as any) || 'video';
  });
  const [videoFormat, setVideoFormat] = useState<string>(() => {
    return localStorage.getItem('qdown-video-format') || 'default';
  });
  const [audioFormat, setAudioFormat] = useState<string>(() => {
    return localStorage.getItem('qdown-audio-format') || 'default';
  });
  const [audioBitrate, setAudioBitrate] = useState<string>(() => {
    return localStorage.getItem('qdown-audio-bitrate') || 'best';
  });
  const [downloadSubtitles, setDownloadSubtitles] = useState<boolean>(() => {
    return localStorage.getItem('qdown-download-subtitles') === 'true';
  });
  const [showAdvanced, setShowAdvanced] = useState<boolean>(() => {
    return localStorage.getItem('qdown-show-advanced') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('qdown-quality', quality);
    localStorage.setItem('qdown-download-type', downloadType);
    localStorage.setItem('qdown-video-format', videoFormat);
    localStorage.setItem('qdown-audio-format', audioFormat);
    localStorage.setItem('qdown-audio-bitrate', audioBitrate);
    localStorage.setItem('qdown-download-subtitles', String(downloadSubtitles));
    localStorage.setItem('qdown-show-advanced', String(showAdvanced));
  }, [quality, downloadType, videoFormat, audioFormat, audioBitrate, downloadSubtitles, showAdvanced]);

  const [status, setStatus] = useState<'idle' | 'starting' | 'downloading' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [videoPreview, setVideoPreview] = useState<YouTubeVideoInfo | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeployGuideOpen, setIsDeployGuideOpen] = useState(false);

  // Fetch YouTube thumbnail preview on URL change
  useEffect(() => {
    const videoId = YouTubeService.extractVideoId(url);
    if (videoId) {
      YouTubeService.getVideoInfo(url).then(info => {
        setVideoPreview(info);
      }).catch(() => {
        setVideoPreview(null);
      });
    } else {
      setVideoPreview(null);
    }
  }, [url]);

  const startDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setStatus('starting');
    setProgress(0);
    setError(null);
    setStatusMessage('유튜브 영상 정보를 분석하는 중...');

    try {
      const result = await YouTubeService.downloadVideo(
        url,
        {
          quality,
          downloadType,
          videoFormat,
          audioFormat,
          audioBitrate,
        },
        (prog, stat) => {
          setStatus('downloading');
          setProgress(prog);
          setStatusMessage(stat);
        }
      );

      setStatus('completed');
      setProgress(100);
      setStatusMessage('다운로드 완료!');

      // Trigger client-side browser file save
      BrowserMediaService.downloadBlob(result.blob, result.filename);

      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
      }, 5000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '다운로드 중 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  const isMainActive = (id: string) => {
    if (id === 'audio') {
      return downloadType === 'audio';
    } else {
      return downloadType !== 'audio' && quality === id;
    }
  };

  return (
    <div className="pdf-app" data-theme="dark" style={{ paddingTop: '32px' }}>
      {/* Custom Titlebar (Exact qDown App Titlebar) */}
      <div className="pdf-titlebar">
        <div className="pdf-titlebar-left">
          <button
            type="button"
            className="pdf-titlebar-settings-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="설정"
          >
            <Settings size={14} style={{ color: 'var(--color-functional-red)' }} />
          </button>
          <span className="pdf-titlebar-center" style={{ marginLeft: '8px' }}>qDown</span>
        </div>
        <div className="pdf-titlebar-right"></div>
      </div>

      {/* Settings Modal (Exact qDown App Settings) */}
      {isSettingsOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="pdf-panel pdf-animate-fade-in"
            style={{
              width: '90%',
              maxWidth: '450px',
              backgroundColor: 'var(--color-bg-primary)',
              borderRadius: '8px',
              padding: '24px',
              boxShadow: 'var(--shadow-hardware-bevel), 0 10px 25px -5px rgba(0,0,0,0.5)',
              margin: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pdf-panel-header pdf-flex-row pdf-justify-between pdf-items-center" style={{ marginBottom: '16px', paddingBottom: '12px' }}>
              <h2 className="pdf-text-heading-24" style={{ fontSize: '18px', fontWeight: 700 }}>설정 및 크레딧</h2>
              <button
                type="button"
                className="pdf-text-label-14-mono"
                style={{
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  border: 'none',
                  background: 'transparent',
                  padding: '4px',
                }}
                onClick={() => setIsSettingsOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="pdf-flex-col pdf-gap-200">
              {/* 1. Download Location Selection */}
              <div className="pdf-flex-col pdf-gap-050">
                <span className="pdf-text-label-14-mono pdf-text-muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>다운로드 저장 경로</span>
                <div className="pdf-flex-row pdf-gap-100 pdf-items-center" style={{ marginTop: '4px' }}>
                  <div
                    className="pdf-code-block pdf-selectable"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      overflowX: 'auto',
                      whiteSpace: 'nowrap',
                      fontSize: '12px',
                      border: '1px solid var(--color-border-default)',
                    }}
                  >
                    웹 브라우저 기본 다운로드 폴더
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-default)', margin: '4px 0' }} />

              {/* 2. Credits */}
              <div className="pdf-flex-col pdf-gap-100">
                <span className="pdf-text-label-14-mono pdf-text-muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>크레딧 (Credits)</span>
                <div className="pdf-flex-col pdf-gap-100" style={{ marginTop: '4px' }}>
                  <div className="pdf-flex-row pdf-justify-between pdf-items-center" style={{ fontSize: '13px' }}>
                    <span style={{ fontWeight: 600 }}>qDown Repository</span>
                    <a
                      href="https://github.com/qpi-labels/qdown"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--color-functional-red)', textDecoration: 'none', fontWeight: 'bold' }}
                    >
                      GitHub ↗
                    </a>
                  </div>
                  <div className="pdf-flex-row pdf-justify-between pdf-items-center" style={{ fontSize: '13px' }}>
                    <span style={{ fontWeight: 600 }}>PDF-DS Design System</span>
                    <a
                      href="https://github.com/qpi-labels/PDF-DS"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--color-functional-red)', textDecoration: 'none', fontWeight: 'bold' }}
                    >
                      GitHub ↗
                    </a>
                  </div>
                  <div className="pdf-flex-row pdf-justify-between pdf-items-center" style={{ fontSize: '13px' }}>
                    <span style={{ fontWeight: 600 }}>yt-dlp Core</span>
                    <a
                      href="https://github.com/yt-dlp/yt-dlp"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--color-functional-red)', textDecoration: 'none', fontWeight: 'bold' }}
                    >
                      GitHub ↗
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main View Container */}
      <div className="pdf-main-view">
        <div className="pdf-main-content pdf-flex-col pdf-items-center pdf-justify-center" style={{ minHeight: 'calc(100vh - 32px)', margin: '0 auto' }}>

          {/* Main Card Panel (Exact qDown App Panel) */}
          <div className="pdf-panel pdf-w-full" style={{ maxWidth: '600px' }}>
            <div className="pdf-panel-header pdf-flex-row pdf-items-center pdf-gap-150">
              <svg viewBox="0 0 512 512" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                <defs>
                  <filter id="logo-hardware-shadow" x="-10%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
                    <feDropShadow dx="0" dy="12" stdDeviation="0" floodColor="#09090B" floodOpacity="1" />
                  </filter>
                </defs>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M 160,96 H 312 C 347.3,96 376,124.7 376,160 H 416 V 370 C 416,400 396,420 366,420 H 336 C 316,420 300,404 300,384 V 350 H 160 C 124.7,350 96,321.3 96,286 V 160 C 96,124.7 124.7,96 160,96 Z M 236,156 C 280.2,156 316,191.8 316,236 C 316,280.2 280.2,316 236,316 C 191.8,316 156,280.2 156,236 C 156,191.8 191.8,156 236,156 Z"
                  fill="#AD1D1D"
                  stroke="#09090B"
                  strokeWidth="16"
                  strokeLinejoin="miter"
                  filter="url(#logo-hardware-shadow)"
                />
                <path
                  d="M 236,296 L 186,246 H 216 V 176 H 256 V 246 H 286 Z"
                  fill="#FFFFFF"
                  stroke="#09090B"
                  strokeWidth="14"
                  strokeLinejoin="miter"
                />
              </svg>
              <div className="pdf-flex-col">
                <div className="pdf-flex-row pdf-items-center pdf-gap-100">
                  <h1 className="pdf-text-heading-24">qDown - YouTube Downloader</h1>
                  <span className="pdf-badge pdf-badge-red" style={{ fontSize: '10px' }}>WEB</span>
                </div>
              </div>
            </div>

            <div className="pdf-p-200">
              <p className="pdf-text-copy-14 pdf-text-muted pdf-mb-300">
                아래 입력창에 유튜브 URL을 입력하여 영상을 다운로드하세요. (서버 없이 사용자 브라우저 자원으로 다운로드)
              </p>

              <form onSubmit={startDownload} className="pdf-flex-col pdf-gap-200">
                {/* YouTube URL Input Field */}
                <input
                  type="url"
                  className="pdf-input pdf-w-full"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={status === 'starting' || status === 'downloading'}
                  required
                />

                {/* Video Preview Card when valid YouTube URL is entered */}
                {videoPreview && (
                  <div
                    className="pdf-flex-row pdf-gap-150 pdf-items-center pdf-animate-fade-in"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border-default)',
                    }}
                  >
                    <img
                      src={videoPreview.thumbnail}
                      alt={videoPreview.title}
                      style={{ width: '80px', height: '45px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <div className="pdf-flex-col" style={{ overflow: 'hidden' }}>
                      <span className="pdf-text-label-14-mono" style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {videoPreview.title}
                      </span>
                      <span className="pdf-text-copy-13-mono pdf-text-muted">{videoPreview.author}</span>
                    </div>
                  </div>
                )}

                {/* Quality Selection Pill Buttons (Exact qDown App Styling) */}
                <div className="pdf-flex-col pdf-gap-050">
                  <label className="pdf-text-label-14-mono pdf-text-muted">Quality</label>
                  <div
                    className="pdf-flex-row"
                    style={{
                      display: 'flex',
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: '10px',
                      padding: '4px',
                      gap: '4px',
                      width: '100%',
                      overflowX: 'auto',
                      opacity: status === 'starting' || status === 'downloading' ? 0.6 : 1,
                      pointerEvents: status === 'starting' || status === 'downloading' ? 'none' : 'auto',
                    }}
                  >
                    {[
                      { id: 'best', label: 'Best (최고 화질)' },
                      { id: '1080p', label: '1080p' },
                      { id: '720p', label: '720p' },
                      { id: 'audio', label: 'Audio Only' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`pdf-btn-primary ${isMainActive(opt.id) ? '' : 'pdf-secondary-btn'}`}
                        style={{
                          flex: 1,
                          height: '36px',
                          padding: '0 12px',
                          fontSize: '13px',
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                          ...(isMainActive(opt.id)
                            ? { backgroundColor: 'var(--color-functional-red)', color: '#ffffff' }
                            : { backgroundColor: 'transparent', border: 'none', color: 'var(--color-text-secondary)' }),
                        }}
                        onClick={() => {
                          if (opt.id === 'audio') {
                            setDownloadType('audio');
                            setQuality('best');
                          } else {
                            setDownloadType('video');
                            setQuality(opt.id);
                          }
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Settings Toggle */}
                <div className="pdf-flex-row pdf-items-center pdf-justify-between" style={{ marginTop: '4px' }}>
                  <label className="pdf-flex-row pdf-items-center pdf-gap-050 pdf-cursor-pointer" style={{ fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={showAdvanced}
                      onChange={(e) => setShowAdvanced(e.target.checked)}
                      style={{ accentColor: 'var(--color-functional-red)', cursor: 'pointer' }}
                    />
                    <span className="pdf-text-label-14-mono pdf-text-muted">고급 옵션 설정 (Advanced Options)</span>
                  </label>
                </div>

                {/* Advanced Settings Panel */}
                {showAdvanced && (
                  <div
                    className="pdf-flex-col pdf-gap-150 pdf-animate-fade-in"
                    style={{
                      border: '1px solid var(--color-border-default)',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: 'var(--color-bg-secondary)',
                      margin: 0,
                    }}
                  >
                    {/* 1. Download Type */}
                    <div className="pdf-flex-col pdf-gap-050">
                      <label className="pdf-text-label-14-mono pdf-text-muted" style={{ fontSize: '11px' }}>다운로드 타입 (Download Type)</label>
                      <div className="pdf-flex-row pdf-gap-150" style={{ marginTop: '4px', flexWrap: 'wrap' }}>
                        {[
                          { id: 'video', label: '비디오 + 오디오' },
                          { id: 'audio', label: '오디오만 추출' },
                          { id: 'video_only', label: '비디오만 추출' },
                        ].map((typeOpt) => (
                          <label key={typeOpt.id} className="pdf-flex-row pdf-items-center pdf-gap-050 pdf-cursor-pointer" style={{ fontSize: '13px' }}>
                            <input
                              type="radio"
                              name="downloadType"
                              value={typeOpt.id}
                              checked={downloadType === typeOpt.id}
                              onChange={() => {
                                setDownloadType(typeOpt.id as any);
                                if (typeOpt.id === 'audio') setQuality('best');
                              }}
                              disabled={status === 'starting' || status === 'downloading'}
                              style={{ accentColor: 'var(--color-functional-red)', cursor: 'pointer' }}
                            />
                            <span className="pdf-text-copy-14" style={{ color: 'var(--color-text-primary)' }}>{typeOpt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 2. Quality Selection */}
                    {(downloadType === 'video' || downloadType === 'video_only') && (
                      <div className="pdf-flex-col pdf-gap-050">
                        <label className="pdf-text-label-14-mono pdf-text-muted" style={{ fontSize: '11px' }}>상세 화질 (Video Quality)</label>
                        <select
                          className="pdf-input pdf-w-full"
                          style={{ maxWidth: '100%', padding: '6px 12px', height: '36px', borderRadius: '6px', fontSize: '13px' }}
                          value={quality}
                          onChange={(e) => setQuality(e.target.value)}
                          disabled={status === 'starting' || status === 'downloading'}
                        >
                          <option value="best">Best (최고 화질)</option>
                          <option value="2160p">2160p (4K UHD)</option>
                          <option value="1440p">1440p (2K QHD)</option>
                          <option value="1080p">1080p (Full HD)</option>
                          <option value="720p">720p (HD)</option>
                          <option value="480p">480p (SD)</option>
                          <option value="360p">360p (SD)</option>
                        </select>
                      </div>
                    )}

                    {/* 3. Video Format */}
                    {(downloadType === 'video' || downloadType === 'video_only') && (
                      <div className="pdf-flex-col pdf-gap-050">
                        <label className="pdf-text-label-14-mono pdf-text-muted" style={{ fontSize: '11px' }}>비디오 컨테이너 포맷 (Video Format)</label>
                        <select
                          className="pdf-input pdf-w-full"
                          style={{ maxWidth: '100%', padding: '6px 12px', height: '36px', borderRadius: '6px', fontSize: '13px' }}
                          value={videoFormat}
                          onChange={(e) => setVideoFormat(e.target.value)}
                          disabled={status === 'starting' || status === 'downloading'}
                        >
                          <option value="default">기본값 (Default - MP4)</option>
                          <option value="mp4">MP4 (.mp4)</option>
                          <option value="mkv">MKV (.mkv)</option>
                          <option value="webm">WEBM (.webm)</option>
                        </select>
                      </div>
                    )}

                    {/* 4. Audio Format */}
                    {downloadType === 'audio' && (
                      <div className="pdf-flex-col pdf-gap-050">
                        <label className="pdf-text-label-14-mono pdf-text-muted" style={{ fontSize: '11px' }}>오디오 저장 포맷 (Audio Format)</label>
                        <select
                          className="pdf-input pdf-w-full"
                          style={{ maxWidth: '100%', padding: '6px 12px', height: '36px', borderRadius: '6px', fontSize: '13px' }}
                          value={audioFormat}
                          onChange={(e) => setAudioFormat(e.target.value)}
                          disabled={status === 'starting' || status === 'downloading'}
                        >
                          <option value="default">기본값 (Default - MP3)</option>
                          <option value="mp3">MP3 (.mp3)</option>
                          <option value="m4a">M4A (.m4a)</option>
                          <option value="wav">WAV (.wav)</option>
                        </select>
                      </div>
                    )}

                    {/* 5. Audio Bitrate */}
                    {downloadType === 'audio' && (
                      <div className="pdf-flex-col pdf-gap-050">
                        <label className="pdf-text-label-14-mono pdf-text-muted" style={{ fontSize: '11px' }}>오디오 비트레이트 (Audio Bitrate)</label>
                        <select
                          className="pdf-input pdf-w-full"
                          style={{ maxWidth: '100%', padding: '6px 12px', height: '36px', borderRadius: '6px', fontSize: '13px' }}
                          value={audioBitrate}
                          onChange={(e) => setAudioBitrate(e.target.value)}
                          disabled={status === 'starting' || status === 'downloading'}
                        >
                          <option value="best">최고 음질 (Best)</option>
                          <option value="320">320 kbps (초고음질)</option>
                          <option value="256">256 kbps (고음질)</option>
                          <option value="192">192 kbps (일반)</option>
                          <option value="128">128 kbps (저용량)</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="pdf-text-copy-14 pdf-text-red pdf-bg-red" style={{ padding: '12px', borderRadius: '4px', backgroundColor: 'var(--color-red-light)' }}>
                    {error}
                  </div>
                )}

                {/* Download Progress & Status */}
                {(status === 'starting' || status === 'downloading' || status === 'completed') && (
                  <div className="pdf-flex-col pdf-gap-100 pdf-mt-100">
                    <div className="pdf-flex-row pdf-justify-between pdf-items-center">
                      <span className="pdf-text-label-14-mono pdf-text-muted">
                        {statusMessage || (status === 'starting' ? '시작하는 중...' : status === 'downloading' ? '다운로드 및 수신 중...' : '완료!')}
                      </span>
                      <span className="pdf-text-label-14-mono">{progress.toFixed(1)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${progress}%`,
                          height: '100%',
                          backgroundColor: 'var(--color-functional-red)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Primary Download Button (Exact qDown App Button) */}
                <button
                  type="submit"
                  className="pdf-btn-primary pdf-btn-lg pdf-w-full pdf-mt-100"
                  disabled={status === 'starting' || status === 'downloading'}
                >
                  {status === 'starting' || status === 'downloading' ? (
                    <>
                      <Loader2 size={18} className="pdf-animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Download Video
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* 사용자 요청 푸터 영역 (Desktop App 100% 동일) */}
            <div className="pdf-mt-400 pdf-pt-200 pdf-border-top" style={{ marginTop: '32px', paddingTop: '16px' }}>
              <div className="pdf-text-label-14-mono pdf-text-muted pdf-mb-050">
                <a
                  href="https://github.com/qpi-labels/qdown"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                >
                  View on GitHub ↗
                </a>
              </div>
              <div className="pdf-text-label-14-mono pdf-text-muted">
                <a
                  href="https://github.com/qpi-labels/qdown/releases"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                >
                  더 빠른 qDown 앱 다운로드 ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;
