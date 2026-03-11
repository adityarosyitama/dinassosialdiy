"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const GRID_SIZE = 4;
const TOTAL_PIECES = GRID_SIZE * GRID_SIZE;
const IMAGES = ["/gamePuzzle1.png"];

interface PuzzlePiece {
  id: number;
  correctIndex: number;
  currentIndex: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

interface Firework {
  id: number;
  particles: Particle[];
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function FireworksCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const fireworksRef = useRef<Firework[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [
      "#FFD700","#FF6B6B","#4ECDC4","#45B7D1","#96CEB4",
      "#FFEAA7","#DDA0DD","#98FB98","#FF69B4","#c084fc",
    ];

    function createFirework(x: number, y: number) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const particles: Particle[] = [];
      const count = 70;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color,
          size: 2 + Math.random() * 3,
        });
      }
      fireworksRef.current.push({ id: idRef.current++, particles });
    }

    const launchInterval = setInterval(() => {
      const x = 80 + Math.random() * (canvas.width - 160);
      const y = 60 + Math.random() * (canvas.height * 0.55);
      createFirework(x, y);
    }, 350);

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      fireworksRef.current = fireworksRef.current.filter((fw) => {
        fw.particles = fw.particles.filter((p) => p.alpha > 0.02);
        fw.particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.09;
          p.vx *= 0.99;
          p.alpha -= 0.014;
          ctx!.save();
          ctx!.globalAlpha = p.alpha;
          ctx!.fillStyle = p.color;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.restore();
        });
        return fw.particles.length > 0;
      });
      animRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      clearInterval(launchInterval);
      cancelAnimationFrame(animRef.current);
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0,
        pointerEvents: "none",
        zIndex: 40,
        width: "100vw", height: "100vh",
      }}
    />
  );
}

