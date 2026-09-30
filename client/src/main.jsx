import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { PeerRoom } from "./rtc/PeerRoom";
import "./styles.css";

function Icon({ name, ...props }) {
  const paths = {
    video: (
      <>
        <rect x="3" y="6" width="12" height="12" rx="3" />
        <path d="m15 10 6-3v10l-6-3" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    link: (
      <>
        <path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1" />
      </>
    ),
    screen: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8m-4-4v4m-3-11 3-3 3 3m-3-3v7" />
      </>
    ),
    chat: <path d="M20 11a8 8 0 0 1-8 8H4l1-4a8 8 0 1 1 15-4Z" />,
    record: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="2" width="6" height="13" rx="3" />
        <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
      </>
    ),
    phone: <path d="M3 15v-4c5-5 13-5 18 0v4l-5-1v-3a12 12 0 0 0-8 0v3z" />,
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" />
        <circle cx="15" cy="17" r="3" />
      </>
    ),
    check: <path d="m5 12 4 4 10-10" />,
  };
  return (
    <svg
      className="icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name] || paths.video}
    </svg>
  );
}

function Video({
  stream,
  muted = false,
  name,
  enabled = true,
  screen = false,
}) {
  const ref = useRef(null);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const video = ref.current;
    video.srcObject = stream || null;
    if (stream)
      video
        .play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    return () => {
      video.srcObject = null;
    };
  }, [stream]);
  return (
    <div className={`video-tile ${screen ? "screen-tile" : ""}`}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={enabled && stream ? "" : "hidden-video"}
      />
      {(!stream || !enabled) && (
        <div className="placeholder">
          <span>{name?.slice(0, 1).toUpperCase() || "?"}</span>
          <p>{stream ? "Camera is off" : "Waiting for video"}</p>
        </div>
      )}
      <div className="video-label">
        <i />
        {name}
      </div>
      {blocked && (
        <button
          className="play-button"
          onClick={() => ref.current.play().then(() => setBlocked(false))}
        >
          Play audio / video
        </button>
      )}
    </div>
  );
}

function CameraPicker({ cameras, value, onChange, refresh, disabled }) {
  return (
    <div className="camera-picker">
      <label htmlFor="camera-device">Camera device</label>
      <div>
        <select
          id="camera-device"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">Browser default camera</option>
          {cameras.map((camera, index) => (
            <option key={camera.deviceId || index} value={camera.deviceId}>
              {camera.label || `Camera ${index + 1}`}
            </option>
          ))}
        </select>
        <button type="button" disabled={disabled} onClick={refresh}>
          Refresh list
        </button>
      </div>
    </div>
  );
}

