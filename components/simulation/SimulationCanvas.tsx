"use client";

import { useRef, useEffect } from "react";

interface SimulationCanvasProps {
  height: number; // total drop height in meters
  currentDistance: number; // distance fallen so far in meters
  isRunning: boolean;
  isFinished: boolean;
}

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 400;
const BALL_RADIUS = 12;
const TOP_PADDING = 30;
const GROUND_Y = CANVAS_HEIGHT - 30;
const USABLE_HEIGHT = GROUND_Y - TOP_PADDING - BALL_RADIUS;

export default function SimulationCanvas({
  height,
  currentDistance,
  isRunning,
  isFinished,
}: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Height scale (left side)
    const scaleX = 30;
    ctx.strokeStyle = "#d4d4d8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(scaleX, TOP_PADDING);
    ctx.lineTo(scaleX, GROUND_Y);
    ctx.stroke();

    // Height labels
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "right";

    const numTicks = 5;
    for (let i = 0; i <= numTicks; i++) {
      const fraction = i / numTicks;
      const y = TOP_PADDING + fraction * USABLE_HEIGHT;
      const label = Math.round(fraction * height);

      ctx.beginPath();
      ctx.moveTo(scaleX - 4, y);
      ctx.lineTo(scaleX + 4, y);
      ctx.stroke();

      ctx.fillText(`${label}m`, scaleX - 8, y + 4);
    }

    // Ground line
    ctx.strokeStyle = "#71717a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH - 20, GROUND_Y);
    ctx.stroke();

    // Ground hatching
    ctx.strokeStyle = "#a1a1aa";
    ctx.lineWidth = 1;
    for (let x = 65; x < CANVAS_WIDTH - 20; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x - 6, GROUND_Y + 8);
      ctx.stroke();
    }

    // Ball position
    const fraction = height > 0 ? Math.min(currentDistance / height, 1) : 0;
    const ballY = TOP_PADDING + BALL_RADIUS + fraction * USABLE_HEIGHT;
    const ballX = CANVAS_WIDTH / 2 + 20;

    // Drop line (dashed)
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#d4d4d8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ballX, TOP_PADDING + BALL_RADIUS);
    ctx.lineTo(ballX, GROUND_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ball shadow
    if (isRunning || isFinished) {
      const shadowAlpha = Math.min(0.15, 0.05 + fraction * 0.1);
      ctx.fillStyle = `rgba(37, 99, 235, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(
        ballX,
        GROUND_Y - 2,
        BALL_RADIUS * (0.5 + fraction * 0.5),
        3,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Ball
    const gradient = ctx.createRadialGradient(
      ballX - 3,
      ballY - 3,
      2,
      ballX,
      ballY,
      BALL_RADIUS
    );
    gradient.addColorStop(0, "#60a5fa");
    gradient.addColorStop(1, "#2563eb");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Ball highlight
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(ballX - 3, ballY - 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [height, currentDistance, isRunning, isFinished]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="rounded-xl border border-zinc-200 bg-white"
    />
  );
}
