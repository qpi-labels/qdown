import React, { useState, useEffect } from 'react';
import { Download, Loader2, Youtube } from 'lucide-react';

function App() {
  const [url, setUrl] = useState('');
  const [quality, setQuality] = useState('best');
  const [status, setStatus] = useState<'idle' | 'starting' | 'downloading' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

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
        body: JSON.stringify({ url, quality }),
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
          // 백엔드에서 준비 완료되면 실제 파일을 다운로드 받습니다.
          window.location.href = `/api/download/file/${jobId}`;
          
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

  return (
    <div className="pdf-app">
      <div className="pdf-main-view">
        <div className="pdf-main-content pdf-flex-col pdf-items-center pdf-justify-center" style={{ minHeight: '100vh', margin: '0 auto' }}>
          
          <div className="pdf-panel pdf-w-full" style={{ maxWidth: '600px' }}>
            <div className="pdf-panel-header pdf-flex-row pdf-items-center pdf-gap-150">
              <Youtube className="pdf-text-red" size={28} />
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
                  <select 
                    className="pdf-input" 
                    value={quality} 
                    onChange={(e) => setQuality(e.target.value)}
                    disabled={status === 'starting' || status === 'downloading'}
                  >
                    <option value="best">가장 좋은 화질 (Best Available)</option>
                    <option value="1080p">1080p</option>
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                    <option value="audio">오디오 전용 (Audio Only - m4a)</option>
                  </select>
                </div>

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