function App() {
  const [name, setName] = useState("");
  const [invite, setInvite] = useState(location.hash ? location.href : "");
  const [consent, setConsent] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState("");
  const [audioOnly, setAudioOnly] = useState(false);
  async function refreshDevices() {
    try {
      const devices = await navigator.mediaDevices?.enumerateDevices();
      setCameras(
        (devices || []).filter(
          (device) => device.kind === "videoinput" && device.deviceId,
        ),
      );
    } catch (error) {
      setError(`Could not list cameras: ${error.message}`);
    }
  }
  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener("devicechange", refreshDevices);
    return () =>
      navigator.mediaDevices?.removeEventListener(
        "devicechange",
        refreshDevices,
      );
  }, []);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [chat, setChat] = useState("");
  const [downloads, setDownloads] = useState([]);
  const [state, setState] = useState({
    peers: [],
    messages: [],
    status: "Ready",
    stats: {},
  });
  const controller = useRef(null);
  const chatEnd = useRef(null);
  useEffect(() => () => controller.current?.leave(), []);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest" });
  }, [state.messages.length]);
  useEffect(() => {
    const warn = (event) => {
      if (controller.current && !controller.current.disposed) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  async function enter(create) {
    setError("");
    setNotice("");
    if (!name.trim()) return setError("Enter your display name first.");
    setBusy(true);
    setPendingAction(create ? "create" : "join");
    try {
      let roomId, roomKey;
      if (create) {
        const response = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(
            `POST /api/rooms returned HTTP ${response.status}. ${result.error || "Check that npm run dev is running and open http://localhost:5173."}`,
          );
        ({ roomId, roomKey } = result);
      } else {
        const url = new URL(invite.trim());
        if (url.origin !== location.origin)
          throw new Error(
            "Open the invite on its original website, then join there.",
          );
        const params = new URLSearchParams(url.hash.slice(1));
        roomId = params.get("room");
        roomKey = params.get("key");
        if (!roomId || !roomKey)
          throw new Error("Paste the complete room invitation link.");
      }
      const url = new URL(location.origin + "/");
      url.hash = new URLSearchParams({ room: roomId, key: roomKey }).toString();
      history.replaceState(null, "", url);
      setInvite(url.href);
      const call = new PeerRoom({
        onChange: (snapshot) => {
          if (controller.current === call) setState(snapshot);
          if (snapshot.recordings.length)
            setDownloads((old) => [
              ...old,
              ...snapshot.recordings.filter(
                (r) => !old.some((o) => o.url === r.url),
              ),
            ]);
        },
        onError: (message) => setError(message),
      });
      controller.current = call;
      await call.join({
        roomId,
        roomKey,
        name: name.trim(),
        consent,
        cameraId,
        audioOnly,
      });
      await refreshDevices();
      setActive(true);
    } catch (err) {
      controller.current?.leave();
      setError(
        err.name === "NotAllowedError"
          ? "Camera or microphone permission was denied. Allow access in the browser and try again."
          : err.name === "NotFoundError"
            ? "A microphone is required. Connect one and retry."
            : err.message,
      );
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }
  async function action(fn) {
    setError("");
    try {
      await fn();
    } catch (err) {
      if (err.name !== "NotAllowedError") setError(err.message);
      else
        setNotice("Screen selection was cancelled or permission was denied.");
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(invite);
      setNotice("Invite copied. Share it with one person.");
    } catch {
      setNotice("Copy the invitation from the address bar.");
    }
  }
  function leave() {
    controller.current?.leave();
    setActive(false);
    setNotice(
      "Call ended. Download any recordings below before closing this page.",
    );
  }
  const remote = state.remoteMember;
  const canRecord =
    state.connection === "connected" &&
    state.peers.length === 2 &&
    state.peers.every((p) => p.consent);
  const peerRecording = state.peers.some(
    (p) => p.recording && p.id !== state.selfId,
  );
  return (
    <div className="app-shell">
      <header>
        <a className="brand" href={active ? undefined : "/"}>
          <span className="brand-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="6"
                width="12"
                height="12"
                rx="4"
                fill="currentColor"
              />
              <path d="m16 10 5-3v10l-5-3z" fill="currentColor" />
            </svg>
          </span>
          AI-Interview<span className="brand-light"> room</span>
        </a>

      </header>
      <main>
        {error && (
          <div className="banner error" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}
        {notice && (
          <div className="banner notice" role="status">
            {notice}
            <button onClick={() => setNotice("")} aria-label="Dismiss notice">
              ×
            </button>
          </div>
        )}
        {!active ? (
          <div className="lobby lobby-studio">
            <section className="studio-hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span />A LITTLE CLOSER, FROM ANYWHERE
                </div>
                <h1>
                  Good conversations.
                  <br />
                  <em>One simple room.</em>
                </h1>
                <p>
                  Meet face to face, share your screen, and keep the ideas
                  flowing.
                  <br className="desktop-break" /> Your next conversation is
                  just a link away.
                </p>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="art-person person-one">
                  <span>S</span>
                  <div className="art-wave">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
                <div className="art-person person-two">
                  <span>R</span>
                  <Icon name="video" />
                </div>
                <div className="art-bubble">
                  <Icon name="chat" />
                  <span>More than a meeting.</span>
                </div>
                <span className="art-spark spark-one">✳</span>
                <span className="art-spark spark-two">+</span>
              </div>
            </section>
            <div className="lobby-workspace">
              <section className="setup-card" aria-labelledby="setup-title">
                <div className="section-kicker">
                  <span>01</span> MAKE YOURSELF AT HOME
                </div>
                <h2 id="setup-title">
                  <Icon name="settings" />
                  Your setup
                </h2>
                <p className="section-description">
                  A few details before you connect.
                </p>
                <label className="field-label" htmlFor="name">
                  Your name
                </label>
                <input
                  id="name"
                  autoComplete="name"
                  maxLength={40}
                  placeholder="How should we call you?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
                <CameraPicker
                  cameras={cameras}
                  value={cameraId}
                  onChange={setCameraId}
                  refresh={refreshDevices}
                  disabled={busy}
                />
                <div className="preferences">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={audioOnly}
                      disabled={busy}
                      onChange={(e) => setAudioOnly(e.target.checked)}
                    />
                    <span>
                      Join without camera
                      <small>You can switch it on during the call.</small>
                    </span>
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={consent}
                      disabled={busy}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      Allow in-app recording of this call
                      <small>
                        Recording needs permission from both people.
                      </small>
                    </span>
                  </label>
                </div>
                <p className="setup-caption">
                  <Icon name="check" />
                  These settings apply to either option.
                </p>
              </section>
              <section className="room-choice" aria-labelledby="choice-title">
                <div className="choice-heading">
                  <div className="section-kicker">
                    <span>02</span> CHOOSE YOUR WAY IN
                  </div>
                  <p id="choice-title">
                    Start something. Or pick up where you left off.
                  </p>
                </div>
                <div className="room-options">
                  <form
                    className="option-card create-card"
                    onSubmit={(e) => {
                      e.preventDefault();
                      enter(true);
                    }}
                    aria-labelledby="create-title"
                  >
                    <div className="option-top">
                      <div className="option-icon">
                        <Icon name="plus" />
                      </div>
                      <span className="option-tag">BE THE HOST</span>
                    </div>
                    <h2 id="create-title">
                      A fresh <br />
                      conversation.
                    </h2>
                    <p>
                      Create your own room, then invite someone to join you.
                    </p>
                    <div className="create-visual" aria-hidden="true">
                      <span className="mini-person">You</span>
                      <span className="connection-dots">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="mini-person guest">
                        <Icon name="plus" />
                      </span>
                    </div>
                    <div className="card-bottom">
                      <span className="card-detail">
                        <Icon name="link" />
                        An invitation link, ready to share
                      </span>
                      <button
                        className="primary full"
                        disabled={busy}
                        type="submit"
                      >
                        {pendingAction === "create"
                          ? "Creating your room…"
                          : "Create a room"}
                        <Icon name="arrow" />
                      </button>
                      <small>Room for you and one other person.</small>
                    </div>
                  </form>
                  <form
                    className={`option-card join-option ${invite ? "has-invite" : ""}`}
                    onSubmit={(e) => {
                      e.preventDefault();
                      enter(false);
                    }}
                    aria-labelledby="join-title"
                  >
                    <div className="option-top">
                      <div className="option-icon">
                        <Icon name="link" />
                      </div>
                      <span className="option-tag">YOU'RE INVITED</span>
                    </div>
                    <h2 id="join-title">
                      Already have <br />a room?
                    </h2>
                    <p>
                      Your seat is waiting. Paste the full invitation link
                      below.
                    </p>
                    <div className="invite-field">
                      <label className="field-label" htmlFor="invite">
                        Invitation link
                      </label>
                      <div className="input-with-icon">
                        <Icon name="link" />
                        <input
                          id="invite"
                          type="text"
                          inputMode="url"
                          spellCheck={false}
                          autoComplete="off"
                          placeholder="Paste your room link here"
                          value={invite}
                          disabled={busy}
                          onChange={(e) => setInvite(e.target.value)}
                        />
                      </div>
                      <span className="invite-help">
                        Use the complete link shared by your host.
                      </span>
                    </div>
                    <div className="card-bottom">
                      <button
                        className="secondary full join-button"
                        disabled={busy || !invite.trim()}
                        type="submit"
                      >
                        {pendingAction === "join"
                          ? "Joining the room…"
                          : "Join room"}
                        <Icon name="arrow" />
                      </button>
                      <small>Same room. Same conversation.</small>
                    </div>
                  </form>
                </div>
              </section>
            </div>
            <section className="features-strip" aria-label="Call features">
              <div>
                <Icon name="video" />
                <span>Face-to-face video</span>
              </div>
              <div>
                <Icon name="screen" />
                <span>Present your screen</span>
              </div>
              <div>
                <Icon name="chat" />
                <span>Keep the chat going</span>
              </div>
              <div>
                <Icon name="record" />
                <span>Save the conversation</span>
              </div>
            </section>
    
          </div>
        ) : (
          <>
            <div className="room-heading">
              <div>
                <div className="eyebrow">YOUR CONVERSATION SPACE</div>
                <h1 className="room-title">Good to see you.</h1>
              </div>
              <div className="room-meta">
                <span
                  className={`connection ${state.connection === "connected" ? "connected" : ""}`}
                >
                  <i />
                  {state.status}
                </span>
                <button className="secondary" onClick={copy}>
                  <Icon name="link" />
                  Copy invite
                </button>
              </div>
            </div>
            <div className="camera-controls">
              <CameraPicker
                cameras={cameras}
                value={cameraId}
                onChange={setCameraId}
                refresh={refreshDevices}
                disabled={state.cameraBusy}
              />
              <button
                disabled={state.cameraBusy}
                onClick={() =>
                  action(async () => {
                    await controller.current.switchCamera(cameraId);
                    await refreshDevices();
                  })
                }
              >
                {state.cameraBusy ? "Starting camera…" : "Apply / retry camera"}
              </button>
            </div>
            {state.cameraError && (
              <div className="camera-warning" role="status">
                <strong>
                  Camera unavailable — room opened with audio only.
                </strong>
                <p>{state.cameraError}</p>
              </div>
            )}
            {!state.hasTurn && (
              <div className="network-note">
                Local mode: no TURN server configured. Cross-network calls may
                not connect.
              </div>
            )}
            {(state.recording || peerRecording) && (
              <div className="record-banner">
                <i />
                {state.recording
                  ? "You are recording this call"
                  : "The other participant is recording this call"}{" "}
                · saved on the recorder's device
              </div>
            )}
            <div className="room-layout">
              <section className="call-area">
                <div className="video-grid">
                  <Video
                    stream={state.local}
                    muted
                    name={`${name} · You`}
                    enabled={state.camera}
                  />
                  <Video
                    stream={state.remote}
                    name={remote?.name || "Your guest"}
                    enabled={remote?.camera !== false}
                  />
                </div>
                {(state.sharing || remote?.sharing) && (
                  <div className="screen-grid">
                    {state.sharing && (
                      <Video
                        stream={state.localScreen}
                        muted
                        name="Your shared screen"
                        screen
                      />
                    )}
                    {remote?.sharing && (
                      <Video
                        stream={state.remoteScreen}
                        muted
                        name={`${remote.name}'s screen`}
                        screen
                      />
                    )}
                  </div>
                )}
                <div className="toolbar">
                  <button
                    className={!state.mic ? "off" : ""}
                    onClick={() => controller.current.toggleMic()}
                  >
                    <Icon name="mic" />
                    {state.mic ? "Mute mic" : "Unmute mic"}
                  </button>
                  <button
                    className={!state.camera ? "off" : ""}
                    disabled={state.cameraBusy}
                    onClick={() =>
                      action(() => controller.current.toggleCamera())
                    }
                  >
                    <Icon name="video" />
                    {state.camera ? "Camera off" : "Camera on"}
                  </button>
                  <button
                    disabled={!remote}
                    className={state.sharing ? "selected" : ""}
                    onClick={() =>
                      action(() =>
                        state.sharing
                          ? controller.current.stopScreen()
                          : controller.current.startScreen(),
                      )
                    }
                  >
                    <Icon name="screen" />
                    {state.sharing ? "Stop sharing" : "Share screen"}
                  </button>
                  <button
                    disabled={!state.recording && !canRecord}
                    className={state.recording ? "recording" : ""}
                    onClick={() =>
                      action(() =>
                        state.recording
                          ? controller.current.stopRecording()
                          : controller.current.startRecording(),
                      )
                    }
                  >
                    <Icon name="record" />
                    {state.recording ? "Stop recording" : "Record call"}
                  </button>
                  <button className="leave" onClick={leave}>
                    <Icon name="phone" />
                    Leave call
                  </button>
                </div>
                <div className="call-footer">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={state.consent}
                      onChange={(e) =>
                        controller.current.setMedia({
                          consent: e.target.checked,
                        })
                      }
                    />
                    <span>Allow recording</span>
                  </label>
                  <span>
                    {state.stats.path || "Establishing connection"}
                    {state.stats.rtt !== undefined
                      ? ` · ${state.stats.rtt} ms`
                      : ""}
                  </span>
                  <button
                    className="text-button"
                    onClick={() =>
                      action(() => controller.current.restartIce())
                    }
                  >
                    Reconnect media
                  </button>
                </div>
              </section>
              <aside className="chat-panel">
                <div className="chat-header">
                  <h2>Room chat</h2>
                  <span>{state.peers.length}/2</span>
                </div>
                <div className="messages" role="log" aria-label="Room messages">
                  {!state.messages.length && (
                    <div className="empty-chat">
                      <div>“</div>
                      <h3>Say hello.</h3>
                      <p>
                        Share a thought or a link.
                        <br />
                        Messages stay in this room temporarily.
                      </p>
                    </div>
                  )}
                  {state.messages.map((m) => (
                    <div
                      className={`message ${m.from === state.selfId ? "mine" : ""}`}
                      key={m.id}
                    >
                      <div className="message-meta">
                        <b>{m.name}</b>
                        <time>
                          {new Date(m.at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                      <p>{m.text}</p>
                    </div>
                  ))}
                  <div ref={chatEnd} />
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const text = chat.trim();
                    if (text)
                      action(async () => {
                        await controller.current.sendChat(text);
                        setChat("");
                      });
                  }}
                >
                  <label className="sr-only" htmlFor="chat">
                    Message
                  </label>
                  <input
                    id="chat"
                    placeholder="Write a message…"
                    maxLength={2000}
                    value={chat}
                    onChange={(e) => setChat(e.target.value)}
                  />
                  <button aria-label="Send message" disabled={!chat.trim()}>
                    Send
                  </button>
                </form>
                <p className="chat-note">
                  Chat passes through your signaling server.
                </p>
              </aside>
            </div>
          </>
        )}
        {!!downloads.length && (
          <section className="downloads">
            <h2>Your recordings</h2>
            <p>
              Download before closing or refreshing this page. Files are not
              uploaded.
            </p>
            {downloads.map((file) => (
              <a key={file.url} href={file.url} download={file.name}>
                Download {file.name}{" "}
                <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              </a>
            ))}
          </section>
        )}
      </main>
      <footer>
        <span>VIDEO · SCREEN · CHAT · RECORD</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
