# Verification of this package

Verified during preparation on 29 September 2026:

- `npm run build`: passed.
- `npm test`: passed. The integration scenario checks origin rejection, same-origin polling, invalid room keys, room capacity, authorized signaling, cross-room isolation, chat validation, consent state and TURN credential signing.
- `npm run test:browser`: passed using headless Chromium with fake camera/microphone devices and a synthetic screen source. Real RTCPeerConnection media flowed between two isolated browser contexts. Incoming audio packets were checked on both sides.
- Browser scenario: video rendering, chat, mute/unmute, camera off/on, screen track replacement, local recording/download, consent revocation, ICE restart, leave/rejoin and mobile-width overflow. No uncaught page errors.
- Downloaded WebM inspected with ffprobe: VP9 video at 1280x720 and an Opus audio stream.
- Lobby, call and mobile screenshots visually inspected.

The execution host has only a loopback interface. Browser automation therefore enabled the Chromium loopback-peer flag. This flag is confined to tests; the application does not require special browser flags on normal computers.

Not verified here: real webcam/microphone quality, the operating-system screen picker, deployed coturn, TURN/TLS, HTTPS/DNS provisioning, real cross-network connectivity, long-duration recording, high-concurrency performance or mobile screen capture. Run the manual acceptance checklist before integrating the POC into a real project.

No application server or TURN service has been deployed for you. The existing AI interviewer / LiveKit code has not been changed.
