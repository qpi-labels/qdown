# qDown Web (YouTube Downloader)

서버 없이 100% 사용자의 브라우저/컴퓨터 자원(FFmpeg WebAssembly & Canvas Media API)만을 활용하여 비디오 구간 자르기, 오디오 추출(MP3/WAV/AAC), GIF 애니메이션 생성, 포맷 변환 및 용량 압축을 수행하는 웹 어플리케이션입니다.

qDown 앱과 **100% 동일한 PDF-DS 다크 모드 디자인 시스템**으로 제작되었습니다.

---

## 🚀 주요 특징

1. **Zero-Backend (100% Client-Side)**
   - 업로드된 영상이나 처리 결과가 외부 서버로 전송되지 않으며, 사용자 컴퓨터의 CPU/GPU 멀티스레드 자원으로 브라우저 내부에서만 인코딩 및 처리됩니다.
2. **Cloudflare Pages 최적화**
   - WebAssembly 멀티스레드 인코딩 필수 헤더 (`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`)가 포함된 `public/_headers`가 기본 제공됩니다.
3. **다양한 영상 처리 모드**
   - **영상 자르기 (Trim & Clip)**: 시각 설정 타임라인 슬라이더로 구간 추출
   - **오디오 추출 (Extract Audio)**: MP3 (320k~128k), WAV, AAC, M4A 오디오 트랙 추출
   - **프레임 / GIF 생성**: 타임라인 instant 프레임 스냅샷 캡처 및 애니메이션 GIF 생성
   - **변환 & 용량 압축 (Convert & Compress)**: MP4, WEBM 변환, CRF 화질 조절 및 해상도 변경

---

## 🛠️ 개발 및 빌드 방법

### 1. 패키지 설치
`web-extractor` 폴더로 이동 후 패키지를 설치합니다:
```bash
cd web-extractor
npm install
```

### 2. 로컬 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3001` 로 접속합니다.

### 3. Cloudflare Pages 배포용 정적 빌드
```bash
npm run build
```
빌드가 완료되면 `web-extractor/dist` 폴더가 생성됩니다.

---

## ☁️ Cloudflare Pages 배포 방법 (1분 완료)

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)에 로그인합니다.
2. **Workers & Pages** ➡ **Create application** ➡ **Pages** ➡ **Upload assets** 클릭.
3. 프로젝트 이름 입력 후, 생성된 `web-extractor/dist` 폴더 전체를 파일 업로드 상자에 드래그 & 드롭합니다.
4. **Save and Deploy** 버튼을 클릭하면 즉시 배포되어 무료 SSL 도메인이 제공됩니다!
