"use client";

import { useRef, useEffect } from "react";

interface DownwardThrowCanvasProps {
  height: number;
  v0: number;
  currentY: number;
  trajectoryY: number[];
  isRunning: boolean;
  isFinished: boolean;
}

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 500;
const BALL_RADIUS = 10;
const PADDING_LEFT = 50;
const PADDING_RIGHT = 20;
const PADDING_TOP = 30;
const PADDING_BOTTOM = 35;
const GROUND_Y = CANVAS_HEIGHT - PADDING_BOTTOM;
const USABLE_HEIGHT = GROUND_Y - PADDING_TOP - BALL_RADIUS;
const CENTER_X =
  PADDING_LEFT + (CANVAS_WIDTH - PADDING_LEFT - PADDING_RIGHT) / 2;

export default function DownwardThrowCanvas({
  height,
  v0,
  currentY,
  trajectoryY,
  isRunning,
  isFinished,
}: DownwardThrowCanvasProps) {
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

    // Scale
    const displayMax = Math.max(height, 1) * 1.1;
    const scaleY = USABLE_HEIGHT / displayMax;

    const worldToCanvasY = (wy: number) => GROUND_Y - wy * scaleY;

    // Vertical axis line
    ctx.strokeStyle = "#d4d4d8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING_LEFT, PADDING_TOP);
    ctx.lineTo(PADDING_LEFT, GROUND_Y);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "right";

    const numTicks = 5;
    for (let i = 0; i <= numTicks; i++) {
      const fraction = i / numTicks;
      const worldVal = fraction * displayMax;
      const cy = worldToCanvasY(worldVal);

      ctx.beginPath();
      ctx.moveTo(PADDING_LEFT - 4, cy);
      ctx.lineTo(PADDING_LEFT + 4, cy);
      ctx.strokeStyle = "#d4d4d8";
      ctx.stroke();

      ctx.fillText(`${Math.round(worldVal)}m`, PADDING_LEFT - 8, cy + 4);
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
    for (
      let x = PADDING_LEFT + 5;
      x < CANVAS_WIDTH - PADDING_RIGHT;
      x += 12
    ) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x - 6, GROUND_Y + 8);
      ctx.stroke();
    }

    // Starting height dashed reference line
    const startCy = worldToCanvasY(height);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#a78bfa";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING_LEFT + 10, startCy);
    ctx.lineTo(CANVAS_WIDTH - PADDING_RIGHT - 10, startCy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Height label
    ctx.fillStyle = "#7c3aed";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`h = ${height}m`, PADDING_LEFT + 14, startCy - 6);

    // Trajectory dotted vertical line
    if (trajectoryY.length > 1) {
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = "#93c5fd";
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < trajectoryY.length; i++) {
        const cy = worldToCanvasY(trajectoryY[i]);
        if (i === 0) {
          ctx.moveTo(CENTER_X, cy);
        } else {
          ctx.lineTo(CENTER_X, cy);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Ball position
    const displayY = isRunning || isFinished ? currentY : height;
    const ballCy = worldToCanvasY(displayY);
    const clampedBallCy = Math.min(ballCy, GROUND_Y - BALL_RADIUS);

    // Ball shadow on ground
    if (isRunning || isFinished) {
      const heightFraction = displayY / Math.max(height, 1);
      const shadowAlpha = Math.min(0.15, 0.05 + (1 - heightFraction) * 0.1);
      ctx.fillStyle = `rgba(37, 99, 235, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(
        CENTER_X,
        GROUND_Y - 2,
        BALL_RADIUS * (0.5 + (1 - heightFraction) * 0.5),
        3,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Ball
    const gradient = ctx.createRadialGradient(
      CENTER_X - 2,
      clampedBallCy - 2,
      1,
      CENTER_X,
      clampedBallCy,
      BALL_RADIUS
    );
    gradient.addColorStop(0, "#60a5fa");
    gradient.addColorStop(1, "#2563eb");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(CENTER_X, clampedBallCy, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Ball highlight
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(CENTER_X - 2, clampedBallCy - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Downward velocity arrow
    if (isRunning) {
      const arrowLen = 30;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(CENTER_X + BALL_RADIUS + 14, clampedBallCy);
      ctx.lineTo(CENTER_X + BALL_RADIUS + 14, clampedBallCy + arrowLen);
      ctx.stroke();

      // Arrowhead
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(CENTER_X + BALL_RADIUS + 14, clampedBallCy + arrowLen);
      ctx.lineTo(
        CENTER_X + BALL_RADIUS + 10,
        clampedBallCy + arrowLen - 8
      );
      ctx.lineTo(
        CENTER_X + BALL_RADIUS + 18,
        clampedBallCy + arrowLen - 8
      );
      ctx.closePath();
      ctx.fill();
    }
  }, [height, v0, currentY, trajectoryY, isRunning, isFinished]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="rounded-xl border border-zinc-200 bg-white"
    />
  );
}
