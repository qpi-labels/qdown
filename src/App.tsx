import React, { useState, useEffect } from 'react';
import { Download, Loader2, Settings } from 'lucide-react';

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;


function App() {
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
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const [downloadDir, setDownloadDir] = useState<string>(() => {
    return localStorage.getItem('qdown-download-dir') || '';
  });
  const [defaultDir, setDefaultDir] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    fetch('/api/download/default-dir')
      .then(res => res.json())
      .then(data => {
        if (data.defaultDir) {
          setDefaultDir(data.defaultDir);
        }
      })
      .catch(err => console.error('Failed to fetch default dir:', err));
  }, []);

  const handleSelectDirectory = async () => {
    if (isElectron) {
      try {
        const currentDefault = downloadDir || defaultDir;
        const selected = await (window as any).electronAPI.selectDirectory(currentDefault);
        if (selected) {
          setDownloadDir(selected);
          localStorage.setItem('qdown-download-dir', selected);
        }
      } catch (err) {
        console.error('Failed to select directory:', err);
      }
    }
  };

  const startDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setStatus('starting');
    setProgress(0);
    setError(null);
    setJobId(null);

    try {
      const response = await fetch('/api/download/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url, 
          quality,
          downloadType,
          videoFormat,
          audioFormat,
          audioBitrate,
          downloadSubtitles,
          downloadDir: downloadDir || defaultDir || undefined
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error('서버와 연결할 수 없습니다. (Proxy 오류)');
        }
        throw new Error(errorData.error || '다운로드 시작에 실패했습니다.');
      }

      const data = await response.json();
      setJobId(data.jobId);
    } catch (err: any) {
      setError(err.message || '다운로드 시작 중 에러가 발생했습니다.');
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const evtSource = new EventSource(`/api/download/stream/${jobId}`);

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setStatus(data.status);
        setProgress(data.progress || 0);

        if (data.status === 'completed') {
          evtSource.close();
          // 백엔드에서 준비 완료되면 실제 파일을 다운로드 받습니다 (웹 환경만).
          if (!isElectron) {
            window.location.href = `/api/download/file/${jobId}`;
          }
          
          // 다운로드 실행 후 UI 상태 초기화
          setTimeout(() => {
            setStatus('idle');
            setProgress(0);
            setUrl('');
          }, 3000);
        } else if (data.status === 'error') {
          setError(data.error || '알 수 없는 이유로 다운로드에 실패했습니다.');
          evtSource.close();
        }
      } catch (e) {
        console.error("SSE 데이터 파싱 에러", e);
      }
    };

    evtSource.onerror = () => {
      setError("서버와의 연결이 끊어졌습니다.");
      setStatus('error');
      evtSource.close();
    };

    return () => {
      evtSource.close();
    };
  }, [jobId]);

  const isMainActive = (id: string) => {
    if (id === 'audio') {
      return downloadType === 'audio';
    } else {
      return downloadType !== 'audio' && quality === id;
    }
  };

  return (
    <div className="pdf-app" style={{ paddingTop: '32px' }}>
      {/* Custom Titlebar */}
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
        </div>
        <div className="pdf-titlebar-center">qDown</div>
        {isElectron && (
          <div className="pdf-titlebar-right">
            <button
              type="button"
              className="pdf-titlebar-win-btn"
              onClick={() => (window as any).electronAPI.minimize()}
              title="최소화"
            >
              <svg width="10" height="1" viewBox="0 0 10 1">
                <rect width="10" height="1" fill="currentColor" />
              </svg>
            </button>
            <button
              type="button"
              className="pdf-titlebar-win-btn"
              onClick={() => (window as any).electronAPI.maximize()}
              title="최대화"
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
            </button>
            <button
              type="button"
              className="pdf-titlebar-win-btn pdf-titlebar-close-btn"
              onClick={() => (window as any).electronAPI.close()}
              title="닫기"
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path d="M 0,0 L 10,10 M 10,0 L 0,10" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
              boxShadow: 'var(--shadow-hardware-bevel), 0 10px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              margin: 0
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
                  padding: '4px'
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
                      border: '1px solid var(--color-border-default)'
                    }}
                    title={downloadDir || defaultDir}
                  >
                    {downloadDir || defaultDir || '로드 중...'}
                  </div>
                  {isElectron && (
                    <button
                      type="button"
                      className="pdf-secondary-btn"
                      style={{ height: '34px', padding: '0 12px', fontSize: '12px', flexShrink: 0 }}
                      onClick={handleSelectDirectory}
                    >
                      변경
                    </button>
                  )}
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

              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-default)', margin: '4px 0' }} />

              {/* 3. App Actions (Uninstall) */}
              <div className="pdf-flex-col pdf-gap-050">
                <span className="pdf-text-label-14-mono pdf-text-muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>앱 관리</span>
                <div className="pdf-flex-row pdf-justify-between pdf-items-center" style={{ marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>프로그램 삭제</span>
                  <button
                    type="button"
                    className="pdf-btn-primary pdf-btn-xs"
                    style={{ 
                      backgroundColor: 'var(--color-functional-red)', 
                      color: '#ffffff',
                      height: '32px',
                      padding: '0 12px',
                      fontSize: '12px'
                    }}
                    onClick={() => {
                      if (confirm('qDown 앱을 컴퓨터에서 삭제(제거)하시겠습니까?')) {
                        if (isElectron) {
                          (window as any).electronAPI.uninstall();
                        } else {
                          alert('웹 브라우저 환경에서는 직접 삭제할 수 없습니다.');
                        }
                      }
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pdf-main-view">
        <div className="pdf-main-content pdf-flex-col pdf-items-center pdf-justify-center" style={{ minHeight: 'calc(100vh - 32px)', margin: '0 auto' }}>
          
          <div className="pdf-panel pdf-w-full" style={{ maxWidth: '600px' }}>
            <div className="pdf-panel-header pdf-flex-row pdf-items-center pdf-gap-150">
              <svg viewBox="0 0 512 512" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                <defs>
                  <filter id="logo-hardware-shadow" x="-10%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
                    <feDropShadow dx="0" dy="12" stdDeviation="0" floodColor="#09090B" floodOpacity="1"/>
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
              <h1 className="pdf-text-heading-24">QDown - YouTube Downloader</h1>
            </div>
            
            <div className="pdf-p-200">
              <p className="pdf-text-copy-14 pdf-text-muted pdf-mb-300">
                아래 입력창에 유튜브 URL을 입력하여 영상을 다운로드하세요.
              </p>

              <form onSubmit={startDownload} className="pdf-flex-col pdf-gap-200">
                <input
                  type="url"
                  className="pdf-input pdf-w-full"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={status === 'starting' || status === 'downloading'}
                  required
                />

                <div className="pdf-flex-col pdf-gap-050">
                  <label className="pdf-text-label-14-mono pdf-text-muted">Quality</label>
                  <div className="pdf-flex-row" style={{ 
                    display: 'flex', 
                    backgroundColor: 'var(--color-bg-secondary)', 
                    border: '1px solid var(--color-border-default)', 
                    borderRadius: '10px', 
                    padding: '4px', 
                    gap: '4px', 
                    width: '100%', 
                    overflowX: 'auto',
                    opacity: (status === 'starting' || status === 'downloading') ? 0.6 : 1,
                    pointerEvents: (status === 'starting' || status === 'downloading') ? 'none' : 'auto'
                  }}>
                    {[
                      { id: 'best', label: 'Best (최고 화질)' },
                      { id: '1080p', label: '1080p' },
                      { id: '720p', label: '720p' },
                      { id: 'audio', label: 'Audio Only' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          if (opt.id === 'audio') {
                            setDownloadType('audio');
                            setQuality('best');
                          } else {
                            setDownloadType('video');
                            setQuality(opt.id);
                          }
                        }}
                        disabled={status === 'starting' || status === 'downloading'}
                        style={{
                          flex: 1,
                          padding: '8px 16px',
                          borderRadius: '6px',
                          backgroundColor: isMainActive(opt.id) ? 'var(--color-bg-primary)' : 'transparent',
                          color: isMainActive(opt.id) ? 'var(--color-functional-red)' : 'var(--color-text-secondary)',
                          boxShadow: isMainActive(opt.id) ? 'var(--shadow-hardware-bevel)' : 'none',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <span className="pdf-text-label-14-mono" style={{ fontWeight: isMainActive(opt.id) ? '700' : '400' }}>
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Settings Toggle */}
                <div className="pdf-flex-row pdf-justify-end" style={{ marginTop: '-8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="pdf-secondary-btn pdf-btn-sm"
                    style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)', height: 'auto', padding: '4px 8px' }}
                  >
                    <Settings size={14} />
                    <span className="pdf-text-label-14-mono" style={{ fontSize: '12px' }}>고급 설정 {showAdvanced ? '접기 ▲' : '열기 ▼'}</span>
                  </button>
                </div>

                {/* Advanced Settings Panel */}
                {showAdvanced && (
                  <div className="pdf-flex-col pdf-gap-150 pdf-animate-fade-in" style={{ 
                    border: '1px solid var(--color-border-default)', 
                    borderRadius: '8px', 
                    padding: '16px',
                    backgroundColor: 'var(--color-bg-secondary)',
                    margin: 0
                  }}>
                    {/* 1. Download Type */}
                    <div className="pdf-flex-col pdf-gap-050">
                      <label className="pdf-text-label-14-mono pdf-text-muted" style={{ fontSize: '11px' }}>다운로드 타입 (Download Type)</label>
                      <div className="pdf-flex-row pdf-gap-150" style={{ marginTop: '4px', flexWrap: 'wrap' }}>
                        {[
                          { id: 'video', label: '비디오 + 오디오' },
                          { id: 'audio', label: '오디오만 추출' },
                          { id: 'video_only', label: '비디오만 추출' }
                        ].map(typeOpt => (
                          <label key={typeOpt.id} className="pdf-flex-row pdf-items-center pdf-gap-050 pdf-cursor-pointer" style={{ fontSize: '13px' }}>
                            <input
                              type="radio"
                              name="downloadType"
                              value={typeOpt.id}
                              checked={downloadType === typeOpt.id}
                              onChange={() => {
                                setDownloadType(typeOpt.id as any);
                                if (typeOpt.id === 'audio') {
                                  setQuality('best');
                                }
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
                          <option value="opus">OPUS (.opus)</option>
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

                    {/* 6. Subtitles */}
                    {(downloadType === 'video' || downloadType === 'video_only') && (
                      <div className="pdf-flex-row pdf-items-center pdf-gap-050 pdf-cursor-pointer" style={{ marginTop: '4px' }}>
                        <input
                          type="checkbox"
                          id="downloadSubtitles"
                          checked={downloadSubtitles}
                          onChange={(e) => setDownloadSubtitles(e.target.checked)}
                          disabled={status === 'starting' || status === 'downloading'}
                          style={{ accentColor: 'var(--color-functional-red)', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="downloadSubtitles" className="pdf-text-copy-14 pdf-cursor-pointer" style={{ fontWeight: '500', fontSize: '13px', color: 'var(--color-text-primary)' }}>
                          자막 다운로드 및 영상에 내장 (한국어/영어 자막)
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="pdf-text-copy-14 pdf-text-red pdf-bg-red" style={{ padding: '12px', borderRadius: '4px', backgroundColor: 'var(--color-red-light)' }}>
                    {error}
                  </div>
                )}

                {(status === 'starting' || status === 'downloading' || status === 'completed') && (
                  <div className="pdf-flex-col pdf-gap-100 pdf-mt-100">
                    <div className="pdf-flex-row pdf-justify-between pdf-items-center">
                      <span className="pdf-text-label-14-mono pdf-text-muted">
                        {status === 'starting' ? '시작하는 중...' : 
                         status === 'downloading' ? '추출하는 중...' : 
                         '완료!'}
                      </span>
                      <span className="pdf-text-label-14-mono">{progress.toFixed(1)}%</span>
                    </div>
                    {/* 가로 진행 바 (Horizontal Progress Bar) */}
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${progress}%`, 
                        height: '100%', 
                        backgroundColor: 'var(--color-functional-red)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="pdf-btn-primary pdf-btn-lg pdf-w-full pdf-mt-100"
                  disabled={status === 'starting' || status === 'downloading'}
                >
                  {status === 'starting' || status === 'downloading' ? (
                    <>
                      <Loader2 size={18} className="pdf-animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
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
            
            {/* 사용자 요청 푸터 영역 */}
            <div className="pdf-mt-400 pdf-pt-200 pdf-border-top" style={{ marginTop: '32px', paddingTop: '16px' }}>
              <div className="pdf-text-label-14-mono pdf-text-muted pdf-mb-050">
                <a href="https://github.com/yt-dlp/yt-dlp" target="_blank" rel="noreferrer"
                  style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}>View on GitHub ↗</a>
              </div>
              <div className="pdf-text-label-14-mono pdf-text-muted">
                Made with yt-dlp
              </div>
            </div>

          </div>
          
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
