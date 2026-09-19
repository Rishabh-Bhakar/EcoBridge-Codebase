import { useEffect, useRef, useState } from "react";

const WS_URL = "ws://localhost:8000/ws/live-translation";

export default function LiveTranslation() {
  const [sourceLanguage, setSourceLanguage] = useState("hindi");
  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("Not connected");
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");

  const wsRef = useRef(null);
  const streamRef = useRef(null);

  // Important:
  // We use refs because React state updates are asynchronous.
  const recordingRef = useRef(false);
  const chunkRecorderRef = useRef(null);

  const audioQueueRef = useRef([]);
  const playingRef = useRef(false);

  // --------------------------------------------------
  // WEBSOCKET CONNECTION
  // --------------------------------------------------

  function connectWebSocket() {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus("Connecting...");

    const ws = new WebSocket(
      `${WS_URL}?source_language=${sourceLanguage}`
    );

    ws.onopen = () => {
      setConnected(true);
      setStatus("Connected — ready for live translation");
    };

    ws.onmessage = async (event) => {
      // JSON message
      if (typeof event.data === "string") {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "ready") {
            setStatus("Live translation ready");
          }

          if (data.type === "translation") {
            setTranscript(data.transcript || "");
            setTranslation(data.translation || "");
            setStatus("Translation received");
          }

          if (data.type === "error") {
            setStatus(data.message || "Live translation error");
          }
        } catch (error) {
          console.error("Invalid WebSocket message:", error);
        }

        return;
      }

      // Binary TTS audio
      if (event.data instanceof Blob) {
        const audioUrl = URL.createObjectURL(event.data);

        const audio = new Audio(audioUrl);

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          playingRef.current = false;
          playNextAudio();
        };

        audioQueueRef.current.push(audio);
        playNextAudio();
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setStatus("WebSocket error");
    };

    ws.onclose = () => {
      setConnected(false);

      if (recordingRef.current) {
        recordingRef.current = false;
        setRecording(false);
      }

      setStatus("Disconnected");
    };

    wsRef.current = ws;
  }

  // --------------------------------------------------
  // PLAY TTS AUDIO
  // --------------------------------------------------

  function playNextAudio() {
    if (playingRef.current) {
      return;
    }

    const nextAudio = audioQueueRef.current.shift();

    if (!nextAudio) {
      return;
    }

    playingRef.current = true;

    nextAudio.play().catch((error) => {
      console.error("Audio playback failed:", error);

      playingRef.current = false;
      playNextAudio();
    });
  }

  // --------------------------------------------------
  // RECORD ONE COMPLETE 3-SECOND CHUNK
  // --------------------------------------------------

  function recordOneChunk() {
    return new Promise((resolve) => {
      if (!streamRef.current) {
        resolve();
        return;
      }

      if (!recordingRef.current) {
        resolve();
        return;
      }

      const chunks = [];

      let recorder;

      try {
        recorder = new MediaRecorder(streamRef.current, {
          mimeType: "audio/webm",
        });
      } catch (error) {
        console.error("MediaRecorder creation failed:", error);
        setStatus("Audio recording is not supported");
        resolve();
        return;
      }

      chunkRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        chunkRecorderRef.current = null;

        if (chunks.length === 0) {
          resolve();
          return;
        }

        const completeBlob = new Blob(chunks, {
          type: "audio/webm",
        });

        console.log(
          "Sending complete audio chunk:",
          completeBlob.size,
          "bytes"
        );

        // Send ONLY complete standalone WebM file
        if (
          wsRef.current &&
          wsRef.current.readyState === WebSocket.OPEN
        ) {
          try {
            const audioBuffer = await completeBlob.arrayBuffer();

            wsRef.current.send(audioBuffer);

            setStatus("Processing speech...");
          } catch (error) {
            console.error("Failed to send audio:", error);
          }
        }

        resolve();
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        resolve();
      };

      // Start a NEW independent recording
      recorder.start();

      // Stop after approximately 3 seconds.
      setTimeout(() => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }, 3000);
    });
  }

  // --------------------------------------------------
  // CONTINUOUS LIVE RECORDING
  // --------------------------------------------------

  async function liveRecordingLoop() {
    while (recordingRef.current) {
      await recordOneChunk();
    }
  }

  // --------------------------------------------------
  // START RECORDING
  // --------------------------------------------------

  async function startRecording() {
    if (!connected) {
      setStatus("Connect to the server first");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      recordingRef.current = true;
      setRecording(true);

      setTranscript("");
      setTranslation("");

      setStatus("Listening...");

      // Start continuous 3-second standalone chunks
      liveRecordingLoop();
    } catch (error) {
      console.error("Microphone error:", error);

      setStatus(
        "Microphone permission denied or unavailable"
      );
    }
  }

  // --------------------------------------------------
  // STOP RECORDING
  // --------------------------------------------------

  function stopRecording() {
    recordingRef.current = false;

    // Stop current chunk if it is still recording
    if (chunkRecorderRef.current) {
      if (chunkRecorderRef.current.state !== "inactive") {
        chunkRecorderRef.current.stop();
      }

      chunkRecorderRef.current = null;
    }

    // Stop microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    setRecording(false);
    setStatus("Recording stopped");
  }

  // --------------------------------------------------
  // DISCONNECT
  // --------------------------------------------------

  function disconnectWebSocket() {
    stopRecording();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnected(false);
    setStatus("Disconnected");
  }

  // --------------------------------------------------
  // LANGUAGE CHANGE
  // --------------------------------------------------

  function handleLanguageChange(event) {
    const language = event.target.value;

    if (connected) {
      disconnectWebSocket();
    }

    setSourceLanguage(language);

    setTranscript("");
    setTranslation("");
  }

  // --------------------------------------------------
  // CLEANUP
  // --------------------------------------------------

  useEffect(() => {
    return () => {
      recordingRef.current = false;

      if (chunkRecorderRef.current) {
        if (chunkRecorderRef.current.state !== "inactive") {
          chunkRecorderRef.current.stop();
        }
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }

      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "30px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "30px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ marginBottom: "8px" }}>
          🎙️ Live Translation
        </h1>

        <p
          style={{
            color: "#666",
            marginBottom: "25px",
          }}
        >
          Speak naturally and receive Santali translation in
          Ol Chiki.
        </p>

        {/* SOURCE LANGUAGE */}

        <div style={{ marginBottom: "25px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            Source Language
          </label>

          <select
            value={sourceLanguage}
            onChange={handleLanguageChange}
            disabled={recording}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              fontSize: "16px",
            }}
          >
            <option value="hindi">Hindi</option>
            <option value="english">English</option>
          </select>
        </div>

        {/* CONTROLS */}

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          {!connected ? (
            <button
              onClick={connectWebSocket}
              style={{
                padding: "12px 22px",
                border: "none",
                borderRadius: "10px",
                background: "#2563eb",
                color: "white",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Connect
            </button>
          ) : (
            <button
              onClick={disconnectWebSocket}
              disabled={recording}
              style={{
                padding: "12px 22px",
                border: "none",
                borderRadius: "10px",
                background: "#6b7280",
                color: "white",
                fontWeight: "600",
                cursor: recording
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              Disconnect
            </button>
          )}

          {!recording ? (
            <button
              onClick={startRecording}
              disabled={!connected}
              style={{
                padding: "12px 22px",
                border: "none",
                borderRadius: "10px",
                background: connected
                  ? "#16a34a"
                  : "#9ca3af",
                color: "white",
                fontWeight: "600",
                cursor: connected
                  ? "pointer"
                  : "not-allowed",
              }}
            >
              🎤 Start Live Translation
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{
                padding: "12px 22px",
                border: "none",
                borderRadius: "10px",
                background: "#dc2626",
                color: "white",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              ⏹ Stop
            </button>
          )}
        </div>

        {/* STATUS */}

        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#f3f4f6",
            marginBottom: "25px",
            fontWeight: "500",
          }}
        >
          Status: {status}
        </div>

        {/* TRANSLATION */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
          {/* TRANSCRIPT */}

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "15px",
              padding: "20px",
              minHeight: "180px",
            }}
          >
            <h3>🗣️ You said</h3>

            <p
              style={{
                fontSize: "20px",
                lineHeight: "1.6",
                marginTop: "15px",
              }}
            >
              {transcript ||
                "Your speech will appear here..."}
            </p>
          </div>

          {/* SANTALI */}

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "15px",
              padding: "20px",
              minHeight: "180px",
            }}
          >
            <h3>🌐 Santali — Ol Chiki</h3>

            <p
              style={{
                fontSize: "20px",
                lineHeight: "1.8",
                marginTop: "15px",
              }}
            >
              {translation ||
                "Santali translation will appear here..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
