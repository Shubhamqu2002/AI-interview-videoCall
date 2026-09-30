# Architecture and reuse

## Responsibilities

React -> PeerRoom -> RTCPeerConnection handles media.
React -> Socket.IO -> Node room service handles session negotiation and chat.
Peer A <-> Peer B carries encrypted audio/video directly when possible.
Peer A <-> your TURN relay <-> Peer B carries media when a direct path fails.

The Node application does not decode video and does not forward raw media over Socket.IO. Chat is deliberately server-relayed for simple room history. Transport is encrypted in deployment with HTTPS/WSS, but room chat is visible to your server; it is not an end-to-end encrypted messaging feature.

## Room protocol

1. POST `/api/rooms` allocates an unpredictable room ID and invitation key.
2. Browser obtains camera/microphone permissions and connects Socket.IO.
3. Client emits `join` with roomId, roomKey, name and consent.
4. Server validates the invitation, capacity and age; returns selfId, rtcConfig and recent messages.
5. Server broadcasts `peers`. Each client creates a connection to the other member.
6. `signal` carries descriptions and ICE candidates only between authorized members of the same room.
7. Perfect negotiation assigns polite/impolite roles by socket-ID order, handles simultaneous offers and queues early ICE candidates.
8. The initial offerer reserves three transceiver slots: microphone, camera, screen video. The answerer attaches its tracks to the offered slots instead of creating duplicates.
9. Screen start/stop replaces the dedicated screen sender track; camera transmission continues.
10. `media` broadcasts mute/camera/sharing/consent/recording status. `chat` has a server-assigned sender, ID and timestamp.
11. Disconnect removes the member. Socket.IO reconnect creates a new socket ID; the controller rejoins and creates a fresh media connection.

## Reuse without React

`PeerRoom.js` depends on browser APIs, socket.io-client and the local recorder adapter, not React. Instantiate it with `onChange(snapshot)` and `onError(message)` callbacks. Methods:

- `join({roomId, roomKey, name, consent})`
- `toggleMic()`, `toggleCamera()`
- `startScreen()`, `stopScreen()`
- `sendChat(text)`
- `setMedia({consent: true/false})`
- `startRecording()`, `stopRecording()`
- `restartIce()`, `leave()`

Render the snapshot's local/remote MediaStreams with `video.srcObject`. Always call leave when destroying the view. The sample uses same-origin Socket.IO; to use a separate domain, explicitly configure the io URL and corresponding CORS/origin policy, and proxy securely. Never copy TURN_SECRET into client environment variables.

For another React project, move the `rtc` directory plus a small UI adapter, install socket.io-client, and reuse the room service or implement the same protocol. Do not try to open one PeerRoom instance for several rooms. Start a new instance after leave.

## Integrating with your application later

Replace public room creation with authenticated application routes. Have your backend authorize the appointment/interview and issue participant-specific credentials. Bind identity and allowed room to server-side claims, not a user-provided display name. Keep room membership authorization on EVERY relay operation.

An invitation is deliberately the POC's access credential; ALLOWED_ORIGINS/CORS is not identity authentication. A non-browser client can send an Origin header. Production needs account authentication, quotas, abuse prevention, observability, audited dependencies and access controls for retained recordings.

For the AI interviewer, a Python/Go media participant cannot simply speak this application's custom signaling protocol without an adapter. Build a server-side WebRTC endpoint that negotiates compatible tracks/codecs and joins the room, then attach STT, turn detection, the LLM and TTS. Reuse interview business logic separately. This ZIP intentionally contains no AI worker and does not change your LiveKit project.

For three or more participants at scale, use a self-hosted SFU architecture. Increasing the room size from 2 is not enough: the present controller stores exactly one remote peer. An SFU integration changes session setup and media routing.

## Recording design

The recorder renders camera/screen video onto a 1280x720 canvas at a requested 24 fps and uses Web Audio to mix the two microphones. MediaRecorder encodes the canvas plus mixed audio into WebM. Audio sources are connected to the recorder destination, not speakers; the remote video element separately plays incoming sound.

Recording starts only with two connected consenting participants. Revocation or participant departure finalizes the current file. The UI shows download links; no file is uploaded. Browser memory and background scheduling make this appropriate for short POC sessions, not guaranteed full-interview archiving. For durable recording, design authenticated server-side recording with retention, failure recovery and access control as a separate phase.

## Sources

Checked while preparing the POC, 29 September 2026:

- WebRTC perfect negotiation: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
- Screen capture: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
- MediaRecorder: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- coturn configuration: https://github.com/coturn/coturn/blob/master/examples/etc/turnserver.conf
- WebRTC peer connections: https://webrtc.org/getting-started/peer-connections
