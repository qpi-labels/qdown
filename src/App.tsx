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
      