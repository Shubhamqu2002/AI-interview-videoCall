# Step-by-step Windows setup

## 1. Prepare the computer

Install Node.js 24 LTS from https://nodejs.org/ and desktop Chrome or Edge. Restart your terminal after installing Node. Use a connected webcam and microphone; the initial POC requires both.

Extract the project ZIP to a simple path, for example:

`C:\Users\acer\Desktop\webrtc-poc`

The folder you enter must contain `package.json`; Windows Extract All can create an additional folder with the same name.

```powershell
cd C:\Users\acer\Desktop\webrtc-poc
node --version
npm --version
```

If npm is blocked by PowerShell's script policy, use `npm.cmd` for all following npm commands. You do not need to change your machine's security policy.

## 2. Install and configure

```powershell
Copy-Item .env.example .env
npm ci
```

Leave the environment defaults unchanged for the first same-computer test. There is no LiveKit key, public STUN service or paid API in this project. TURN settings stay empty until the internet deployment stage.

## 3. Run the project

```powershell
npm run dev
```

Leave this terminal running. It starts two processes:

- Frontend: http://localhost:5173
- Signaling: http://127.0.0.1:3001

Vite forwards /api and /socket.io to Node, so the browser uses a single frontend origin. Ctrl+C stops both processes. Restart after changing .env.

## 4. Start the first participant

1. Open http://localhost:5173 in Chrome/Edge.
2. Enter `Shubham` as the name.
3. Optionally check the recording permission checkbox.
4. Click **Create a room**.
5. Allow microphone and camera permission.
6. Your camera preview appears. Click **Copy invite**.

The URL fragment contains both the room identifier and its secret invitation key. Keep the complete link. Do not post it publicly.

## 5. Join the second participant

1. Open an Incognito/InPrivate browser window on the same computer.
2. Paste the complete copied invitation into its address bar.
3. Enter a different name.
4. Select recording permission if you want to test recording.
5. Click **Join room** and allow camera/microphone.
6. Both windows should say **Connected** and show both video tiles.

Use headphones and mute one microphone when testing on the same physical computer to avoid feedback. Some webcams cannot be opened by two browser sessions at once. If so, use two cameras or proceed to two-device HTTPS testing; it is not necessarily a signaling bug.

## 6. Test every feature

- **Mute mic:** mute in one window and verify silence in the other.
- **Camera off:** the other window shows the camera-off state. Turn it back on.
- **Chat:** send messages in both directions. They should appear in both room panels.
- **Share screen:** select a window, tab or desktop in the browser's real picker. The camera stays on. The other participant sees a separate screen tile.
- **Stop sharing:** use either the app button or the browser's sharing indicator. The shared tile disappears while the call remains connected.
- **Record call:** both connected users must enable **Allow recording**. Start recording on one side. The other side sees the recording banner. Speak, then share a screen. Stop recording and click the download link.
- Open the downloaded WebM in Chrome or a WebM-compatible player. Check both voices and the expected video layout.
- Revoke recording permission in the other window: the recording should stop and become downloadable.
- **Leave/rejoin:** leave on one side and rejoin using the same link. The remaining participant stays in the room.
- Try joining from a third window: it should report that the room is full.

If a browser blocks autoplay, use the **Play audio / video** button over the tile.

## 7. Test the built version

Stop the development command with Ctrl+C, then run:

```powershell
npm run build
npm start
```

Open http://localhost:3001 and create a NEW room there. A previous :5173 invite belongs to a different origin. The production build and signaling now share port 3001.

## 8. Run the supplied tests

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Browser tests start their own server on 4178; keep that port free. Screenshots and a short recording are written under `test-results/`. Fake media tests do not replace manual device/network acceptance.

## 9. Move to another physical device

`localhost` always means the computer opening the link. A localhost invite cannot be used from someone else's laptop or phone.

Do not simply switch to `http://192.168.x.x:5173`: browser camera/microphone access normally requires a secure context, and HTTP localhost is only a local development exception.

The supported next step is a domain with trusted HTTPS and your own public TURN server. Follow DEPLOYMENT.md. Desktop screen capture remains the target; mobile browser screen sharing is not guaranteed.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `npm` not recognized | Reopen the terminal; verify Node installation and PATH |
| `npm.ps1` execution error | Use `npm.cmd ci` / `npm.cmd run dev` |
| Address already in use | Stop the older dev process on 3001/5173; do not start duplicates |
| Permission denied | Browser site permissions and Windows Privacy > Camera / Microphone |
| Camera busy / NotReadableError | Close Teams/Zoom/other camera applications; test another webcam |
| Signaling cannot connect | Node process, exact ALLOWED_ORIGINS, reverse proxy and server logs |
| Video works locally but fails on another network | Add/verify TURN, public address mapping and UDP relay ports |
| Recording button disabled | Both users connected and both consent boxes checked |
| Shared screen but no computer sound | Expected: this version sends screen video and microphone audio only |
| Recording download lost on refresh | Expected POC limitation: save files before refreshing |
| Old room link invalid after restart | Rooms are in memory; create a fresh room |
