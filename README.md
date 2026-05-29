# qdown - A Simple GUI for yt-dlp

qdown is a simple and user-friendly Graphical User Interface (GUI) wrapper for the powerful `yt-dlp` command-line tool. It allows you to easily download YouTube videos in various qualities without having to use the terminal.

## ✨ Features
- 🚀 **Simple UI**: Clean and intuitive React-based interface.
- ⚙️ **Quality Selection**: Choose between 1080p, 720p, 480p, or Audio Only.
- 📦 **Standalone Executable**: No need to install Node.js or Python. Runs out of the box.
- 🤖 **Auto yt-dlp Download**: Automatically fetches the latest version of `yt-dlp` on the first run.
- 💻 **Cross-Platform**: Available for Windows and macOS (Intel/Apple Silicon).

---

## 📥 Installation & Usage

You don't need to install anything! Just download the pre-built version for your operating system.

### For Windows Users
1. Go to the **[Releases](../../releases)** page.
2. Download `release-windows.zip` and extract it.
3. Open the extracted folder and double-click **`start.bat`**.
   *(Note: A black terminal window will open to run the server, and your web browser will automatically open the qdown interface.)*

### For macOS Users
1. Go to the **[Releases](../../releases)** page.
2. Download the appropriate `.zip` file for your Mac:
   - `release-mac-arm64.zip` (for Apple Silicon M1/M2/M3 chips)
   - `release-mac-x64.zip` (for Intel chips)
3. Extract the `.zip` file.
4. Open the extracted folder and double-click **`start.command`**.
   *(Note: You might need to grant permission to run the file in System Settings > Privacy & Security).*

---

## 🛠️ For Developers (Build from source)

If you want to modify the code or build the executables yourself, follow these steps:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/qdown.git
cd qdown
npm install
```

### 2. Run in Development Mode
To start both the Vite React frontend and the Express backend simultaneously:
```bash
npm run dev
```

### 3. Build Release Packages
To compile the source code and generate the standalone executables for Windows and Mac, simply run:
```bash
npm run build:release
```
This will automatically:
1. Build the frontend (`dist`).
2. Bundle the backend server (`dist-server/server.cjs`).
3. Package the app using `pkg` into standalone executables.
4. Organize the final files into `release-windows`, `release-mac-x64`, and `release-mac-arm64` folders, complete with startup scripts.

---

## 📝 License
This project is open-source and available under the MIT License.