export default function PuzzlePage() {
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [draggedPiece, setDraggedPiece] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [moves, setMoves] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pieceSize, setPieceSize] = useState(110);
  const celebrationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function calcSize() {
      const maxBoard = Math.min(window.innerWidth - 40, window.innerHeight - 280, 480);
      setPieceSize(Math.floor(maxBoard / GRID_SIZE));
    }
    calcSize();
    window.addEventListener("resize", calcSize);
    return () => window.removeEventListener("resize", calcSize);
  }, []);

  const initGame = useCallback(() => {
    const img = IMAGES[Math.floor(Math.random() * IMAGES.length)];
    setSelectedImage(img);
    setImageLoaded(false);
    setSolved(false);
    setMoves(0);
    setGameStarted(true);

    const initialPieces: PuzzlePiece[] = Array.from({ length: TOTAL_PIECES }, (_, i) => ({
      id: i, correctIndex: i, currentIndex: i,
    }));
    const shuffled = shuffleArray(initialPieces).map((piece, idx) => ({
      ...piece, currentIndex: idx,
    }));
    setPieces(shuffled);
  }, []);

  useEffect(() => {
    if (!selectedImage) return;
    const img = new Image();
    img.src = selectedImage;
    img.onload = () => setImageLoaded(true);
  }, [selectedImage]);

  const checkSolved = (currentPieces: PuzzlePiece[]) =>
    currentPieces.every((p) => p.currentIndex === p.correctIndex);

  const handleDragStart = (e: React.DragEvent, pieceId: number) => {
    setDraggedPiece(pieceId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetSlotIndex: number) => {
    e.preventDefault();
    if (draggedPiece === null) return;

    setPieces((prev) => {
      const dragged = prev.find((p) => p.id === draggedPiece);
      if (!dragged) return prev;
      const fromIndex = dragged.currentIndex;
      if (fromIndex === targetSlotIndex) return prev;

      const newPieces = prev.map((p) => {
        if (p.id === draggedPiece) return { ...p, currentIndex: targetSlotIndex };
        if (p.currentIndex === targetSlotIndex) return { ...p, currentIndex: fromIndex };
        return p;
      });

      setMoves((m) => m + 1);
      if (checkSolved(newPieces)) setTimeout(() => setSolved(true), 300);
      return newPieces;
    });
    setDraggedPiece(null);
  };

  const handleDownload = async () => {
    if (!celebrationRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(celebrationRef.current, {
        backgroundColor: "#0f172a",
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const link = document.createElement("a");
      link.download = "puzzle-selesai-dinsos-diy.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error(err);
    }
    setDownloading(false);
  };

  const sortedPieces = [...pieces].sort((a, b) => a.currentIndex - b.currentIndex);

  const s: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: "1rem",
      position: "relative",
      overflow: "hidden",
    },
    headerTitle: {
      fontSize: "2rem",
      fontWeight: 900,
      background: "linear-gradient(90deg, #a78bfa, #818cf8, #c084fc, #a78bfa)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundSize: "200% auto",
      animation: "shimmer 4s linear infinite",
      letterSpacing: "-0.5px",
      margin: 0,
    },
    welcomeCard: {
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(168,85,247,0.35)",
      borderRadius: "24px",
      padding: "2.5rem 2rem",
      textAlign: "center",
      maxWidth: 380,
      backdropFilter: "blur(12px)",
      animation: "floatUp 0.6s ease both",
    },
    startBtn: {
      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
      color: "white",
      border: "none",
      padding: "0.9rem 2.5rem",
      borderRadius: "14px",
      fontSize: "1.05rem",
      fontWeight: 700,
      cursor: "pointer",
      width: "100%",
      animation: "pulseGlow 2s ease-in-out infinite",
      transition: "transform 0.2s",
    },
    statsBar: {
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "12px",
      padding: "0.55rem 1.2rem",
      backdropFilter: "blur(8px)",
      fontSize: "0.88rem",
      color: "#94a3b8",
      flexWrap: "wrap",
    },
    board: {
      display: "grid",
      gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
      gap: "3px",
      padding: "6px",
      background: "rgba(255,255,255,0.04)",
      border: "2px solid rgba(168,85,247,0.35)",
      borderRadius: "16px",
      boxShadow: "0 0 50px rgba(168,85,247,0.2)",
    },
    overlay: {
      position: "fixed",
      inset: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(10px)",
    },
    modal: {
      background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 60%, #1e1b4b 100%)",
      border: "2px solid rgba(168,85,247,0.6)",
      borderRadius: "24px",
      padding: "2.5rem 2rem",
      textAlign: "center",
      maxWidth: 400,
      width: "90%",
      animation: "celebrate 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
      boxShadow: "0 0 80px rgba(168,85,247,0.5), 0 0 140px rgba(99,102,241,0.2)",
      position: "relative",
      overflow: "hidden",
    },
    modalTitle: {
      fontSize: "2rem",
      fontWeight: 900,
      background: "linear-gradient(90deg, #FFD700, #FF6B6B, #4ECDC4, #a78bfa, #FFD700)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundSize: "300% auto",
      animation: "shimmer 3s linear infinite",
      margin: "0.25rem 0",
    },
    dlBtn: {
      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
      color: "white",
      border: "none",
      padding: "0.85rem 1.5rem",
      borderRadius: "12px",
      fontSize: "0.95rem",
      fontWeight: 700,
      cursor: "pointer",
      width: "100%",
      transition: "transform 0.2s, opacity 0.2s",
    },
    replayBtn: {
      background: "rgba(255,255,255,0.07)",
      color: "#94a3b8",
      border: "1px solid rgba(255,255,255,0.15)",
      padding: "0.75rem 1.5rem",
      borderRadius: "12px",
      fontSize: "0.9rem",
      fontWeight: 600,
      cursor: "pointer",
      width: "100%",
      transition: "background 0.2s",
    },
  };

  return (
    <div style={s.page}>
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:.1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.4)} }
        @keyframes floatUp { from{transform:translateY(18px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 18px rgba(168,85,247,.4)} 50%{box-shadow:0 0 38px rgba(168,85,247,.8),0 0 60px rgba(99,102,241,.3)} }
        @keyframes celebrate { 0%{transform:scale(.5) rotate(-8deg);opacity:0} 60%{transform:scale(1.04) rotate(1.5deg);opacity:1} 100%{transform:scale(1) rotate(0)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .piece-tile { transition: transform .12s ease, box-shadow .12s ease; border: 2px solid rgba(255,255,255,.12); cursor: grab; border-radius: 6px; }
        .piece-tile:active { cursor: grabbing; }
        .piece-tile:hover { transform: scale(1.05); z-index: 10; border-color: rgba(168,85,247,.7); box-shadow: 0 0 14px rgba(168,85,247,.5); }
        .piece-tile.dragging { opacity: .45; }
      `}</style>

      {/* Stars */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {Array.from({ length: 55 }).map((_, i) => (
          <div key={i} style={{
            // position: "absolute",
            borderRadius: "50%",
            background: "white",
            width: (Math.random() * 2.5 + 0.8) + "px",
            height: (Math.random() * 2.5 + 0.8) + "px",
            left: Math.random() * 100 + "%",
            top: Math.random() * 100 + "%",
            opacity: Math.random() * 0.5 + 0.1,
            animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
            animationDelay: Math.random() * 4 + "s",
          }} />
        ))}
      </div>

      <FireworksCanvas active={solved} />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "1.25rem", position: "relative", zIndex: 10, animation: "floatUp .5s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", marginBottom: "0.2rem" }}>
          <span style={{ fontSize: "1.8rem" }}>🧩</span>
          <h1 style={s.headerTitle}>Jigsaw Puzzle</h1>
          <span style={{ fontSize: "1.8rem" }}>🧩</span>
        </div>
        <p style={{ color: "rgba(148,163,184,.85)", fontSize: "0.82rem", margin: 0 }}>
          Dinas Sosial D.I. Yogyakarta
        </p>
      </div>

      {/* Game area */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem", width: "100%" }}>
        {!gameStarted ? (
          <div style={s.welcomeCard}>
            <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>🎮</div>
            <h2 style={{ color: "#e2e8f0", fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.4rem" }}>Selamat Datang!</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.65, marginBottom: "1.5rem" }}>
              Susun <strong style={{ color: "#a78bfa" }}>16 potongan</strong> puzzle menjadi gambar yang sempurna.
              Drag &amp; drop untuk menukar posisi potongan!
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {[["🎲","Gambar Acak"],["4×4","16 Potongan"],["🏆","Kembang Api"]].map(([icon, label]) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ fontSize: "1.4rem" }}>{icon}</span>
                  <span style={{ color: "#64748b", fontSize: "0.78rem" }}>{label}</span>
                </div>
              ))}
            </div>
            <button style={s.startBtn} onClick={initGame}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
              Mulai Bermain! 🚀
            </button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={s.statsBar}>
              <span>🔄 <strong style={{ color: "#e2e8f0" }}>{moves}</strong> gerakan</span>
              <span style={{ color: "rgba(255,255,255,.18)" }}>|</span>
              <span>🖼️ Gambar dipilih acak</span>
              <span style={{ color: "rgba(255,255,255,.18)" }}>|</span>
              <button onClick={initGame} style={{
                background: "rgba(168,85,247,.2)", border: "1px solid rgba(168,85,247,.4)",
                color: "#a78bfa", padding: "0.2rem 0.7rem", borderRadius: "8px",
                cursor: "pointer", fontSize: "0.82rem", fontWeight: 600,
              }}>↺ Reset</button>
            </div>

            {/* Board */}
            {imageLoaded ? (
              <div style={s.board}>
                {sortedPieces.map((piece) => {
                  const col = piece.correctIndex % GRID_SIZE;
                  const row = Math.floor(piece.correctIndex / GRID_SIZE);
                  return (
                    <div
                      key={piece.currentIndex}
                      className={`piece-tile${draggedPiece === piece.id ? " dragging" : ""}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, piece.id)}
                      onDrop={(e) => handleDrop(e, piece.currentIndex)}
                      onDragOver={(e) => e.preventDefault()}
                      style={{
                        width: pieceSize, height: pieceSize,
                        backgroundImage: `url(${selectedImage})`,
                        backgroundSize: `${GRID_SIZE * 100}%`,
                        backgroundPosition: `${(col / (GRID_SIZE - 1)) * 100}% ${(row / (GRID_SIZE - 1)) * 100}%`,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <span style={{
                        position: "absolute", bottom: 2, right: 4,
                        fontSize: "9px", color: "rgba(255,255,255,.35)", fontWeight: 700,
                      }}>{piece.correctIndex + 1}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                width: pieceSize * GRID_SIZE + 18, height: pieceSize * GRID_SIZE + 18,
                background: "rgba(255,255,255,.04)", border: "2px solid rgba(168,85,247,.3)",
                borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#a78bfa", fontSize: "1rem",
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⏳</div>
                  <p>Memuat gambar...</p>
                </div>
              </div>
            )}

            {/* Reference image */}
            {imageLoaded && !solved && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ color: "#475569", fontSize: "0.78rem" }}>Referensi:</span>
                <div style={{
                  width: 52, height: 52,
                  backgroundImage: `url(${selectedImage})`,
                  backgroundSize: "cover", backgroundPosition: "center",
                  borderRadius: "8px", border: "2px solid rgba(168,85,247,.4)", opacity: 0.75,
                }} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Celebration Modal */}
      {solved && (
        <div style={s.overlay}>
          <div ref={celebrationRef} style={s.modal}>
            {/* shimmer overlay */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent)",
              backgroundSize: "200% 100%", animation: "shimmer 2.5s linear infinite",
            }} />

            <div style={{ fontSize: "3.5rem", marginBottom: "0.3rem" }}>🎉</div>
            <h2 style={s.modalTitle}>Selamat! 🏆</h2>
            <p style={{ color: "#e2e8f0", fontSize: "1rem", fontWeight: 700, margin: "0.3rem 0" }}>
              Puzzle Berhasil Diselesaikan!
            </p>
            <p style={{ color: "#64748b", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
              Dinas Sosial D.I. Yogyakarta
            </p>
            <div style={{
              display: "inline-block",
              background: "rgba(168,85,247,.2)", border: "1px solid rgba(168,85,247,.4)",
              borderRadius: "999px", padding: "0.25rem 0.9rem",
              color: "#a78bfa", fontSize: "0.82rem", fontWeight: 700,
              marginBottom: "1.25rem",
            }}>
              🔄 {moves} gerakan
            </div>

            {/* Completed image */}
            <div style={{
              width: 100, height: 100,
              backgroundImage: `url(${selectedImage})`,
              backgroundSize: "cover", backgroundPosition: "center",
              borderRadius: "12px", border: "3px solid rgba(255,215,0,.65)",
              margin: "0 auto 1.25rem",
              boxShadow: "0 0 24px rgba(255,215,0,.35)",
            }} />

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <button style={{ ...s.dlBtn, opacity: downloading ? 0.65 : 1, cursor: downloading ? "not-allowed" : "pointer" }}
                onClick={handleDownload} disabled={downloading}
                onMouseEnter={e => !downloading && (e.currentTarget.style.transform = "scale(1.03)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                {downloading ? "⏳ Menyimpan..." : "📥 Download Hasil"}
              </button>
              <button style={s.replayBtn} onClick={initGame}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.13)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.07)")}>
                🔄 Main Lagi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
