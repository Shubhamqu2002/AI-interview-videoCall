import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { PeerRoom } from "./rtc/PeerRoom";
import "./styles.css";

/* -------------------------------------------------------------------------- */
/*                                    Icons                                   */
/* -------------------------------------------------------------------------- */

function Icon({ name, ...props }) {
  const paths = {
    video: (
      <>
        <rect x="3" y="6" width="12" height="12" rx="3" />
        <path d="m15 10 6-3v10l-6-3" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7-7l-2 2" />
        <path d="M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7 7l2-2" />
      </>
    ),
    screen: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8m-4-4v4m-3-11 3-3 3 3m-3-3v7" />
      </>
    ),
    chat: (
      <path d="M20 11a8 8 0 0 1-8 8H4l1-4a8 8 0 1 1 15-4Z" />
    ),
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
    phone: (
      <path d="M3 15v-4c5-5 13-5 18 0v4l-5-1v-3a12 12 0 0 0-8 0v3z" />
    ),
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" />
        <circle cx="15" cy="17" r="3" />
      </>
    ),
    check: <path d="m5 12 4 4 10-10" />,
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2" />
      </>
    ),
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

/* -------------------------------------------------------------------------- */
/*                                Video tile                                  */
/* -------------------------------------------------------------------------- */

function Video({
  stream,
  muted = false,
  name,
  enabled = true,
  screen = false,
}) {
  const videoRef = useRef(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    let cancelled = false;

    if (!video) return;

    video.srcObject = stream || null;
    setBlocked(false);

    if (stream) {
      video.play().catch(() => {
        if (!cancelled) setBlocked(true);
      });
    }

    return () => {
      cancelled = true;
      video.srcObject = null;
    };
  }, [stream]);

  async function resumePlayback() {
    try {
      await videoRef.current?.play();
      setBlocked(false);
    } catch {
      setBlocked(true);
    }
  }

  return (
    <div className={`video-tile ${screen ? "screen-tile" : ""}`}>
      <video
        ref={videoRef}
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
          type="button"
          className="play-button"
          onClick={resumePlayback}
        >
          Play audio / video
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Camera picker                                */
/* -------------------------------------------------------------------------- */

function CameraPicker({
  id,
  cameras,
  value,
  onChange,
  refresh,
  disabled = false,
}) {
  return (
    <div className="camera-picker">
      <label htmlFor={id}>Camera device</label>

      <div>
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        >
          <option value="">Browser default camera</option>

          {cameras.map((camera, index) => (
            <option
              key={camera.deviceId || index}
              value={camera.deviceId}
            >
              {camera.label || `Camera ${index + 1}`}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={disabled}
          onClick={refresh}
          aria-label="Refresh camera list"
          title="Refresh camera list"
        >
          <Icon name="refresh" />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                       Independent settings for each form                    */
/* -------------------------------------------------------------------------- */

function EntryPreferences({
  prefix,
  values,
  update,
  cameras,
  refresh,
  disabled,
}) {
  return (
    <>
      <CameraPicker
        id={`${prefix}-camera`}
        cameras={cameras}
        value={values.cameraId}
        onChange={(cameraId) => update({ cameraId })}
        refresh={refresh}
        disabled={disabled}
      />

      <div className="entry-preferences">
        <label className="check">
          <input
            type="checkbox"
            checked={values.audioOnly}
            disabled={disabled}
            onChange={(event) =>
              update({ audioOnly: event.target.checked })
            }
          />

          <span>
            Start without camera
            <small>You can turn it on during the call.</small>
          </span>
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={values.consent}
            disabled={disabled}
            onChange={(event) =>
              update({ consent: event.target.checked })
            }
          />

          <span>
            Allow in-app recording
            <small>Both participants must agree before recording.</small>
          </span>
        </label>
      </div>
    </>
  );
}

function makeEntrySettings() {
  return {
    name: "",
    cameraId: "",
    audioOnly: false,
    consent: false,
  };
}

function makeInitialCallState() {
  return {
    peers: [],
    messages: [],
    recordings: [],
    status: "Ready",
    connection: "new",
    stats: {},
    mic: true,
    camera: false,
    consent: false,
    sharing: false,
    recording: false,
  };
}

/* -------------------------------------------------------------------------- */
/*                                    App                                     */
/* -------------------------------------------------------------------------- */

function App() {
  const [createSettings, setCreateSettings] =
    useState(makeEntrySettings);
  const [joinSettings, setJoinSettings] =
    useState(makeEntrySettings);

  const [invite, setInvite] = useState(() =>
    window.location.hash ? window.location.href : "",
  );
  const [currentInvite, setCurrentInvite] = useState("");

  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState("");
  const [activeName, setActiveName] = useState("");

  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [active, setActive] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [chat, setChat] = useState("");
  const [downloads, setDownloads] = useState([]);

  const [state, setState] = useState(makeInitialCallState);

  const controller = useRef(null);
  const joining = useRef(false);
  const chatEnd = useRef(null);

  function updateCreateSettings(patch) {
    setCreateSettings((previous) => ({ ...previous, ...patch }));
  }

  function updateJoinSettings(patch) {
    setJoinSettings((previous) => ({ ...previous, ...patch }));
  }

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices?.enumerateDevices();

      setCameras(
        (devices || []).filter(
          (device) =>
            device.kind === "videoinput" && device.deviceId,
        ),
      );
    } catch (err) {
      setError(`Could not list cameras: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    refreshDevices();

    const mediaDevices = navigator.mediaDevices;
    mediaDevices?.addEventListener("devicechange", refreshDevices);

    return () => {
      mediaDevices?.removeEventListener(
        "devicechange",
        refreshDevices,
      );
    };
  }, [refreshDevices]);

  useEffect(() => {
    return () => controller.current?.leave();
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest" });
  }, [state.messages.length]);

  useEffect(() => {
    function warnBeforeLeaving(event) {
      if (controller.current && !controller.current.disposed) {
        event.preventDefault();
        event.returnValue = "";
      }
    }

    window.addEventListener("beforeunload", warnBeforeLeaving);

    return () => {
      window.removeEventListener(
        "beforeunload",
        warnBeforeLeaving,
      );
    };
  }, []);

  async function enter(mode) {
    if (joining.current) return;

    const creating = mode === "create";
    const settings = creating ? createSettings : joinSettings;
    const participantName = settings.name.trim();

    setError("");
    setNotice("");

    if (!participantName) {
      setError(
        creating
          ? "Enter your name in the Create Room section."
          : "Enter your name in the Join Room section.",
      );

      document
        .getElementById(creating ? "create-name" : "join-name")
        ?.focus();

      return;
    }

    if (!creating && !invite.trim()) {
      setError("Paste your invitation link in the Join Room section.");
      document.getElementById("join-invite")?.focus();
      return;
    }

    joining.current = true;
    setBusy(true);
    setPendingAction(mode);

    let call;

    try {
      let roomId;
      let roomKey;

      if (creating) {
        const response = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            `POST /api/rooms returned HTTP ${response.status}. ${
              result.error ||
              "Check that the frontend and backend are running."
            }`,
          );
        }

        ({ roomId, roomKey } = result);

        if (!roomId || !roomKey) {
          throw new Error(
            "The server returned an incomplete room invitation.",
          );
        }
      } else {
        let invitationURL;

        try {
          invitationURL = new URL(invite.trim());
        } catch {
          throw new Error(
            "Enter a valid, complete invitation link from the host.",
          );
        }

        if (invitationURL.origin !== window.location.origin) {
          throw new Error(
            "Open the invitation on its original website, then join there.",
          );
        }

        const params = new URLSearchParams(
          invitationURL.hash.slice(1),
        );

        roomId = params.get("room");
        roomKey = params.get("key");

        if (!roomId || !roomKey) {
          throw new Error(
            "This invitation is incomplete. Ask the host to copy the full room link.",
          );
        }
      }

      const roomURL = new URL(window.location.origin + "/");
      roomURL.hash = new URLSearchParams({
        room: roomId,
        key: roomKey,
      }).toString();

      window.history.replaceState(null, "", roomURL.href);

      setCurrentInvite(roomURL.href);
      setActiveName(participantName);
      setActiveCameraId(settings.cameraId);

      call = new PeerRoom({
        onChange: (snapshot) => {
          if (controller.current === call) {
            setState(snapshot);
          }

          if (snapshot.recordings?.length) {
            setDownloads((previous) => [
              ...previous,
              ...snapshot.recordings.filter(
                (recording) =>
                  !previous.some(
                    (existing) => existing.url === recording.url,
                  ),
              ),
            ]);
          }
        },
        onError: (message) => {
          if (controller.current === call) {
            setError(message);
          }
        },
      });

      controller.current = call;

      await call.join({
        roomId,
        roomKey,
        name: participantName,
        consent: settings.consent,
        cameraId: settings.cameraId,
        audioOnly: settings.audioOnly,
      });

      await refreshDevices();

      if (!call.disposed) {
        setActive(true);
      }
    } catch (err) {
      call?.leave();

      setError(
        err.name === "NotAllowedError"
          ? "Camera or microphone access was denied. Allow access and retry."
          : err.name === "NotFoundError"
            ? "A microphone is required. Connect one and retry."
            : err.message || "Could not start the call.",
      );
    } finally {
      joining.current = false;
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function action(fn, permissionMessage) {
    setError("");

    try {
      await fn();
    } catch (err) {
      if (err.name === "NotAllowedError" && permissionMessage) {
        setNotice(permissionMessage);
      } else {
        setError(err.message || "The action could not be completed.");
      }
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(currentInvite);
      setNotice("Invitation copied. Share it with your guest.");
    } catch {
      setNotice("Copy the complete invitation from the address bar.");
    }
  }

  function leave() {
    controller.current?.leave();
    setActive(false);
    setNotice(
      "Call ended. Download any recordings before closing this page.",
    );
  }

  async function sendMessage(event) {
    event.preventDefault();

    const text = chat.trim();
    if (!text) return;

    await action(async () => {
      await controller.current.sendChat(text);
      setChat((current) => (current.trim() === text ? "" : current));
    });
  }

  const remote = state.remoteMember;

  const canRecord =
    state.connection === "connected" &&
    state.peers.length === 2 &&
    state.peers.every((participant) => participant.consent);

  const peerRecording = state.peers.some(
    (participant) =>
      participant.recording && participant.id !== state.selfId,
  );

  return (
    <div className="app-shell">
      <style>{pageStyles}</style>

      <header>
        <a
          className="brand entry-brand"
          href={active ? undefined : "/"}
        >
          <span className="brand-icon">
            <Icon name="video" />
          </span>

          <span>
            AI-Interview
            <span className="brand-light"> room</span>
          </span>
        </a>
      </header>

      <main>
        {error && (
          <div className="banner error" role="alert">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {notice && (
          <div className="banner notice" role="status">
            <span>{notice}</span>

            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        )}

        {!active ? (
          <div className="lobby lobby-studio independent-lobby">
            <section className="entry-hero">
              <div className="eyebrow">
                <span />
                BETTER CONVERSATIONS START HERE
              </div>

              <h1>
                Your next conversation.
                <br />
                <em>Your way in.</em>
              </h1>

              <p>
                Start a new room or join someone’s invitation.
                <br className="desktop-break" />
                Fill in the details in the section you want to use.
              </p>

              <div className="entry-feature-pills">
                <span>
                  <Icon name="video" />
                  Video calls
                </span>
                <span>
                  <Icon name="screen" />
                  Screen sharing
                </span>
                <span>
                  <Icon name="chat" />
                  Room chat
                </span>
              </div>
            </section>

            <div className="room-entry-grid">
              {/* CREATE ROOM */}
              <form
                className="option-card create-card entry-card"
                aria-labelledby="create-room-title"
                onSubmit={(event) => {
                  event.preventDefault();
                  enter("create");
                }}
              >
                <div className="option-top">
                  <div className="option-icon">
                    <Icon name="plus" />
                  </div>

                  <span className="option-tag">START SOMETHING NEW</span>
                </div>

                <div className="entry-card-heading">
                  <h2 id="create-room-title">Create a room</h2>
                  <p>
                    Be the host. Create a room and share its invitation
                    with one other person.
                  </p>
                </div>

                <div className="entry-form-content">
                  <label className="field-label" htmlFor="create-name">
                    Your name
                  </label>

                  <div className="entry-name-input">
                    <Icon name="user" />
                    <input
                      id="create-name"
                      name="createName"
                      autoComplete="section-create name"
                      placeholder="Enter your name"
                      maxLength={40}
                      value={createSettings.name}
                      disabled={busy}
                      required
                      onChange={(event) =>
                        updateCreateSettings({
                          name: event.target.value,
                        })
                      }
                    />
                  </div>

                  <p className="entry-field-hint">
                    Your guest will see this name during the call.
                  </p>

                  <EntryPreferences
                    prefix="create"
                    values={createSettings}
                    update={updateCreateSettings}
                    cameras={cameras}
                    refresh={refreshDevices}
                    disabled={busy}
                  />
                </div>

                <div className="card-bottom entry-card-bottom">
                  <div className="entry-next-step">
                    <Icon name="link" />
                    <span>You’ll get a link to invite your guest.</span>
                  </div>

                  <button
                    className="primary full"
                    type="submit"
                    disabled={busy}
                  >
                    {pendingAction === "create"
                      ? "Creating your room…"
                      : "Create a room"}
                    <Icon name="arrow" />
                  </button>

                  <small>No invitation link needed to create a room.</small>
                </div>
              </form>

              {/* JOIN ROOM */}
              <form
                className="option-card join-option entry-card"
                aria-labelledby="join-room-title"
                onSubmit={(event) => {
                  event.preventDefault();
                  enter("join");
                }}
              >
                <div className="option-top">
                  <div className="option-icon">
                    <Icon name="link" />
                  </div>

                  <span className="option-tag">HAVE AN INVITATION?</span>
                </div>

                <div className="entry-card-heading">
                  <h2 id="join-room-title">Join a room</h2>
                  <p>
                    Enter your name and the invitation link shared
                    by your host.
                  </p>
                </div>

                <div className="entry-form-content">
                  <label className="field-label" htmlFor="join-name">
                    Your name
                  </label>

                  <div className="entry-name-input">
                    <Icon name="user" />
                    <input
                      id="join-name"
                      name="joinName"
                      autoComplete="section-join name"
                      placeholder="Enter your name"
                      maxLength={40}
                      value={joinSettings.name}
                      disabled={busy}
                      required
                      onChange={(event) =>
                        updateJoinSettings({
                          name: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="entry-invite-group">
                    <label
                      className="field-label"
                      htmlFor="join-invite"
                    >
                      Invitation link
                    </label>

                    <div className="entry-name-input">
                      <Icon name="link" />
                      <input
                        id="join-invite"
                        name="invitation"
                        type="url"
                        inputMode="url"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Paste the full room invitation"
                        value={invite}
                        disabled={busy}
                        required
                        onChange={(event) =>
                          setInvite(event.target.value)
                        }
                      />
                    </div>

                    <p className="entry-field-hint">
                      Opening an invitation directly fills this for you.
                    </p>
                  </div>

                  <EntryPreferences
                    prefix="join"
                    values={joinSettings}
                    update={updateJoinSettings}
                    cameras={cameras}
                    refresh={refreshDevices}
                    disabled={busy}
                  />
                </div>

                <div className="card-bottom entry-card-bottom">
                  <button
                    className="secondary full join-button"
                    type="submit"
                    disabled={busy}
                  >
                    {pendingAction === "join"
                      ? "Joining the room…"
                      : "Join room"}
                    <Icon name="arrow" />
                  </button>

                  <small>Use the Join Room name and settings above.</small>
                </div>
              </form>
            </div>

            <div className="entry-bottom-note">
              <Icon name="check" />
              <p>
                Only complete the section you’re using. Camera and
                recording preferences are separate for each section.
              </p>
            </div>

            <section
              className="features-strip"
              aria-label="Call features"
            >
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
                  className={`connection ${
                    state.connection === "connected"
                      ? "connected"
                      : ""
                  }`}
                >
                  <i />
                  {state.status}
                </span>

                <button
                  type="button"
                  className="secondary"
                  onClick={copyInvite}
                >
                  <Icon name="link" />
                  Copy invite
                </button>
              </div>
            </div>

            <div className="camera-controls">
              <CameraPicker
                id="active-camera"
                cameras={cameras}
                value={activeCameraId}
                onChange={setActiveCameraId}
                refresh={refreshDevices}
                disabled={state.cameraBusy}
              />

              <button
                type="button"
                disabled={state.cameraBusy}
                onClick={() =>
                  action(async () => {
                    await controller.current.switchCamera(
                      activeCameraId,
                    );
                    await refreshDevices();
                  })
                }
              >
                {state.cameraBusy
                  ? "Starting camera…"
                  : "Apply / retry camera"}
              </button>
            </div>

            {state.cameraError && (
              <div className="camera-warning" role="status">
                <strong>Camera unavailable. Audio remains available.</strong>
                <p>{state.cameraError}</p>
              </div>
            )}

            {!state.hasTurn && (
              <div className="network-note">
                Local mode: no TURN server configured. Cross-network
                calls may not connect.
              </div>
            )}

            {(state.recording || peerRecording) && (
              <div className="record-banner">
                <i />
                {state.recording
                  ? "You are recording this call"
                  : "The other participant is recording this call"}
                {" · saved on the recorder’s device"}
              </div>
            )}

            <div className="room-layout">
              <section className="call-area">
                <div className="video-grid">
                  <Video
                    stream={state.local}
                    muted
                    name={`${activeName} · You`}
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
                    type="button"
                    className={!state.mic ? "off" : ""}
                    onClick={() => controller.current.toggleMic()}
                  >
                    <Icon name="mic" />
                    {state.mic ? "Mute mic" : "Unmute mic"}
                  </button>

                  <button
                    type="button"
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
                    type="button"
                    disabled={
                      !state.sharing &&
                      state.connection !== "connected"
                    }
                    className={state.sharing ? "selected" : ""}
                    onClick={() =>
                      action(
                        () =>
                          state.sharing
                            ? controller.current.stopScreen()
                            : controller.current.startScreen(),
                        "Screen selection was cancelled or permission was denied.",
                      )
                    }
                  >
                    <Icon name="screen" />
                    {state.sharing ? "Stop sharing" : "Share screen"}
                  </button>

                  <button
                    type="button"
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

                  <button
                    type="button"
                    className="leave"
                    onClick={leave}
                  >
                    <Icon name="phone" />
                    Leave call
                  </button>
                </div>

                <div className="call-footer">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={Boolean(state.consent)}
                      onChange={(event) =>
                        controller.current.setMedia({
                          consent: event.target.checked,
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
                    type="button"
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

                <div
                  className="messages"
                  role="log"
                  aria-label="Room messages"
                >
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

                  {state.messages.map((message) => (
                    <div
                      className={`message ${
                        message.from === state.selfId ? "mine" : ""
                      }`}
                      key={message.id}
                    >
                      <div className="message-meta">
                        <b>{message.name}</b>
                        <time>
                          {new Date(message.at).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </time>
                      </div>

                      <p>{message.text}</p>
                    </div>
                  ))}

                  <div ref={chatEnd} />
                </div>

                <form onSubmit={sendMessage}>
                  <label className="sr-only" htmlFor="chat">
                    Message
                  </label>

                  <input
                    id="chat"
                    placeholder="Write a message…"
                    maxLength={2000}
                    value={chat}
                    onChange={(event) => setChat(event.target.value)}
                  />

                  <button
                    type="submit"
                    aria-label="Send message"
                    disabled={!chat.trim()}
                  >
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
              Download before closing or refreshing this page.
              Files are not uploaded.
            </p>

            {downloads.map((file) => (
              <a key={file.url} href={file.url} download={file.name}>
                <span>Download {file.name}</span>
                <span>
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
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

/* -------------------------------------------------------------------------- */
/*                       Additional styles for this page                      */
/* -------------------------------------------------------------------------- */

const pageStyles = `
  .entry-brand {
    min-width: 0;
  }

  .entry-brand > span:last-child {
    overflow-wrap: anywhere;
  }

  .entry-hero {
    text-align: center;
    padding: 52px 16px 42px;
  }

  .entry-hero .eyebrow {
    justify-content: center;
  }

  .entry-hero h1 {
    margin: 22px 0 18px;
    font-size: clamp(36px, 4.5vw, 62px);
    line-height: 1.13;
    font-weight: 500;
    letter-spacing: -2.5px;
  }

  .entry-hero h1 em {
    font-style: normal;
    color: #c7f3c1;
  }

  .entry-hero > p {
    margin: 0;
    color: #b0c1c0;
    font-size: 14px;
    line-height: 1.8;
  }

  .entry-feature-pills {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 24px;
  }

  .entry-feature-pills > span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid #354b47;
    border-radius: 999px;
    background: #19302b55;
    color: #c8dbd0;
    font-size: 11px;
  }

  .entry-feature-pills .icon {
    width: 15px;
    height: 15px;
  }

  .room-entry-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 26px;
    max-width: 1100px;
    margin: 0 auto;
    align-items: stretch;
  }

  .room-entry-grid .entry-card {
    min-width: 0;
    padding: 32px;
    border-radius: 24px;
    display: flex;
    flex-direction: column;
  }

  .entry-card .option-tag {
    font-size: 9px;
    letter-spacing: 1.1px;
  }

  .entry-card-heading {
    margin: 23px 0 25px;
  }

  .entry-card .entry-card-heading h2 {
    margin: 0 0 12px;
    font-size: clamp(28px, 3vw, 38px);
    line-height: 1.15;
    letter-spacing: -1px;
    overflow-wrap: anywhere;
  }

  .entry-card-heading p {
    max-width: 360px;
    margin: 0;
    font-size: 13px;
    line-height: 1.75;
  }

  .create-card .entry-card-heading p {
    color: #365340;
  }

  .join-option .entry-card-heading p {
    color: #cec3da;
  }

  .entry-form-content {
    flex: 1;
  }

  .entry-card .field-label,
  .entry-card .camera-picker > label {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 9px;
  }

  .entry-name-input {
    position: relative;
  }

  .entry-name-input > .icon {
    position: absolute;
    top: 50%;
    left: 14px;
    transform: translateY(-50%);
    width: 17px;
    height: 17px;
    pointer-events: none;
  }

  .entry-card .entry-name-input input {
    width: 100%;
    min-height: 49px;
    padding: 13px 14px 13px 42px;
    font-size: 13px;
    border-radius: 11px;
  }

  .entry-field-hint {
    margin: 8px 0 0;
    font-size: 11px;
    line-height: 1.6;
  }

  .entry-invite-group {
    margin-top: 22px;
  }

  .entry-card .camera-picker {
    margin: 24px 0 0;
  }

  .entry-card .camera-picker > div {
    display: flex;
    align-items: stretch;
    flex-wrap: nowrap;
    gap: 8px;
  }

  .entry-card .camera-picker select {
    min-width: 0;
    flex: 1;
    width: 100%;
    min-height: 46px;
    font-size: 12px;
    border-radius: 10px;
  }

  .entry-card .camera-picker button {
    min-height: 46px;
    padding: 10px 12px;
    font-size: 11px;
    gap: 6px;
    flex-shrink: 0;
  }

  .entry-card .camera-picker button .icon {
    width: 15px;
    height: 15px;
  }

  .entry-preferences {
    display: flex;
    flex-direction: column;
    gap: 18px;
    margin: 24px 0;
    padding-top: 23px;
    border-top: 1px solid;
  }

  .entry-preferences .check {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    font-size: 12px;
    line-height: 1.5;
    cursor: pointer;
  }

  .entry-preferences .check input {
    margin: 2px 0 0;
    width: 17px;
    height: 17px;
    flex-shrink: 0;
  }

  .entry-preferences .check small {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    line-height: 1.65;
  }

  .entry-card .entry-card-bottom {
    padding-top: 8px;
    margin-top: auto;
  }

  .entry-card-bottom > button {
    width: 100%;
    min-height: 50px;
    justify-content: space-between;
    padding: 14px 17px;
    font-size: 13px;
  }

  .entry-card-bottom > small {
    font-size: 10px !important;
    line-height: 1.6;
  }

  .entry-next-step {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    font-size: 11px;
    line-height: 1.6;
  }

  .entry-next-step .icon {
    width: 16px;
    height: 16px;
  }

  /* Create Room: light mint surface */
  .room-entry-grid .create-card {
    background: linear-gradient(145deg, #d7f3c9, #bde4b2);
    color: #183b2d;
    color-scheme: light;
    border-color: #d8f1cf;
  }

  .create-card .field-label,
  .create-card .camera-picker > label {
    color: #244932;
  }

  .create-card .entry-name-input > .icon {
    color: #527154;
  }

  .create-card .entry-name-input input,
  .create-card .camera-picker select {
    background: #ffffff8c;
    border: 1px solid #91b58a;
    color: #193c29;
  }

  .create-card .entry-name-input input::placeholder {
    color: #587354;
  }

  .create-card .camera-picker button {
    background: #e7f6dd;
    border-color: #91b58a;
    color: #244832;
  }

  .create-card .entry-field-hint,
  .create-card .entry-preferences small,
  .create-card .entry-next-step {
    color: #3e6046;
  }

  .create-card .entry-preferences {
    border-top-color: #8faf8177;
  }

  .create-card input[type="checkbox"] {
    accent-color: #254d36;
  }

  .create-card input:focus-visible,
  .create-card select:focus-visible,
  .create-card button:focus-visible {
    outline-color: #244832;
  }

  /* Join Room: lavender surface */
  .room-entry-grid .join-option {
    background: linear-gradient(145deg, #342e45, #211f2d);
    border-color: #62516e;
  }

  .join-option .field-label,
  .join-option .camera-picker > label {
    color: #e8dff2;
  }

  .join-option .entry-name-input > .icon {
    color: #bca6d5;
  }

  .join-option .entry-name-input input,
  .join-option .camera-picker select {
    background: #191723;
    border: 1px solid #746181;
    color: #f2edf7;
  }

  .join-option .entry-name-input input::placeholder {
    color: #b4a4c5;
  }

  .join-option .camera-picker button {
    background: #46394f;
    border-color: #746181;
    color: #eadff6;
  }

  .join-option .entry-field-hint,
  .join-option .entry-preferences small {
    color: #c7b7d8;
  }

  .join-option .entry-preferences {
    border-top-color: #78628566;
  }

  .join-option input[type="checkbox"] {
    accent-color: #d7c8ef;
  }

  .entry-bottom-note {
    max-width: 850px;
    margin: 23px auto 0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: 9px;
    color: #bed0c3;
    padding: 0 12px;
  }

  .entry-bottom-note > .icon {
    width: 16px;
    height: 16px;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .entry-bottom-note p {
    margin: 0;
    font-size: 11px;
    line-height: 1.8;
  }

  .independent-lobby .features-strip {
    max-width: 1100px;
    margin-left: auto;
    margin-right: auto;
  }

  @media (max-width: 1000px) {
    .room-entry-grid {
      gap: 20px;
    }

    .room-entry-grid .entry-card {
      padding: 25px;
    }

    .entry-card .camera-picker button span {
      display: none;
    }
  }

  @media (max-width: 720px) {
    .entry-hero {
      padding: 30px 4px 30px;
      text-align: left;
    }

    .entry-hero .eyebrow {
      justify-content: flex-start;
      font-size: 8px;
      letter-spacing: 1.3px;
    }

    .entry-hero h1 {
      font-size: clamp(33px, 7vw, 44px);
      letter-spacing: -1.5px;
      margin: 18px 0 15px;
    }

    .entry-hero > p {
      font-size: 13px;
    }

    .entry-feature-pills {
      justify-content: flex-start;
      gap: 8px;
      margin-top: 20px;
    }

    .entry-feature-pills > span {
      font-size: 10px;
      padding: 7px 10px;
    }

    .room-entry-grid {
      grid-template-columns: 1fr;
      gap: 22px;
    }

    .room-entry-grid .entry-card {
      padding: 25px;
      border-radius: 20px;
    }

    .entry-card .entry-card-heading h2 {
      font-size: 32px;
    }

    .entry-card-heading p {
      max-width: none;
    }

    .entry-card .camera-picker button span {
      display: inline;
    }

    .entry-bottom-note {
      justify-content: flex-start;
      padding: 0 3px;
    }

    .entry-brand {
      font-size: 20px;
    }
  }

  @media (max-width: 380px) {
    .room-entry-grid .entry-card {
      padding: 21px;
    }

    .entry-card .option-tag {
      font-size: 8px;
      letter-spacing: 0.7px;
    }

    .entry-card .camera-picker button span {
      display: none;
    }

    .entry-brand {
      font-size: 18px;
    }
  }
`;

createRoot(document.getElementById("root")).render(<App />);