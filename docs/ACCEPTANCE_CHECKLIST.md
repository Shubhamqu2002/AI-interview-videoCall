# Acceptance checklist

## Automated

Run `npm test`, then `npm run build`, then `npm run test:browser` after installing Playwright Chromium.

- Correct/incorrect room invitations and two-person capacity.
- Cross-room signaling blocked.
- Chat validation and sender identity assigned by server.
- Temporary TURN credential signature (unit/integration check, not a real TURN call).
- Two browser contexts establish media with fake camera/microphone devices.
- Bidirectional camera rendering, chat, mute and camera state.
- Synthetic display track received remotely.
- Record to non-empty WebM and expose a download.
- Revoke consent to stop recording.
- Media reconnect and leave/rejoin.
- Basic mobile-width overflow check.

## Manual — required before calling the POC accepted

1. Actual webcams and microphones on two physical machines; headphones; inspect both directions.
2. Actual OS screen picker: tab, window and entire desktop; stop from browser UI.
3. Record both voices; play back downloaded file and check audio/video sync.
4. Test recording with no share, local share and remote share. Record visible tab only.
5. Verify mute, camera-off, participant departure and consent revocation during recording.
6. Two separate networks in normal ICE mode.
7. Force relay and confirm TURN path in the UI.
8. Force TURN/TLS only and verify it separately.
9. Check HTTPS certificate and microphone/camera permission behavior.
10. Network interruption and recovery; browser refresh/rejoin; signaling server restart.
11. Long-session memory/CPU/bandwidth measurement with your hardware and target browser.
12. Browser/platform coverage: desktop Chrome/Edge first. Validate Safari/Firefox individually before promising support. Mobile OS screen sharing is not guaranteed.

Do not treat a successful localhost or synthetic-media run as evidence that real TURN infrastructure, microphone quality or production capacity is verified.
