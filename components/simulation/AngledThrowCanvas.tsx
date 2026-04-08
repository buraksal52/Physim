"use client";

import { useRef, useEffect } from "react";

interface AngledThrowCanvasProps {
  v0: number;
  angle: number;
  trajectoryPoints: { x: number; y: number }[];
  currentX: number;
  currentY: number;
  isRunning: boolean;
  isFinished: boolean;
  totalRange: number;
  hMax: number;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 350;
const BALL_RADIUS = 8;
const PADDING_LEFT = 40;
const PADDING_RIGHT = 30;
const PADDING_TOP = 30;
const PADDING_BOTTOM = 35;
const GROUND_Y = CANVAS_HEIGHT - PADDING_BOTTOM;
const USABLE_WIDTH = CANVAS_WIDTH - PADDING_LEFT - PADDING_RIGHT;
const USABLE_HEIGHT = GROUND_Y - PADDING_TOP - BALL_RADIUS;

export default function AngledThrowCanvas({
  v0,
  angle,
  trajectoryPoints,
  currentX,
  currentY,
  isRunning,
  isFinished,
  totalRange,
  hMax,
}: AngledThrowCanvasProps) {
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

    // Dynamic scale factors based on theoretical max for the current inputs
    const displayRange = Math.max(totalRange, 10) * 1.1; // 10% padding
    const displayHeight = Math.max(hMax, 10) * 1.2; // 20% padding
    
    // Fix aspect ratio distortion (optional, but helps physics look natural)
    // We'll scale x and y independently to fit the wide canvas
    const scaleX = USABLE_WIDTH / displayRange;
    const scaleY = USABLE_HEIGHT / displayHeight;

    // Y-axis (Height)
    ctx.strokeStyle = "#d4d4d8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING_LEFT, PADDING_TOP);
    ctx.lineTo(PADDING_LEFT, GROUND_Y);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "right";

    const numYTicks = 3;
    for (let i = 0; i <= numYTicks; i++) {
        const fraction = i / numYTicks;
        const wy = fraction * displayHeight;
        const cy = GROUND_Y - wy * scaleY;

        ctx.beginPath();
        ctx.moveTo(PADDING_LEFT - 4, cy);
        ctx.lineTo(PADDING_LEFT + 4, cy);
        ctx.stroke();

        ctx.fillText(`${Math.round(wy)}m`, PADDING_LEFT - 6, cy + 3);
    }

    // X-axis (Ground line)
    ctx.strokeStyle = "#71717a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PADDING_LEFT, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH - PADDING_RIGHT + 20, GROUND_Y);
    ctx.stroke();

    // Ground hatching
    ctx.strokeStyle = "#a1a1aa";
    ctx.lineWidth = 1;
    for (let x = PADDING_LEFT + 5; x < CANVAS_WIDTH - PADDING_RIGHT + 20; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x - 6, GROUND_Y + 8);
      ctx.stroke();
    }

    // X-axis labels
    ctx.fillStyle = "#a1a1aa";
    ctx.textAlign = "center";
    const numXTicks = 5;
    for (let i = 0; i <= numXTicks; i++) {
      const fraction = i / numXTicks;
      const wx = fraction * displayRange;
      const cx = PADDING_LEFT + wx * scaleX;

      ctx.beginPath();
      ctx.moveTo(cx, GROUND_Y);
      ctx.lineTo(cx, GROUND_Y + 4);
      ctx.stroke();

      ctx.fillText(`${Math.round(wx)}m`, cx, GROUND_Y + 16);
    }

    // Launch angle visualization (only at start)
    if (!isRunning && !isFinished) {
        const angleRad = (angle * Math.PI) / 180;
        const lineLen = 40;
        
        ctx.strokeStyle = "#10b981"; // green
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(PADDING_LEFT, GROUND_Y);
        ctx.lineTo(
            PADDING_LEFT + Math.cos(angleRad) * lineLen, 
            GROUND_Y - Math.sin(angleRad) * lineLen
        );
        ctx.stroke();

        // Arc
        ctx.beginPath();
        ctx.arc(PADDING_LEFT, GROUND_Y, 20, 0, -angleRad, true);
        ctx.stroke();
        
        ctx.fillStyle = "#059669";
        ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`${angle}°`, PADDING_LEFT + 25, GROUND_Y - 10);
    }

    // Trajectory dashed curve
    if (trajectoryPoints.length > 1) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#93c5fd";
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < trajectoryPoints.length; i++) {
        const pt = trajectoryPoints[i];
        const px = PADDING_LEFT + pt.x * scaleX;
        const py = GROUND_Y - pt.y * scaleY;

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
    const clampedY = Math.max(0, currentY); // Don't sink below ground visually
    const ballPy = GROUND_Y - clampedY * scaleY;

    // Ball shadow
    if (isRunning || isFinished) {
      const heightFraction = Math.min(1, clampedY / Math.max(hMax, 1));
      const shadowAlpha = Math.max(0.05, 0.2 - heightFraction * 0.15);
      const shadowScale = 1 + heightFraction * 1.5;
      
      ctx.fillStyle = `rgba(37, 99, 235, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(
        ballPx,
        GROUND_Y - 2,
        BALL_RADIUS * shadowScale,
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
    ctx.arc(ballPx, ballPy, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(ballPx - 2, ballPy - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Max Height marker
    if (isFinished || (isRunning && currentY < hMax - 0.5 && trajectoryPoints.length > 5)) {
        // Find peak in trajectory
        let peakPt = trajectoryPoints[0];
        for(const pt of trajectoryPoints) {
            if(pt.y > peakPt.y) peakPt = pt;
        }
        
        if (peakPt && peakPt.y > 1) {
            const peakPx = PADDING_LEFT + peakPt.x * scaleX;
            const peakPy = GROUND_Y - peakPt.y * scaleY;
            
            ctx.fillStyle = "#ca8a04"; // yellow-600
            ctx.beginPath();
            ctx.arc(peakPx, peakPy, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.setLineDash([2, 4]);
            ctx.strokeStyle = "#facc15";
            ctx.beginPath();
            ctx.moveTo(PADDING_LEFT, peakPy);
            ctx.lineTo(peakPx, peakPy);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

  }, [v0, angle, trajectoryPoints, currentX, currentY, isRunning, isFinished, totalRange, hMax]);

  return (
    <div className="overflow-x-auto">
        <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="rounded-xl border border-zinc-200 bg-white min-w-[600px]"
        />
    </div>
  );
}
