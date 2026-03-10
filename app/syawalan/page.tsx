"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const FORMATS = [
  { id: "postSyawalan2026", label: "Post", sublabel: "4:5", width: 1080, height: 1350 },
  { id: "reelsSyawalan2026", label: "Reels/Story", sublabel: "9:16", width: 1080, height: 1920 },
];

const OVERLAY_MAP: Record<string, string> = {
  postSyawalan2026: "/imagepost.png",
  reelsSyawalan2026: "/imagereelstory.png",
};

type Mode = "photo" | "video";

export default function CameraApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayImgRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordMimeTypeRef = useRef<string>("video/webm");

  const [facingMode, setFacingMode] = useState("environment");
  const [selectedFormat, setSelectedFormat] = useState(FORMATS[0]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null);
  const [overlayLoaded, setOverlayLoaded] = useState(false);
  const [flashAnim, setFlashAnim] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("photo");
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Compute preview dimensions to fill viewport
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const HEADER_H = 48;
  const FOOTER_H = 80;
  const availH = viewportSize.h - HEADER_H - FOOTER_H;
  const availW = viewportSize.w;

  const targetAspect = selectedFormat.width / selectedFormat.height;
  let PREVIEW_W = availW;
  let PREVIEW_H = Math.round(availW / targetAspect);
  if (PREVIEW_H > availH) {
    PREVIEW_H = availH;
    PREVIEW_W = Math.round(availH * targetAspect);
  }

  // Load overlay
  useEffect(() => {
    setOverlayLoaded(false);
    overlayImgRef.current = null;
    const src = OVERLAY_MAP[selectedFormat.id] ?? "/imagepost.png";
    const img = document.createElement("img");
    img.src = src;
    img.onload = () => { overlayImgRef.current = img; setOverlayLoaded(true); };
    img.onerror = () => { overlayImgRef.current = null; setOverlayLoaded(true); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormat.id]);

  // Check multiple cameras
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((devices) => {
      setHasMultipleCameras(devices.filter((d) => d.kind === "videoinput").length > 1);
    });
  }, []);

  // Start camera
  useEffect(() => {
    let cancelled = false;
    const initCamera = async () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animFrameRef.current);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: selectedFormat.width }, height: { ideal: selectedFormat.height } },
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (!cancelled) { videoRef.current?.play(); setIsCameraReady(true); }
          };
        }
      } catch (err) {
        if (!cancelled) { setError("Kamera tidak dapat diakses. Pastikan izin kamera diberikan."); console.error(err); }
      }
    };
    setError(null); setIsCameraReady(false);
    initCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animFrameRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, selectedFormat.width, selectedFormat.height]);

  // Render loop
  useEffect(() => {
    if (!isCameraReady || capturedImage || capturedVideo) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const video = videoRef.current;
    if (!video) return;

    const render = () => {
      if (!video || video.readyState < 2) { animFrameRef.current = requestAnimationFrame(render); return; }
      const vW = video.videoWidth || selectedFormat.width;
      const vH = video.videoHeight || selectedFormat.height;
      const tAspect = selectedFormat.width / selectedFormat.height;
      const vAspect = vW / vH;
      ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
      let sx = 0, sy = 0, sw = vW, sh = vH;
      if (vAspect > tAspect) { sw = vH * tAspect; sx = (vW - sw) / 2; }
      else { sh = vW / tAspect; sy = (vH - sh) / 2; }
      if (facingMode === "user") {
        ctx.save(); ctx.translate(PREVIEW_W, 0); ctx.scale(-1, 1);
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, PREVIEW_W, PREVIEW_H);
        ctx.restore();
      } else {
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, PREVIEW_W, PREVIEW_H);
      }
      if (overlayImgRef.current) ctx.drawImage(overlayImgRef.current, 0, 0, PREVIEW_W, PREVIEW_H);
      animFrameRef.current = requestAnimationFrame(render);
    };
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isCameraReady, overlayLoaded, facingMode, selectedFormat, PREVIEW_W, PREVIEW_H, capturedImage, capturedVideo]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    setFlashAnim(true);
    setTimeout(() => setFlashAnim(false), 350);
    const outW = selectedFormat.width, outH = selectedFormat.height;
    const offscreen = document.createElement("canvas");
    offscreen.width = outW; offscreen.height = outH;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;
    const vW = video.videoWidth, vH = video.videoHeight;
    const tAspect = outW / outH, vAspect = vW / vH;
    let sx = 0, sy = 0, sw = vW, sh = vH;
    if (vAspect > tAspect) { sw = vH * tAspect; sx = (vW - sw) / 2; }
    else { sh = vW / tAspect; sy = (vH - sh) / 2; }
    if (facingMode === "user") {
      ctx.save(); ctx.translate(outW, 0); ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);
      ctx.restore();
    } else {
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);
    }
    if (overlayImgRef.current) ctx.drawImage(overlayImgRef.current, 0, 0, outW, outH);
    setCapturedImage(offscreen.toDataURL("image/png"));
  }, [facingMode, selectedFormat]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    recordedChunksRef.current = [];

    // Pick the first supported mimeType
    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=h264,opus",
      "video/webm",
      "video/mp4;codecs=h264,aac",
      "video/mp4",
    ];
    const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    recordMimeTypeRef.current = mimeType || "video/webm";
    mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: recordMimeTypeRef.current });
      setCapturedVideo(URL.createObjectURL(blob));
    };
    mr.start(100);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setRecordSeconds(0);
    recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  }, []);

  const downloadImage = useCallback(() => {
    if (!capturedImage) return;
    const a = document.createElement("a");
    a.href = capturedImage;
    a.download = `foto_${selectedFormat.id}_${Date.now()}.png`;
    a.click();
  }, [capturedImage, selectedFormat]);

  const downloadVideo = useCallback(() => {
    if (!capturedVideo) return;
    const ext = recordMimeTypeRef.current.includes("mp4") ? "mp4" : "webm";
    const a = document.createElement("a");
    a.href = capturedVideo;
    a.download = `video_${selectedFormat.id}_${Date.now()}.${ext}`;
    a.click();
  }, [capturedVideo, selectedFormat]);

  const retake = () => {
    setCapturedImage(null);
    setCapturedVideo(null);
    setRecordSeconds(0);
  };

  const toggleCamera = () => {
    if (isRecording) stopRecording();
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    retake();
  };

  const switchFormat = (fmt: (typeof FORMATS)[0]) => {
    if (isRecording) stopRecording();
    setSelectedFormat(fmt);
    retake();
  };

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const hasResult = !!capturedImage || !!capturedVideo;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          height: HEADER_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
        }}
      >
        {/* Left: Format switcher OR Ulangi */}
        {!hasResult ? (
          <div
            style={{
              display: "flex",
              gap: 3,
              background: "rgba(0,0,0,0.45)",
              borderRadius: 18,
              padding: "3px",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(8px)",
            }}
          >
            {FORMATS.map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => switchFormat(fmt)}
                style={{
                  padding: "3px 9px",
                  borderRadius: 14,
                  border: "none",
                  cursor: "pointer",
                  background:
                    selectedFormat.id === fmt.id
                      ? "linear-gradient(135deg,#7c3aed,#a855f7)"
                      : "transparent",
                  color:
                    selectedFormat.id === fmt.id ? "#fff" : "rgba(255,255,255,0.5)",
                  fontWeight: selectedFormat.id === fmt.id ? 700 : 500,
                  fontSize: 10,
                  transition: "all 0.2s",
                  lineHeight: 1.4,
                }}
              >
                <div>{fmt.label}</div>
                <div style={{ fontSize: 8, opacity: 0.7 }}>{fmt.sublabel}</div>
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={retake}
            style={{
              padding: "4px 11px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ↩ Ulangi
          </button>
        )}

        {/* Right: Mode switcher OR Simpan */}
        {!hasResult ? (
          <div
            style={{
              display: "flex",
              gap: 3,
              background: "rgba(0,0,0,0.45)",
              borderRadius: 18,
              padding: "3px",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(8px)",
            }}
          >
            {(["photo", "video"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "3px 9px",
                  borderRadius: 14,
                  border: "none",
                  cursor: "pointer",
                  background:
                    mode === m
                      ? m === "video"
                        ? "linear-gradient(135deg,#dc2626,#ef4444)"
                        : "linear-gradient(135deg,#7c3aed,#a855f7)"
                      : "transparent",
                  color: mode === m ? "#fff" : "rgba(255,255,255,0.5)",
                  fontWeight: mode === m ? 700 : 500,
                  fontSize: 10,
                  transition: "all 0.2s",
                }}
              >
                {m === "photo" ? "📷 Foto" : "🎥 Video"}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={capturedImage ? downloadImage : downloadVideo}
            style={{
              padding: "4px 11px",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg,#7c3aed,#a855f7)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ⬇ Simpan
          </button>
        )}
      </div>

      {/* ── CAMERA VIEWPORT ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <video ref={videoRef} style={{ display: "none" }} playsInline muted />

        {/* Live canvas */}
        {!hasResult && (
          <canvas
            ref={canvasRef}
            width={PREVIEW_W}
            height={PREVIEW_H}
            style={{ display: "block", width: PREVIEW_W, height: PREVIEW_H }}
          />
        )}

        {/* Captured photo */}
        {capturedImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedImage}
            alt="Hasil foto"
            style={{ width: PREVIEW_W, height: PREVIEW_H, objectFit: "cover", display: "block" }}
          />
        )}

        {/* Captured video */}
        {capturedVideo && (
          <video
            src={capturedVideo}
            controls
            style={{ width: PREVIEW_W, height: PREVIEW_H, objectFit: "cover", display: "block" }}
          />
        )}

        {/* Loading */}
        {!isCameraReady && !hasResult && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {error ? (
              <div style={{ textAlign: "center", padding: 16, color: "#f87171" }}>
                <div style={{ fontSize: 28 }}>📷</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>{error}</div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    border: "3px solid rgba(124,58,237,0.3)",
                    borderTop: "3px solid #a855f7",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span style={{ color: "#6b7280", fontSize: 12 }}>Memuat kamera…</span>
              </>
            )}
          </div>
        )}

        {/* Flash */}
        {flashAnim && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,0.85)",
              animation: "flashOut 0.35s ease-out forwards",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Corner guides */}
        {!hasResult && (
          <>
            {[
              {
                top: 10,
                left: 10,
                borderTop: "2px solid rgba(255,255,255,0.4)",
                borderLeft: "2px solid rgba(255,255,255,0.4)",
              },
              {
                top: 10,
                right: 10,
                borderTop: "2px solid rgba(255,255,255,0.4)",
                borderRight: "2px solid rgba(255,255,255,0.4)",
              },
              {
                bottom: 10,
                left: 10,
                borderBottom: "2px solid rgba(255,255,255,0.4)",
                borderLeft: "2px solid rgba(255,255,255,0.4)",
              },
              {
                bottom: 10,
                right: 10,
                borderBottom: "2px solid rgba(255,255,255,0.4)",
                borderRight: "2px solid rgba(255,255,255,0.4)",
              },
            ].map((s, i) => (
              <div key={i} style={{ position: "absolute", width: 18, height: 18, ...s }} />
            ))}
          </>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div
            style={{
              position: "absolute",
              top: 56,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(6px)",
              borderRadius: 20,
              padding: "3px 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#ef4444",
                animation: "recBlink 1s ease-in-out infinite",
              }}
            />
            <span style={{ color: "#ef4444" }}>REC</span>
            <span style={{ color: "#fff" }}>{fmtTime(recordSeconds)}</span>
          </div>
        )}

        {/* Format badge */}
        {!hasResult && (
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(6px)",
              borderRadius: 10,
              padding: "2px 7px",
              fontSize: 9,
              color: "rgba(255,255,255,0.5)",
              fontWeight: 600,
              letterSpacing: "0.4px",
            }}
          >
            {selectedFormat.width}×{selectedFormat.height}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div
        style={{
          height: FOOTER_H,
          background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: "0 20px",
        }}
      >
        {/* Camera flip */}
        {hasMultipleCameras && !hasResult && (
          <button
            onClick={toggleCamera}
            title="Ganti kamera"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "1.5px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: 17,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
              transition: "all 0.2s",
            }}
          >
            🔄
          </button>
        )}

        {/* Main shutter / record */}
        {!hasResult && (
          <>
            {mode === "photo" ? (
              <button
                onClick={capturePhoto}
                disabled={!isCameraReady}
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: "50%",
                  border: "3px solid rgba(255,255,255,0.8)",
                  background: isCameraReady
                    ? "linear-gradient(135deg,#7c3aed,#a855f7)"
                    : "#374151",
                  cursor: isCameraReady ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: isCameraReady
                    ? "0 0 24px rgba(168,85,247,0.5), inset 0 0 0 5px rgba(255,255,255,0.15)"
                    : "none",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.9)",
                  }}
                />
              </button>
            ) : (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isCameraReady}
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: "50%",
                  border: isRecording
                    ? "3px solid rgba(255,255,255,0.9)"
                    : "3px solid rgba(255,255,255,0.8)",
                  background: isRecording
                    ? "#dc2626"
                    : isCameraReady
                    ? "linear-gradient(135deg,#dc2626,#ef4444)"
                    : "#374151",
                  cursor: isCameraReady ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: isCameraReady ? "0 0 24px rgba(220,38,38,0.5)" : "none",
                  transition: "all 0.2s",
                  animation: isRecording ? "recPulse 1.5s ease-in-out infinite" : "none",
                }}
              >
                {isRecording ? (
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 3,
                      background: "#fff",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.9)",
                    }}
                  />
                )}
              </button>
            )}
          </>
        )}

        {/* Camera facing label */}
        {!hasResult && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "1.5px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.07)",
              color: "#9ca3af",
              fontSize: 9,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1.3,
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: 14 }}>
              {facingMode === "environment" ? "📷" : "🤳"}
            </span>
            <span>{facingMode === "environment" ? "Belakang" : "Depan"}</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes flashOut { 0% { opacity:1; } 100% { opacity:0; } }
        @keyframes recBlink { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
        @keyframes recPulse {
          0%,100% { box-shadow: 0 0 24px rgba(220,38,38,0.5); }
          50% { box-shadow: 0 0 36px rgba(220,38,38,0.9); }
        }
        button:hover:not(:disabled) { filter: brightness(1.15); }
      `}</style>
    </div>
  );
}
