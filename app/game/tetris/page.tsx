"use client";

import React, { useState, useEffect, useCallback, useRef, CSSProperties, ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Cell = string | null;
type Board = Cell[][];
type Shape = number[][];

interface Piece {
  key: string;
  shape: Shape;
  color: string;
}

interface Position {
  r: number;
  c: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const TICK_SPEED = 500;

const TETROMINOES: Record<string, { shape: Shape; color: string }> = {
  I: { shape: [[1, 1, 1, 1]], color: "#00f5ff" },
  O: { shape: [[1, 1], [1, 1]], color: "#ffe000" },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: "#bf00ff" },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: "#00ff6a" },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: "#ff2d55" },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: "#0066ff" },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: "#ff8c00" },
};

const PIECE_KEYS = Object.keys(TETROMINOES);
const SCORE_TABLE: number[] = [0, 100, 300, 500, 800];

const EMPTY_BOARD = (): Board =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));

function randomPiece(): Piece {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  return { key, shape: TETROMINOES[key].shape, color: TETROMINOES[key].color };
}

function rotate(shape: Shape): Shape {
  return shape[0].map((_, i) => shape.map((r) => r[i]).reverse());
}

function isValid(board: Board, shape: Shape, pos: Position): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nr = pos.r + r;
      const nc = pos.c + c;
      if (nr < 0 || nr >= BOARD_HEIGHT || nc < 0 || nc >= BOARD_WIDTH) return false;
      if (board[nr][nc]) return false;
    }
  }
  return true;
}

function placePiece(board: Board, shape: Shape, pos: Position, color: string): Board {
  const next = board.map((r) => [...r]);
  shape.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v) next[pos.r + r][pos.c + c] = color;
    })
  );
  return next;
}

function clearLines(board: Board): { board: Board; cleared: number } {
  const remaining = board.filter((row) => row.some((c) => !c));
  const cleared = BOARD_HEIGHT - remaining.length;
  const newBoard: Board = [
    ...Array.from({ length: cleared }, () => Array(BOARD_WIDTH).fill(null)),
    ...remaining,
  ];
  return { board: newBoard, cleared };
}

// ─── Firework Component ───────────────────────────────────────────────────────
function Fireworks(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    const colors = ["#ff2d55", "#ffe000", "#00f5ff", "#bf00ff", "#00ff6a", "#ff8c00", "#fff"];

    function spawnBurst(x: number, y: number): void {
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 2 + Math.random() * 3,
        });
      }
    }

    let frame = 0;
    const intervalId = window.setInterval(() => {
      if (frame % 40 === 0) {
        spawnBurst(
          Math.random() * canvas.width,
          Math.random() * canvas.height * 0.6
        );
      }
      frame++;
    }, 16);

    const rafRef: { id: number | null } = { id: null };

    function draw(): void {
      if (!ctx || !canvas) return;
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.life -= 0.015;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (p.life <= 0) particles.splice(i, 1);
      }
      ctx.globalAlpha = 1;
    }

    function loop(): void {
      draw();
      rafRef.id = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      clearInterval(intervalId);
      if (rafRef.id !== null) cancelAnimationFrame(rafRef.id);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
      }}
    />
  );
}

