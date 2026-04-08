"use client";

import { useRef, useEffect } from "react";

interface ProjectileCanvasProps {
  height: number;
  v0: number;
  trajectoryPoints: { x: number; y: number }[];
  currentX: number;
  currentY: number;
  isRunning: boolean;
  isFinished: boolean;
  totalRange: number;
}

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 300;
const BALL_RADIUS = 8;
const PADDING_LEFT = 40;
const PADDING_RIGHT = 20;
const PADDING_TOP = 25;
const PADDING_BOTTOM = 30;
const GROUND_Y = CANVAS_HEIGHT - PADDING_BOTTOM;
const USABLE_WIDTH = CANVAS_WIDTH - PADDING_LEFT - PADDING_RIGHT;
const USABLE_HEIGHT = GROUND_Y - PADDING_TOP - BALL_RADIUS;

export default function ProjectileCanvas({
  height,
  v0,
  trajectoryPoints,
  currentX,
  currentY,
  isRunning,
  isFinished,
  totalRange,
}: ProjectileCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Calculate scale factors
    // Max range for display: use theoretical max or current range, whichever is larger
    const maxDisplayRange = Math.max(totalRange, v0 * Math.sqrt((2 * height) / 9.8), 1);
    const scaleX = USABLE_WIDTH / maxDisplayRange;
    const scaleY = USABLE_HEIGHT / Math.max(height, 1);

    // Height scale (left side)
    ctx.strokeStyle = "#d4d4d8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING_LEFT, PADDING_TOP);
    ctx.lineTo(PADDING_LEFT, GROUND_Y);
    ctx.stroke();

    // Height labels
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "right";

    const numYTicks = 4;
    for (let i = 0; i <= numYTicks; i++) {
      const fraction = i / numYTicks;
      const yPos = PADDING_TOP + fraction * USABLE_HEIGHT;
      const label = Math.round((1 - fraction) * height);

      ctx.beginPath();
      ctx.moveTo(PADDING_LEFT - 4, yPos);
      ctx.lineTo(PADDING_LEFT + 4, yPos);
      ctx.stroke();

      ctx.fillText(`${label}m`, PADDING_LEFT - 8, yPos + 4);
    }

    // Ground line
    ctx.strokeStyle = "#71717a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PADDING_LEFT, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH - PADDING_RIGHT, GROUND_Y);
    ctx.stroke();

    // Ground hatching
    ctx.strokeStyle = "#a1a1aa";
    ctx.lineWidth = 1;
    for (let x = PADDING_LEFT + 5; x < CANVAS_WIDTH - PADDING_RIGHT; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x - 6, GROUND_Y + 8);
      ctx.stroke();
    }

    // X-axis labels
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";

    const numXTicks = 5;
    for (let i = 0; i <= numXTicks; i++) {
      const fraction = i / numXTicks;
      const xPos = PADDING_LEFT + fraction * USABLE_WIDTH;
      const label = Math.round(fraction * maxDisplayRange);

      ctx.beginPath();
      ctx.moveTo(xPos, GROUND_Y);
      ctx.lineTo(xPos, GROUND_Y + 4);
      ctx.stroke();

      ctx.fillText(`${label}m`, xPos, GROUND_Y + 16);
    }

    // Platform at top-left (launch point)
    const platformWidth = 12;
    const platformTop = PADDING_TOP;
    ctx.fillStyle = "#3f3f46";
    ctx.fillRect(
      PADDING_LEFT - 2,
      platformTop,
      platformWidth,
      4
    );
    // Platform support
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PADDING_LEFT + platformWidth / 2 - 1, platformTop + 4);
    ctx.lineTo(PADDING_LEFT + platformWidth / 2 - 1, GROUND_Y);
    ctx.stroke();

    // Trajectory dotted line
    if (trajectoryPoints.length > 1) {
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = "#93c5fd";
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < trajectoryPoints.length; i++) {
        const pt = trajectoryPoints[i];
        const px = PADDING_LEFT + pt.x * scaleX;
        const py = PADDING_TOP + (height - pt.y) * scaleY;

        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Ball position
    const ballPx = PADDING_LEFT + currentX * scaleX;
    const ballPy = PADDING_TOP + (height - currentY) * scaleY;

    // Ball shadow on ground
    if (isRunning || isFinished) {
      const fraction = currentY <= 0 ? 1 : 1 - currentY / height;
      const shadowAlpha = Math.min(0.15, 0.05 + fraction * 0.1);
      ctx.fillStyle = `rgba(37, 99, 235, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(
        ballPx,
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
      ballPx - 2,
      ballPy - 2,
      1,
      ballPx,
      ballPy,
      BALL_RADIUS
    );
    gradient.addColorStop(0, "#60a5fa");
    gradient.addColorStop(1, "#2563eb");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ballPx, Math.min(ballPy, GROUND_Y - BALL_RADIUS), BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Ball highlight
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(ballPx - 2, Math.min(ballPy, GROUND_Y - BALL_RADIUS) - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [height, v0, trajectoryPoints, currentX, currentY, isRunning, isFinished, totalRange]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="rounded-xl border border-zinc-200 bg-white"
    />
  );
}
