# qdown - yt-dlp를 위한 심플한 GUI

qdown은 강력한 기능을 자랑하는 `yt-dlp` 커맨드라인 툴을 누구나 쉽게 사용할 수 있도록 만든 직관적인 그래픽 유저 인터페이스(GUI) 프로그램입니다. 복잡한 터미널 명령어 없이 유튜브 동영상을 원하는 화질로 손쉽게 다운로드하세요.

## 🌟 크레딧 (Credits)
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)**: 이 프로젝트의 핵심 엔진입니다. qdown은 `yt-dlp`의 훌륭한 기능들을 쉽게 사용하기 위한 껍데기(Wrapper)일 뿐이며, 모든 다운로드 처리와 동영상 파싱은 전적으로 위대한 `yt-dlp` 오픈소스 프로젝트 덕분입니다.
- **디자인 시스템**: 이 앱의 깔끔하고 일관된 사용자 인터페이스(UI)는 **[pdf-ds](https://github.com/qpi-labels/pdf-ds)** 디자인 시스템의 철학과 규칙을 기반으로 제작되었습니다.

## ✨ 주요 기능
- 🚀 **심플한 UI**: React 기반의 깔끔하고 직관적인 인터페이스를 제공합니다.
- ⚙️ **화질 선택**: 1080p, 720p, 480p 비디오 및 오디오 전용(Audio Only) 다운로드를 지원합니다.
- 📦 **단일 실행 파일**: Node.js나 Python을 설치할 필요 없이 바로 실행할 수 있습니다.
- 🤖 **yt-dlp 자동 다운로드**: 프로그램을 처음 실행할 때 최신 버전의 `yt-dlp`를 자동으로 다운로드하여 설정합니다.
- 💻 **크로스 플랫폼 지원**: Windows 및 macOS (Intel/Apple Silicon) 운영체제를 모두 지원합니다.

---

## 📥 설치 및 사용 방법

별도의 프로그램 설치 과정이 필요 없습니다! 사용 중인 운영체제에 맞는 파일을 다운로드하기만 하면 됩니다.

### Windows 사용자
1. **[Releases](../../releases)** 페이지로 이동합니다.
2. `release-windows.zip` 파일을 다운로드하고 압축을 풉니다.
3. 압축을 푼 폴더 안에서 **`start.bat`** 파일을 더블 클릭하여 실행합니다.
   *(참고: 서버 구동을 위해 검은색 터미널 창이 열리며, 곧이어 웹 브라우저가 자동으로 켜지면서 qdown 화면이 나타납니다.)*

### macOS 사용자
1. **[Releases](../../releases)** 페이지로 이동합니다.
2. 사용 중인 Mac의 프로세서에 맞는 `.zip` 파일을 다운로드합니다:
   - `release-mac-arm64.zip` (Apple Silicon M1/M2/M3 칩셋)
   - `release-mac-x64.zip` (Intel 칩셋)
3. 다운로드한 `.zip` 파일의 압축을 풉니다.
4. 압축을 푼 폴더 안에서 **`start.command`** 파일을 더블 클릭하여 실행합니다.
   *(참고: 실행 권한 문제로 앱이 열리지 않을 경우, '시스템 설정 > 개인정보 보호 및 보안' 탭에서 확인 및 허용을 눌러주세요.)*

---

## 🛠️ 개발자용 가이드 (직접 빌드하기)

코드를 수정하거나 실행 파일을 직접 빌드하고 싶다면 아래 과정을 따라주세요:

### 요구 사항
- [Node.js](https://nodejs.org/) (v18 이상 권장)

### 1. 코드 다운로드 및 패키지 설치
```bash
git clone https://github.com/qpi-labels/qdown.git
cd qdown
npm install
```

### 2. 개발 모드로 실행
프론트엔드(Vite)와 백엔드(Express) 서버를 동시에 개발 모드로 실행합니다:
```bash
npm run dev
```

### 3. 릴리즈 패키지 생성
소스 코드를 빌드하고 Windows 및 Mac용 단일 실행 파일을 생성하려면 아래 명령어를 한 줄만 입력하시면 됩니다:
```bash
npm run build:release
```
이 명령어는 자동으로 다음 작업들을 수행합니다:
1. 프론트엔드 빌드 (`dist` 폴더 생성)
2. 백엔드 서버 번들링 (`dist-server/server.cjs` 생성)
3. `pkg` 패키저를 사용하여 독립적인 앱 실행 파일 생성
4. 최종 결과물과 실행 스크립트를 `release-windows`, `release-mac-x64`, `release-mac-arm64` 폴더별로 깔끔하게 분리하여 저장

---

## 📝 라이선스
이 프로젝트는 오픈 소스이며 MIT 라이선스 규정을 따릅니다.

<br>

<div align="center">
  <a href="https://github.com/qpi-labels/pdf-ds">
    <img src="./pdf-ds.svg" alt="pdf-ds" width="100%" />
  </a>
</div>