// ─── Main Game Component ──────────────────────────────────────────────────────
export default function TetrisPage(): React.ReactElement {
  const [board, setBoard] = useState<Board>(EMPTY_BOARD());
  const [current, setCurrent] = useState<Piece | null>(null);
  const [pos, setPos] = useState<Position>({ r: 0, c: 3 });
  const [next, setNext] = useState<Piece | null>(null);
  const [score, setScore] = useState<number>(0);
  const [lines, setLines] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [started, setStarted] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);

  // ── Detect touch/mobile device ─────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const checkMobile = (): void => {
      const hasTouchScreen =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      setIsMobile(hasTouchScreen);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const boardRef = useRef<Board>(board);
  const currentRef = useRef<Piece | null>(current);
  const posRef = useRef<Position>(pos);
  const gameOverRef = useRef<boolean>(gameOver);
  const pausedRef = useRef<boolean>(paused);
  const linesRef = useRef<number>(lines);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  boardRef.current = board;
  currentRef.current = current;
  posRef.current = pos;
  gameOverRef.current = gameOver;
  pausedRef.current = paused;
  linesRef.current = lines;

  // ── Spawn next piece ────────────────────────────────────────────────────────
  const spawnNext = useCallback((nextPiece: Piece | null, currentBoard: Board): boolean => {
    const piece = nextPiece ?? randomPiece();
    const startPos: Position = {
      r: 0,
      c: Math.floor((BOARD_WIDTH - piece.shape[0].length) / 2),
    };
    if (!isValid(currentBoard, piece.shape, startPos)) return false;
    setCurrent(piece);
    setPos(startPos);
    setNext(randomPiece());
    return true;
  }, []);

  // ── Lock piece & clear lines ────────────────────────────────────────────────
  const lockPiece = useCallback((b: Board, piece: Piece, p: Position): Board => {
    const newBoard = placePiece(b, piece.shape, p, piece.color);
    const { board: clearedBoard, cleared } = clearLines(newBoard);
    setLines((l) => {
      const total = l + cleared;
      setLevel(Math.floor(total / 10) + 1);
      return total;
    });
    if (cleared > 0) {
      setScore((s) => s + SCORE_TABLE[cleared] * Math.floor(linesRef.current / 10 + 1));
    }
    setBoard(clearedBoard);
    return clearedBoard;
  }, []);

  // ── Move down ───────────────────────────────────────────────────────────────
  const moveDown = useCallback((): void => {
    if (gameOverRef.current || pausedRef.current || !currentRef.current) return;
    const b = boardRef.current;
    const piece = currentRef.current;
    const p = posRef.current;
    const newPos: Position = { ...p, r: p.r + 1 };
    if (isValid(b, piece.shape, newPos)) {
      setPos(newPos);
    } else {
      const clearedBoard = lockPiece(b, piece, p);
      const ok = spawnNext(null, clearedBoard);
      if (!ok) setGameOver(true);
    }
  }, [lockPiece, spawnNext]);

  // ── Tick ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!started || gameOver || paused) return;
    const speed = Math.max(100, TICK_SPEED - (level - 1) * 40);
    const id = setInterval(moveDown, speed);
    return () => clearInterval(id);
  }, [started, gameOver, paused, level, moveDown]);

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent): void => {
      if (gameOverRef.current || pausedRef.current || !currentRef.current) return;
      const b = boardRef.current;
      const piece = currentRef.current;
      const p = posRef.current;
      switch (e.key) {
        case "ArrowLeft": {
          const np: Position = { ...p, c: p.c - 1 };
          if (isValid(b, piece.shape, np)) setPos(np);
          break;
        }
        case "ArrowRight": {
          const np: Position = { ...p, c: p.c + 1 };
          if (isValid(b, piece.shape, np)) setPos(np);
          break;
        }
        case "ArrowDown":
          moveDown();
          break;
        case "ArrowUp":
        case "x": {
          const rotated = rotate(piece.shape);
          if (isValid(b, rotated, p)) setCurrent({ ...piece, shape: rotated });
          break;
        }
        case " ": {
          e.preventDefault();
          let dropRow = p.r;
          while (isValid(b, piece.shape, { r: dropRow + 1, c: p.c })) dropRow++;
          const np: Position = { r: dropRow, c: p.c };
          const clearedBoard = lockPiece(b, piece, np);
          const ok = spawnNext(null, clearedBoard);
          if (!ok) setGameOver(true);
          break;
        }
        case "p":
        case "P":
          setPaused((v) => !v);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, moveDown, lockPiece, spawnNext]);

  // ── Start / Restart ─────────────────────────────────────────────────────────
  function startGame(): void {
    const b = EMPTY_BOARD();
    setBoard(b);
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setPaused(false);
    const first = randomPiece();
    const startPos: Position = {
      r: 0,
      c: Math.floor((BOARD_WIDTH - first.shape[0].length) / 2),
    };
    setCurrent(first);
    setPos(startPos);
    setNext(randomPiece());
    setStarted(true);
  }

  // ── Touch handlers (swipe on board) ────────────────────────────────────────
  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>): void {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>): void {
    if (!touchStartRef.current || gameOverRef.current || pausedRef.current || !currentRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const b = boardRef.current;
    const piece = currentRef.current;
    const p = posRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) < 10) return;
      const np: Position = { ...p, c: p.c + (dx > 0 ? 1 : -1) };
      if (isValid(b, piece.shape, np)) setPos(np);
    } else {
      if (dy > 30) moveDown();
      else if (dy < -30) {
        const rotated = rotate(piece.shape);
        if (isValid(b, rotated, p)) setCurrent({ ...piece, shape: rotated });
      }
    }
    touchStartRef.current = null;
  }

  // ── Ghost piece ─────────────────────────────────────────────────────────────
  function getGhost(): Position | null {
    if (!current) return null;
    let ghostRow = pos.r;
    while (isValid(board, current.shape, { r: ghostRow + 1, c: pos.c })) ghostRow++;
    return { r: ghostRow, c: pos.c };
  }

  // ── Render cell ─────────────────────────────────────────────────────────────
  function renderCell(r: number, c: number): Cell | "ghost" {
    if (current && current.shape[r - pos.r]?.[c - pos.c]) return current.color;
    const ghost = getGhost();
    if (
      ghost &&
      current &&
      current.shape[r - ghost.r]?.[c - ghost.c] &&
      !current.shape[r - pos.r]?.[c - pos.c]
    ) {
      return "ghost";
    }
    return board[r][c];
  }

  // ── Screenshot download ─────────────────────────────────────────────────────
  async function downloadScreenshot(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js" as any);
      const html2canvas = mod.default as (el: HTMLElement, opts?: object) => Promise<HTMLCanvasElement>;
      const el = gameAreaRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, { backgroundColor: "#0a0a0f", scale: 2 });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `tetris-score-${score}.png`;
      a.click();
    } catch {
      alert("Screenshot download failed. Try again.");
    }
  }

  // ── Button action helpers ───────────────────────────────────────────────────
  function handleRotate(): void {
    const piece = currentRef.current;
    if (!piece) return;
    const rotated = rotate(piece.shape);
    if (isValid(boardRef.current, rotated, posRef.current)) {
      setCurrent({ ...piece, shape: rotated });
    }
  }

  function handleMoveLeft(): void {
    const piece = currentRef.current;
    if (!piece) return;
    const np: Position = { ...posRef.current, c: posRef.current.c - 1 };
    if (isValid(boardRef.current, piece.shape, np)) setPos(np);
  }

  function handleMoveRight(): void {
    const piece = currentRef.current;
    if (!piece) return;
    const np: Position = { ...posRef.current, c: posRef.current.c + 1 };
    if (isValid(boardRef.current, piece.shape, np)) setPos(np);
  }

  function handleHardDrop(): void {
    const piece = currentRef.current;
    if (!piece) return;
    const startPos = posRef.current;
    let dropRow = startPos.r;
    while (isValid(boardRef.current, piece.shape, { r: dropRow + 1, c: startPos.c })) dropRow++;
    const np: Position = { r: dropRow, c: startPos.c };
    const clearedBoard = lockPiece(boardRef.current, piece, np);
    const ok = spawnNext(null, clearedBoard);
    if (!ok) setGameOver(true);
  }

  // ── Next piece preview ──────────────────────────────────────────────────────
  function NextPreview(): React.ReactElement | null {
    if (!next) return null;
    const grid: (string | null)[][] = Array.from({ length: 4 }, () => Array(4).fill(null));
    const offsetR = Math.floor((4 - next.shape.length) / 2);
    const offsetC = Math.floor((4 - next.shape[0].length) / 2);
    next.shape.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v) grid[r + offsetR][c + offsetC] = next.color;
      })
    );
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2 }}>
        {grid.flat().map((color, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: 2,
              background: color ?? "rgba(255,255,255,0.04)",
              boxShadow: color ? `0 0 6px ${color}88` : "none",
            }}
          />
        ))}
      </div>
    );
  }

  // ── Shared control buttons (used in both desktop side panel & mobile row) ──
  function ControlButtons(): React.ReactElement {
    return (
      <>
        <button
          onPointerDown={(e) => { e.preventDefault(); handleRotate(); }}
          style={{ ...btnStyle("#bf00ff"), width: "100%" }}
        >
          ↻ ROTATE
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onPointerDown={(e) => { e.preventDefault(); handleMoveLeft(); }}
            style={{ ...btnStyle("#0066ff"), flex: 1, minWidth: 0 }}
          >
            ◀
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); moveDown(); }}
            style={{ ...btnStyle("#00ff6a"), flex: 1, minWidth: 0 }}
          >
            ▼
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); handleMoveRight(); }}
            style={{ ...btnStyle("#ff8c00"), flex: 1, minWidth: 0 }}
          >
            ▶
          </button>
        </div>
        <button
          onPointerDown={(e) => { e.preventDefault(); handleHardDrop(); }}
          style={{ ...btnStyle("#ff2d55"), width: "100%" }}
        >
          ⬇ DROP
        </button>
      </>
    );
  }

  const scoreStr = String(score).padStart(6, "0");

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#0a0a0f 0%,#0d0d1a 50%,#0a0f0a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Courier New', monospace",
        padding: "12px 8px",
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,245,255,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Title */}
      <div style={{ marginBottom: 12, textAlign: "center" }}>
        <div
          style={{
            fontSize: "clamp(20px,5vw,32px)",
            fontWeight: 900,
            letterSpacing: 6,
            color: "#00f5ff",
            textShadow: "0 0 20px #00f5ff, 0 0 40px #00f5ff88",
            textTransform: "uppercase",
          }}
        >
          TETRIS
        </div>
        <div style={{ fontSize: 10, color: "#444", letterSpacing: 3 }}>ARCADE</div>
      </div>

      {/* Game area */}
      <div ref={gameAreaRef} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Board */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            border: "1px solid rgba(0,245,255,0.25)",
            borderRadius: 4,
            boxShadow: "0 0 30px rgba(0,245,255,0.1), inset 0 0 30px rgba(0,0,0,0.5)",
            display: "grid",
            gridTemplateColumns: `repeat(${BOARD_WIDTH},1fr)`,
            gap: 1,
            padding: 4,
            background: "rgba(0,0,0,0.6)",
            touchAction: "none",
          }}
        >
          {Array.from({ length: BOARD_HEIGHT }, (_, r) =>
            Array.from({ length: BOARD_WIDTH }, (_, c) => {
              const color = renderCell(r, c);
              const isGhost = color === "ghost";
              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    width: "clamp(24px,7vw,30px)",
                    height: "clamp(24px,7vw,30px)",
                    borderRadius: 2,
                    background: isGhost
                      ? "rgba(255,255,255,0.06)"
                      : color
                      ? `linear-gradient(135deg, ${color}ee, ${color}88)`
                      : "rgba(255,255,255,0.02)",
                    border: isGhost
                      ? "1px dashed rgba(255,255,255,0.12)"
                      : color
                      ? `1px solid ${color}66`
                      : "1px solid rgba(255,255,255,0.03)",
                    boxShadow: !isGhost && color ? `0 0 8px ${color}66` : "none",
                    transition: "background 0.05s",
                  }}
                />
              );
            })
          )}
        </div>

        {/* Side panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 90 }}>
          {/* Stats */}
          {(
            [
              { label: "SCORE", value: String(score).padStart(6, "0") },
              { label: "LINES", value: String(lines).padStart(4, "0") },
              { label: "LEVEL", value: String(level).padStart(2, "0") },
            ] as { label: string; value: string }[]
          ).map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: "rgba(0,245,255,0.04)",
                border: "1px solid rgba(0,245,255,0.15)",
                borderRadius: 4,
                padding: "6px 10px",
              }}
            >
              <div style={{ fontSize: 9, color: "#00f5ff88", letterSpacing: 2, marginBottom: 2 }}>
                {label}
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: "#00f5ff",
                  fontWeight: 700,
                  letterSpacing: 2,
                  textShadow: "0 0 10px #00f5ff",
                }}
              >
                {value}
              </div>
            </div>
          ))}

          {/* Next preview */}
          <div
            style={{
              background: "rgba(0,245,255,0.04)",
              border: "1px solid rgba(0,245,255,0.15)",
              borderRadius: 4,
              padding: "6px 10px",
            }}
          >
            <div style={{ fontSize: 9, color: "#00f5ff88", letterSpacing: 2, marginBottom: 6 }}>
              NEXT
            </div>
            <NextPreview />
          </div>

          {/* Pause */}
          {started && !gameOver && (
            <button
              onClick={() => setPaused((v) => !v)}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                fontSize: 10,
                letterSpacing: 2,
                borderRadius: 4,
                padding: "6px 8px",
                cursor: "pointer",
                fontFamily: "'Courier New', monospace",
              }}
            >
              {paused ? "▶ RESUME" : "⏸ PAUSE"}
            </button>
          )}

          {/* ── Desktop controls: shown only on non-touch devices ── */}
          {started && !gameOver && !isMobile && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 9, color: "#00f5ff44", letterSpacing: 2, textAlign: "center", marginBottom: 2 }}>
                CONTROLS
              </div>
              <ControlButtons />
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile controls: shown only on touch devices, below the board ── */}
      {started && !gameOver && isMobile && (
        <div
          style={{
            marginTop: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "stretch",
            width: "100%",
            maxWidth: 320,
            padding: "0 8px",
          }}
        >
          <div style={{ fontSize: 9, color: "#00f5ff44", letterSpacing: 2, textAlign: "center" }}>
            CONTROLS
          </div>
          <ControlButtons />
        </div>
      )}

      {/* Start screen */}
      {!started && (
        <Overlay>
          <div
            style={{
              fontSize: "clamp(28px,8vw,48px)",
              fontWeight: 900,
              color: "#00f5ff",
              textShadow: "0 0 30px #00f5ff",
              letterSpacing: 6,
              marginBottom: 8,
            }}
          >
            TETRIS
          </div>
          <div style={{ color: "#555", fontSize: 11, letterSpacing: 3, marginBottom: 28 }}>
            PRESS START
          </div>
          <StartBtn onClick={startGame}>▶ START GAME</StartBtn>
          <div
            style={{
              marginTop: 20,
              color: "#333",
              fontSize: 10,
              lineHeight: 1.8,
              textAlign: "center",
            }}
          >
            ← → : MOVE &nbsp;|&nbsp; ↑ : ROTATE
            <br />
            ↓ : SOFT DROP &nbsp;|&nbsp; SPACE : HARD DROP
            <br />
            P : PAUSE
          </div>
        </Overlay>
      )}

      {/* Paused */}
      {paused && !gameOver && (
        <Overlay>
          <div
            style={{
              fontSize: 32,
              color: "#ffe000",
              textShadow: "0 0 20px #ffe000",
              letterSpacing: 4,
              marginBottom: 24,
            }}
          >
            PAUSED
          </div>
          <StartBtn onClick={() => setPaused(false)}>▶ RESUME</StartBtn>
        </Overlay>
      )}

      {/* Game Over */}
      {gameOver && (
        <>
          <Fireworks />
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(6px)",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg,#0d0d1a,#0a0a0f)",
                border: "1px solid rgba(255,45,85,0.5)",
                borderRadius: 16,
                padding: "40px 48px",
                textAlign: "center",
                maxWidth: 320,
                width: "90%",
                boxShadow: "0 0 60px rgba(255,45,85,0.3)",
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: 4, color: "#ff2d55", marginBottom: 12 }}>
                ─── GAME OVER ───
              </div>
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  color: "#fff",
                  textShadow: "0 0 30px #fff",
                  letterSpacing: 4,
                  marginBottom: 4,
                }}
              >
                {scoreStr}
              </div>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 3, marginBottom: 6 }}>
                FINAL SCORE
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  justifyContent: "center",
                  marginBottom: 28,
                }}
              >
                <div>
                  <div style={{ fontSize: 18, color: "#00f5ff", fontWeight: 700 }}>{lines}</div>
                  <div style={{ fontSize: 9, color: "#333", letterSpacing: 2 }}>LINES</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, color: "#bf00ff", fontWeight: 700 }}>{level}</div>
                  <div style={{ fontSize: 9, color: "#333", letterSpacing: 2 }}>LEVEL</div>
                </div>
              </div>
              <StartBtn onClick={startGame} style={{ marginBottom: 12, width: "100%" }}>
                ↺ PLAY AGAIN
              </StartBtn>
              <button
                onClick={downloadScreenshot}
                style={{
                  width: "100%",
                  background: "rgba(0,245,255,0.1)",
                  border: "1px solid rgba(0,245,255,0.3)",
                  color: "#00f5ff",
                  fontSize: 11,
                  letterSpacing: 2,
                  borderRadius: 8,
                  padding: "10px 0",
                  cursor: "pointer",
                  fontFamily: "'Courier New', monospace",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                📷 DOWNLOAD SCREENSHOT
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────
interface OverlayProps {
  children: ReactNode;
}

function Overlay({ children }: OverlayProps): React.ReactElement {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(4px)",
      }}
    >
      {children}
    </div>
  );
}

interface StartBtnProps {
  onClick: () => void;
  children: ReactNode;
  style?: CSSProperties;
}

function StartBtn({ onClick, children, style }: StartBtnProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      style={{
        background: "linear-gradient(135deg,#00f5ff22,#00f5ff11)",
        border: "1px solid #00f5ff66",
        color: "#00f5ff",
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: 3,
        borderRadius: 8,
        padding: "12px 32px",
        cursor: "pointer",
        fontFamily: "'Courier New', monospace",
        textShadow: "0 0 10px #00f5ff",
        boxShadow: "0 0 20px rgba(0,245,255,0.15)",
        transition: "all 0.2s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function btnStyle(color: string): CSSProperties {
  return {
    background: `${color}22`,
    border: `1px solid ${color}66`,
    color,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    borderRadius: 6,
    padding: "10px 14px",
    cursor: "pointer",
    fontFamily: "'Courier New', monospace",
    minWidth: 70,
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}
