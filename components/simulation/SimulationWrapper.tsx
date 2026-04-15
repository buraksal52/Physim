"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Simulasyon } from "@/lib/types";
import {
  calculateFreeFall,
  positionAtTime,
  velocityAtTime,
} from "@/lib/physics/freeFall";
import {
  calculateProjectile,
  getProjectilePosition,
} from "@/lib/physics/projectile";
import {
  calculateVerticalThrow,
  getVerticalThrowPosition,
} from "@/lib/physics/verticalThrow";
import {
  calculateDownwardThrow,
  getDownwardThrowPosition,
} from "@/lib/physics/downwardThrow";
import {
  calculateAngledThrow,
  getAngledThrowPosition,
} from "@/lib/physics/angledThrow";
import { getNewton1Position } from "@/lib/physics/newton1";
import { getNewton2Position } from "@/lib/physics/newton2";
import { calculateCollision, getImpactForce } from "@/lib/physics/newton3";
import ControlPanel from "./ControlPanel";
import SimulationCanvas from "./SimulationCanvas";
import ObservationPanel from "./ObservationPanel";
import ProjectileControlPanel from "./ProjectileControlPanel";
import ProjectileCanvas from "./ProjectileCanvas";
import ProjectileObservationPanel from "./ProjectileObservationPanel";
import VerticalThrowCanvas from "./VerticalThrowCanvas";
import VerticalThrowControlPanel from "./VerticalThrowControlPanel";
import VerticalThrowObservationPanel from "./VerticalThrowObservationPanel";
import DownwardThrowCanvas from "./DownwardThrowCanvas";
import DownwardThrowControlPanel from "./DownwardThrowControlPanel";
import DownwardThrowObservationPanel from "./DownwardThrowObservationPanel";
import AngledThrowCanvas from "./AngledThrowCanvas";
import AngledThrowControlPanel from "./AngledThrowControlPanel";
import AngledThrowObservationPanel from "./AngledThrowObservationPanel";
import CompletionCheck from "./CompletionCheck";
import VectorCanvas from "./VectorCanvas";
import ForceCanvas from "./ForceCanvas";

interface SimulationWrapperProps {
  slug: string;
  simulasyon: Simulasyon;
}

const G = 9.8;
const TIME_SCALE = 1.0;

export default function SimulationWrapper({
  slug,
  simulasyon,
}: SimulationWrapperProps) {
  if (simulasyon.tip === "yatay-atis") {
    return <ProjectileSimulation slug={slug} simulasyon={simulasyon} />;
  }

  if (simulasyon.tip === "kuvvet") {
    return <ForceCanvas slug={slug} simulation={simulasyon} onComplete={() => {}} />;
  }

  if (simulasyon.tip === "asagidan-yukari-atis") {
    return <VerticalThrowSimulation slug={slug} simulasyon={simulasyon} />;
  }

  if (simulasyon.tip === "yukaridan-asagi-atis") {
    return <DownwardThrowSimulation slug={slug} simulasyon={simulasyon} />;
  }

  if (simulasyon.tip === "egik-atis") {
    return <AngledThrowSimulation slug={slug} simulasyon={simulasyon} />;
  }

  if (simulasyon.tip === "newton-1") {
    return <Newton1Simulation slug={slug} simulasyon={simulasyon} />;
  }

  if (simulasyon.tip === "newton-2") {
    return <Newton2Simulation slug={slug} simulasyon={simulasyon} />;
  }

  if (simulasyon.tip === "newton-3") {
    return <Newton3Simulation slug={slug} simulasyon={simulasyon} />;
  }

  if (simulasyon.tip === "vektorler") {
    return <VectorCanvas slug={slug} simulasyon={simulasyon} />;
  }

  return <FreeFallSimulation slug={slug} simulasyon={simulasyon} />;
}

/* ─── Free Fall Simulation (existing logic, unchanged) ─── */

function FreeFallSimulation({
  slug,
  simulasyon,
}: SimulationWrapperProps) {
  const [height, setHeight] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [currentVelocity, setCurrentVelocity] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [finalTime, setFinalTime] = useState(0);

  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const handleStart = useCallback(() => {
    if (isRunning) return;

    setIsRunning(true);
    setIsFinished(false);
    setCurrentDistance(0);
    setCurrentVelocity(0);
    setElapsedTime(0);
    setFinalTime(0);

    const totalTime = calculateFreeFall(height, G).t;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const rawElapsed = (now - startTimeRef.current) / 1000;
      const elapsed = rawElapsed * TIME_SCALE;

      if (elapsed >= totalTime) {
        // Finished
        const result = calculateFreeFall(height, G);
        setCurrentDistance(height);
        setCurrentVelocity(result.v);
        setElapsedTime(result.t);
        setFinalTime(result.t);
        setIsRunning(false);
        setIsFinished(true);
        return;
      }

      const dist = positionAtTime(elapsed, G);
      const vel = velocityAtTime(elapsed, G);

      setCurrentDistance(Math.min(dist, height));
      setCurrentVelocity(vel);
      setElapsedTime(elapsed);

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [isRunning, height]);

  const handleReset = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsRunning(false);
    setIsFinished(false);
    setCurrentDistance(0);
    setCurrentVelocity(0);
    setElapsedTime(0);
    setFinalTime(0);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <SimulationCanvas
          height={height}
          currentDistance={currentDistance}
          isRunning={isRunning}
          isFinished={isFinished}
        />
        <div className="flex flex-col gap-4">
          <ControlPanel
            height={height}
            onHeightChange={setHeight}
            onStart={handleStart}
            onReset={handleReset}
            isRunning={isRunning}
            isFinished={isFinished}
          />
          <ObservationPanel
            height={height}
            currentVelocity={currentVelocity}
            elapsedTime={elapsedTime}
            currentDistance={currentDistance}
            isRunning={isRunning}
            isFinished={isFinished}
          />
        </div>
      </div>
      <CompletionCheck
        slug={slug}
        zorunluDeney={simulasyon.zorunlu_deney}
        observedValue={finalTime}
        isFinished={isFinished}
      />
    </div>
  );
}

/* ─── Projectile (Yatay Atış) Simulation ─── */

function ProjectileSimulation({
  slug,
  simulasyon,
}: SimulationWrapperProps) {
  const [height, setHeight] = useState(20);
  const [v0, setV0] = useState(15);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [finalRange, setFinalRange] = useState(0);
  const [trajectoryPoints, setTrajectoryPoints] = useState<
    { x: number; y: number }[]
  >([]);

  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const trajectoryRef = useRef<{ x: number; y: number }[]>([]);

  const handleStart = useCallback(() => {
    if (isRunning) return;

    setIsRunning(true);
    setIsFinished(false);
    setCurrentX(0);
    setCurrentY(height);
    setElapsedTime(0);
    setFinalRange(0);

    // Reset trajectory
    trajectoryRef.current = [{ x: 0, y: height }];
    setTrajectoryPoints([{ x: 0, y: height }]);

    const { t: totalTime, range } = calculateProjectile(height, v0, G);
    startTimeRef.current = performance.now();

    let lastTrajectoryTime = 0;

    const animate = (now: number) => {
      const rawElapsed = (now - startTimeRef.current) / 1000;
      const elapsed = rawElapsed * TIME_SCALE;

      if (elapsed >= totalTime) {
        // Finished — land on ground
        setCurrentX(range);
        setCurrentY(0);
        setElapsedTime(totalTime);
        setFinalRange(range);
        setIsRunning(false);
        setIsFinished(true);

        // Add final point
        trajectoryRef.current.push({ x: range, y: 0 });
        setTrajectoryPoints([...trajectoryRef.current]);
        return;
      }

      const pos = getProjectilePosition(v0, height, elapsed, G);
      setCurrentX(pos.x);
      setCurrentY(pos.y);
      setElapsedTime(elapsed);

      // Record trajectory points at intervals
      if (elapsed - lastTrajectoryTime > 0.05) {
        trajectoryRef.current.push({ x: pos.x, y: pos.y });
        setTrajectoryPoints([...trajectoryRef.current]);
        lastTrajectoryTime = elapsed;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [isRunning, height, v0]);

  const handleReset = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsRunning(false);
    setIsFinished(false);
    setCurrentX(0);
    setCurrentY(0);
    setElapsedTime(0);
    setFinalRange(0);
    trajectoryRef.current = [];
    setTrajectoryPoints([]);
  }, []);

  // Calculate theoretical range for display scaling
  const theoreticalRange = calculateProjectile(height, v0, G).range;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <ProjectileCanvas
          height={height}
          v0={v0}
          trajectoryPoints={trajectoryPoints}
          currentX={currentX}
          currentY={isRunning || isFinished ? currentY : height}
          isRunning={isRunning}
          isFinished={isFinished}
          totalRange={theoreticalRange}
        />
        <div className="flex flex-col gap-4">
          <ProjectileControlPanel
            height={height}
            velocity={v0}
            onHeightChange={setHeight}
            onVelocityChange={setV0}
            onStart={handleStart}
            onReset={handleReset}
            isRunning={isRunning}
            isFinished={isFinished}
          />
          <ProjectileObservationPanel
            height={height}
            v0={v0}
            currentX={currentX}
            currentY={isRunning || isFinished ? currentY : height}
            elapsedTime={elapsedTime}
            finalRange={finalRange}
            isRunning={isRunning}
            isFinished={isFinished}
          />
        </div>
      </div>
      <CompletionCheck
        slug={slug}
        zorunluDeney={simulasyon.zorunlu_deney}
        observedValue={finalRange}
        isFinished={isFinished}
      />
    </div>
  );
}

/* ─── Vertical Throw (Aşağıdan Yukarı Atış) Simulation ─── */

function VerticalThrowSimulation({
  slug,
  simulasyon,
}: SimulationWrapperProps) {
  const [v0, setV0] = useState(25);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentY, setCurrentY] = useState(0);
  const [currentV, setCurrentV] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [atPeak, setAtPeak] = useState(false);
  const [peakReached, setPeakReached] = useState(false);
  const [finalHMax, setFinalHMax] = useState(0);
  const [trajectoryY, setTrajectoryY] = useState<number[]>([]);

  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const trajectoryRef = useRef<number[]>([]);
  const peakFlagRef = useRef(false);

  const { hMax, tTotal } = calculateVerticalThrow(v0, G);

  const handleStart = useCallback(() => {
    if (isRunning) return;

    setIsRunning(true);
    setIsFinished(false);
    setCurrentY(0);
    setCurrentV(v0);
    setElapsedTime(0);
    setAtPeak(false);
    setPeakReached(false);
    setFinalHMax(0);
    peakFlagRef.current = false;

    trajectoryRef.current = [0];
    setTrajectoryY([0]);

    const { tTotal: totalTime, hMax: maxH } = calculateVerticalThrow(v0, G);
    startTimeRef.current = performance.now();

    let lastTrajectoryTime = 0;

    const animate = (now: number) => {
      const rawElapsed = (now - startTimeRef.current) / 1000;
      const elapsed = rawElapsed * TIME_SCALE;

      if (elapsed >= totalTime) {
        // Finished — back on ground
        setCurrentY(0);
        setCurrentV(0);
        setElapsedTime(totalTime);
        setFinalHMax(maxH);
        setIsRunning(false);
        setIsFinished(true);
        setAtPeak(false);

        trajectoryRef.current.push(0);
        setTrajectoryY([...trajectoryRef.current]);
        return;
      }

      const pos = getVerticalThrowPosition(v0, elapsed, G);
      setCurrentY(pos.y);
      setCurrentV(pos.v);
      setElapsedTime(elapsed);

      // Detect peak: when velocity crosses zero
      const tZirve = v0 / G;
      const nearPeak = Math.abs(elapsed - tZirve) < 0.08;
      if (nearPeak && !peakFlagRef.current) {
        peakFlagRef.current = true;
        setAtPeak(true);
        setPeakReached(true);
        setFinalHMax(maxH);
      } else if (!nearPeak && peakFlagRef.current) {
        setAtPeak(false);
      }

      // Record trajectory
      if (elapsed - lastTrajectoryTime > 0.03) {
        trajectoryRef.current.push(pos.y);
        setTrajectoryY([...trajectoryRef.current]);
        lastTrajectoryTime = elapsed;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [isRunning, v0]);

  const handleReset = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsRunning(false);
    setIsFinished(false);
    setCurrentY(0);
    setCurrentV(0);
    setElapsedTime(0);
    setAtPeak(false);
    setPeakReached(false);
    setFinalHMax(0);
    peakFlagRef.current = false;
    trajectoryRef.current = [];
    setTrajectoryY([]);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <VerticalThrowCanvas
          v0={v0}
          hMax={hMax}
          currentY={currentY}
          trajectoryY={trajectoryY}
          isRunning={isRunning}
          isFinished={isFinished}
          atPeak={atPeak}
        />
        <div className="flex flex-col gap-4">
          <VerticalThrowControlPanel
            v0={v0}
            onV0Change={setV0}
            onStart={handleStart}
            onReset={handleReset}
            isRunning={isRunning}
            isFinished={isFinished}
          />
          <VerticalThrowObservationPanel
            currentY={currentY}
            currentV={currentV}
            elapsedTime={elapsedTime}
            hMax={isFinished || peakReached ? finalHMax : hMax}
            isRunning={isRunning}
            isFinished={isFinished}
            atPeak={atPeak}
          />
        </div>
      </div>
      <CompletionCheck
        slug={slug}
        zorunluDeney={simulasyon.zorunlu_deney}
        observedValue={finalHMax}
        isFinished={isFinished}
      />
    </div>
  );
}

/* ─── Downward Throw (Yukarıdan Aşağıya Atış) Simulation ─── */

function DownwardThrowSimulation({
  slug,
  simulasyon,
}: SimulationWrapperProps) {
  const [height, setHeight] = useState(45);
  const [v0, setV0] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentY, setCurrentY] = useState(0);
  const [currentV, setCurrentV] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [trajectoryY, setTrajectoryY] = useState<number[]>([]);

  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const trajectoryRef = useRef<number[]>([]);

  const handleStart = useCallback(() => {
    if (isRunning) return;

    setIsRunning(true);
    setIsFinished(false);
    setCurrentY(height);
    setCurrentV(v0);
    setElapsedTime(0);
    setFinalTime(0);

    trajectoryRef.current = [height];
    setTrajectoryY([height]);

    const { t: totalTime, vFinal } = calculateDownwardThrow(height, v0, G);
    startTimeRef.current = performance.now();

    let lastTrajectoryTime = 0;

    const animate = (now: number) => {
      const rawElapsed = (now - startTimeRef.current) / 1000;
      const elapsed = rawElapsed * TIME_SCALE;

      if (elapsed >= totalTime) {
        // Finished — hit ground
        setCurrentY(0);
        setCurrentV(vFinal);
        setElapsedTime(totalTime);
        setFinalTime(totalTime);
        setIsRunning(false);
        setIsFinished(true);

        trajectoryRef.current.push(0);
        setTrajectoryY([...trajectoryRef.current]);
        return;
      }

      const pos = getDownwardThrowPosition(height, v0, elapsed, G);
      setCurrentY(pos.y);
      setCurrentV(pos.v);
      setElapsedTime(elapsed);

      // Record trajectory
      if (elapsed - lastTrajectoryTime > 0.03) {
        trajectoryRef.current.push(pos.y);
        setTrajectoryY([...trajectoryRef.current]);
        lastTrajectoryTime = elapsed;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [isRunning, height, v0]);

  const handleReset = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsRunning(false);
    setIsFinished(false);
    setCurrentY(0);
    setCurrentV(0);
    setElapsedTime(0);
    setFinalTime(0);
    trajectoryRef.current = [];
    setTrajectoryY([]);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <DownwardThrowCanvas
          height={height}
          v0={v0}
          currentY={isRunning || isFinished ? currentY : height}
          trajectoryY={trajectoryY}
          isRunning={isRunning}
          isFinished={isFinished}
        />
        <div className="flex flex-col gap-4">
          <DownwardThrowControlPanel
            height={height}
            v0={v0}
            onHeightChange={setHeight}
            onV0Change={setV0}
            onStart={handleStart}
            onReset={handleReset}
            isRunning={isRunning}
            isFinished={isFinished}
          />
          <DownwardThrowObservationPanel
            height={height}
            v0={v0}
            currentY={isRunning || isFinished ? currentY : height}
            currentV={isRunning || isFinished ? currentV : v0}
            elapsedTime={elapsedTime}
            isRunning={isRunning}
            isFinished={isFinished}
          />
        </div>
      </div>
      <CompletionCheck
        slug={slug}
        zorunluDeney={simulasyon.zorunlu_deney}
        observedValue={finalTime}
        isFinished={isFinished}
      />
    </div>
  );
}

/* ─── Angled Throw (Eğik Atış) Simulation ─── */

function AngledThrowSimulation({
  slug,
  simulasyon,
}: SimulationWrapperProps) {
  const [v0, setV0] = useState(20);
  const [angle, setAngle] = useState(45);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [finalRange, setFinalRange] = useState(0);
  const [trajectoryPoints, setTrajectoryPoints] = useState<
    { x: number; y: number }[]
  >([]);

  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const trajectoryRef = useRef<{ x: number; y: number }[]>([]);

  const handleStart = useCallback(() => {
    if (isRunning) return;

    setIsRunning(true);
    setIsFinished(false);
    setCurrentX(0);
    setCurrentY(0);
    setElapsedTime(0);
    setFinalRange(0);

    // Reset trajectory
    trajectoryRef.current = [{ x: 0, y: 0 }];
    setTrajectoryPoints([{ x: 0, y: 0 }]);

    const { tTotal: totalTime, range } = calculateAngledThrow(v0, angle, G);
    startTimeRef.current = performance.now();

    let lastTrajectoryTime = 0;

    const animate = (now: number) => {
      const rawElapsed = (now - startTimeRef.current) / 1000;
      const elapsed = rawElapsed * TIME_SCALE;

      if (elapsed >= totalTime) {
        // Finished — land on ground
        setCurrentX(range);
        setCurrentY(0);
        setElapsedTime(totalTime);
        setFinalRange(range);
        setIsRunning(false);
        setIsFinished(true);

        // Add final point
        trajectoryRef.current.push({ x: range, y: 0 });
        setTrajectoryPoints([...trajectoryRef.current]);
        return;
      }

      const pos = getAngledThrowPosition(v0, angle, elapsed, G);
      setCurrentX(pos.x);
      setCurrentY(pos.y);
      setElapsedTime(elapsed);

      // Record trajectory points at intervals
      if (elapsed - lastTrajectoryTime > 0.05) {
        trajectoryRef.current.push({ x: pos.x, y: pos.y });
        setTrajectoryPoints([...trajectoryRef.current]);
        lastTrajectoryTime = elapsed;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [isRunning, v0, angle]);

  const handleReset = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsRunning(false);
    setIsFinished(false);
    setCurrentX(0);
    setCurrentY(0);
    setElapsedTime(0);
    setFinalRange(0);
    trajectoryRef.current = [];
    setTrajectoryPoints([]);
  }, []);

  const { range: theoreticalRange, hMax } = calculateAngledThrow(v0, angle, G);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-1">
        <AngledThrowCanvas
          v0={v0}
          angle={angle}
          trajectoryPoints={trajectoryPoints}
          currentX={currentX}
          currentY={currentY}
          isRunning={isRunning}
          isFinished={isFinished}
          totalRange={theoreticalRange}
          hMax={hMax}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <AngledThrowControlPanel
            v0={v0}
            angle={angle}
            onV0Change={setV0}
            onAngleChange={setAngle}
            onStart={handleStart}
            onReset={handleReset}
            isRunning={isRunning}
            isFinished={isFinished}
          />
          <AngledThrowObservationPanel
            currentX={currentX}
            currentY={currentY}
            elapsedTime={elapsedTime}
            totalRange={theoreticalRange}
            hMax={hMax}
            isRunning={isRunning}
            isFinished={isFinished}
          />
        </div>
      </div>
      <CompletionCheck
        slug={slug}
        zorunluDeney={simulasyon.zorunlu_deney}
        observedValue={finalRange}
        isFinished={isFinished}
      />
    </div>
  );
}

/* ─── Newton's 1st Law Simulation ─── */
function Newton1Simulation({
  slug,
  simulasyon,
}: SimulationWrapperProps) {
  const [v0, setV0] = useState(30);
  const [friction, setFriction] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const [currentX, setCurrentX] = useState(0);
  const [currentV, setCurrentV] = useState(v0);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const handleStart = useCallback(() => {
    if (isRunning) return;

    setIsRunning(true);
    setIsFinished(false);
    setCurrentX(0);
    setCurrentV(v0);
    setElapsedTime(0);

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const rawElapsed = (now - startTimeRef.current) / 1000;
      const elapsed = rawElapsed * TIME_SCALE;
      
      const { x, v } = getNewton1Position(v0, friction, elapsed);
      
      const maxDistance = 600; 
      if (v <= 0 || elapsed >= 5 || x > maxDistance) {
        setCurrentX(x);
        setCurrentV(v);
        setElapsedTime(Math.min(elapsed, 5));
        setIsRunning(false);
        setIsFinished(true);
        return;
      }

      setCurrentX(x);
      setCurrentV(v);
      setElapsedTime(elapsed);

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [isRunning, v0, friction]);

  const handleReset = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsRunning(false);
    setIsFinished(false);
    setCurrentX(0);
    setCurrentV(v0);
    setElapsedTime(0);
  }, [v0]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="relative w-full max-w-[600px] h-[200px] bg-white mx-auto rounded overflow-hidden shadow-inner border border-gray-200">
          <div className="absolute inset-x-0 bottom-0 h-4 bg-[#e5e7eb] border-t-2 border-[#e5e7eb]" />
          <div
            className="absolute bottom-4 w-12 h-12 bg-[#2563eb] rounded-sm shadow-md flex items-center justify-center text-xs font-bold text-white transition-none"
            style={{ left: `calc(${(currentX / 250) * 100}% - ${(currentX / 250) * 3}rem)` }}
          >
            Blok
            {/* Speed readout */}
            <div className="absolute -top-6 whitespace-nowrap text-xs font-medium text-[#18181b]">
              v = {currentV.toFixed(1)} m/s
            </div>
            {/* Velocity Indicator Arrow */}
            {currentV > 0 && (
              <div 
                className="absolute left-full top-1/2 -translate-y-1/2 h-0.5 bg-[#2563eb]"
                style={{ width: `${currentV}px` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-[#2563eb] rotate-45 transform translate-x-px" />
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Kontrol Paneli
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="flex justify-between text-sm font-medium text-zinc-700 mb-2">
                  <span>Başlangıç Hızı (m/s)</span>
                  <span className="font-semibold text-blue-600">{v0.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={v0}
                  onChange={(e) => { setV0(Number(e.target.value)); setCurrentV(Number(e.target.value)); }}
                  className="w-full accent-blue-600"
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className="flex justify-between text-sm font-medium text-zinc-700 mb-2">
                  <span>Sürtünme Katsayısı</span>
                  <span className="font-semibold text-blue-600">{friction.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.1"
                  value={friction}
                  onChange={(e) => setFriction(Number(e.target.value))}
                  className="w-full accent-blue-600"
                  disabled={isRunning}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={handleStart}
                disabled={isRunning}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Başlat
              </button>
              <button
                onClick={handleReset}
                disabled={isRunning && !isFinished}
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sıfırla
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
              Gözlem Paneli
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`col-span-1 rounded-lg border px-4 py-3 transition-colors ${
                  isRunning ? "border-blue-200 bg-blue-50" : "border-zinc-100 bg-zinc-50"
                }`}
              >
                <p className="text-xs text-zinc-500">Geçen Süre (t)</p>
                <p
                  className={`mt-1 font-mono text-lg font-semibold ${
                    isRunning ? "text-blue-700" : "text-zinc-900"
                  }`}
                >
                  {elapsedTime.toFixed(2)} s
                </p>
              </div>

              <div
                className={`col-span-1 rounded-lg border px-4 py-3 transition-colors ${
                  isRunning ? "border-blue-200 bg-blue-50" : "border-zinc-100 bg-zinc-50"
                }`}
              >
                <p className="text-xs text-zinc-500">Konum (x)</p>
                <p
                  className={`mt-1 font-mono text-lg font-semibold ${
                    isRunning ? "text-blue-700" : "text-zinc-900"
                  }`}
                >
                  {currentX.toFixed(1)} m
                </p>
              </div>

              <div
                className={`col-span-2 rounded-lg border px-4 py-3 transition-colors ${
                  isRunning ? "border-blue-200 bg-blue-50" : "border-zinc-100 bg-zinc-50"
                }`}
              >
                <p className="text-xs text-zinc-500">Anlık Hız (v)</p>
                <p
                  className={`mt-1 font-mono text-lg font-semibold ${
                    isRunning ? "text-blue-700" : "text-zinc-900"
                  }`}
                >
                  {currentV.toFixed(1)} m/s
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CompletionCheck
        slug={slug}
        zorunluDeney={simulasyon.zorunlu_deney}
        observedValue={isFinished && elapsedTime >= 5 ? currentV : 0}
        isFinished={isFinished && elapsedTime >= 5}
      />
    </div>
  );
}

/* ─── Newton's 2nd Law Simulation ─── */
function Newton2Simulation({
  slug,
  simulasyon,
}: SimulationWrapperProps) {
  const [mass, setMass] = useState(5);
  const [force, setForce] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const [currentX, setCurrentX] = useState(0);
  const [currentV, setCurrentV] = useState(0);
  const [currentA, setCurrentA] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const startSimulation = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
    }
    
    setIsRunning(true);
    setIsFinished(false);
    setCurrentX(0);
    setCurrentV(0);
    setCurrentA(force / mass);
    setElapsedTime(0);

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const rawElapsed = (now - startTimeRef.current) / 1000;
      const elapsed = rawElapsed * TIME_SCALE;
      
      const { x, v, a } = getNewton2Position(force, mass, elapsed);
      
      const maxDistance = 600; 
      if (elapsed >= 5 || x > maxDistance) {
        setCurrentX(x);
        setCurrentV(v);
        setCurrentA(a);
        setElapsedTime(Math.min(elapsed, 5));
        setIsRunning(false);
        setIsFinished(true);
        return;
      }

      setCurrentX(x);
      setCurrentV(v);
      setCurrentA(a);
      setElapsedTime(elapsed);

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [force, mass]);

  // Restart simulation automatically when sliders change
  useEffect(() => {
    startSimulation();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mass, force, startSimulation]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="relative w-full max-w-[600px] h-[200px] bg-white mx-auto rounded overflow-hidden shadow-inner border border-gray-200">
          <div className="absolute inset-x-0 bottom-0 h-4 bg-[#e5e7eb] border-t-2 border-[#e5e7eb]" />
          <div
            className="absolute bottom-4 w-12 h-12 bg-[#2563eb] rounded-sm shadow-md flex items-center justify-center text-xs font-bold text-white transition-none"
            style={{ left: `calc(${(currentX / Math.max(10, currentX)) * 100}% - ${(currentX / Math.max(10, currentX)) * 3}rem)` }}
          >
            {mass}kg
            {/* Force Indicator Arrow */}
            {force > 0 && (
              <div 
                className="absolute left-full top-1/2 -translate-y-1/2 h-1 bg-red-500"
                style={{ width: `${Math.max(10, force)}px` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 border-t-2 border-r-2 border-red-500 rotate-45 transform translate-x-px" />
                <div className="absolute left-full ml-2 -translate-y-1/2 whitespace-nowrap text-xs font-medium text-red-600">
                  {force} N
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Kontrol Paneli
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="flex justify-between text-sm font-medium text-zinc-700 mb-2">
                  <span>Kütle (kg)</span>
                  <span className="font-semibold text-blue-600">{mass}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={mass}
                  onChange={(e) => setMass(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="flex justify-between text-sm font-medium text-zinc-700 mb-2">
                  <span>Kuvvet (N)</span>
                  <span className="font-semibold text-blue-600">{force}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={force}
                  onChange={(e) => setForce(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
              Gözlem Paneli
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`col-span-1 rounded-lg border px-4 py-3 transition-colors ${
                  isRunning ? "border-blue-200 bg-blue-50" : "border-zinc-100 bg-zinc-50"
                }`}
              >
                <p className="text-xs text-zinc-500">Geçen Süre (t)</p>
                <p
                  className={`mt-1 font-mono text-lg font-semibold ${
                    isRunning ? "text-blue-700" : "text-zinc-900"
                  }`}
                >
                  {elapsedTime.toFixed(2)} s
                </p>
              </div>

              <div
                className={`col-span-1 rounded-lg border px-4 py-3 transition-colors ${
                  isRunning ? "border-blue-200 bg-blue-50" : "border-zinc-100 bg-zinc-50"
                }`}
              >
                <p className="text-xs text-zinc-500">Konum (x)</p>
                <p
                  className={`mt-1 font-mono text-lg font-semibold ${
                    isRunning ? "text-blue-700" : "text-zinc-900"
                  }`}
                >
                  {currentX.toFixed(1)} m
                </p>
              </div>

              <div
                className={`col-span-1 rounded-lg border px-4 py-3 transition-colors ${
                  isRunning ? "border-blue-200 bg-blue-50" : "border-zinc-100 bg-zinc-50"
                }`}
              >
                <p className="text-xs text-zinc-500">Hız (v)</p>
                <p
                  className={`mt-1 font-mono text-lg font-semibold ${
                    isRunning ? "text-blue-700" : "text-zinc-900"
                  }`}
                >
                  {currentV.toFixed(1)} m/s
                </p>
              </div>

              <div
                className={`col-span-1 rounded-lg border px-4 py-3 transition-colors ${
                  isRunning ? "border-blue-200 bg-blue-50" : "border-zinc-100 bg-zinc-50"
                }`}
              >
                <p className="text-xs text-zinc-500">İvme (a)</p>
                <p
                  className={`mt-1 font-mono text-lg font-semibold ${
                    isRunning ? "text-blue-700" : "text-zinc-900"
                  }`}
                >
                  {currentA.toFixed(2)} m/s²
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CompletionCheck
        slug={slug}
        zorunluDeney={simulasyon.zorunlu_deney}
        observedValue={currentA}
        isFinished={true}
      />
    </div>
  );
}

/* ─── Newton's 3rd Law Simulation ─── */
function Newton3Simulation({
  slug,
  simulasyon,
}: SimulationWrapperProps) {
  const [m1, setM1] = useState(5);
  const [m2, setM2] = useState(5);
  const [v0, setV0] = useState(15);
  
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [hasCollided, setHasCollided] = useState(false);
  
  const initialX1 = 50;
  const initialX2 = 300;
  
  const [x1, setX1] = useState(initialX1);
  const [x2, setX2] = useState(initialX2);
  const [v1, setV1] = useState(v0);
  const [v2, setV2] = useState(0);
  const [f1, setF1] = useState(0);
  const [f2, setF2] = useState(0);
  const [collisionTime, setCollisionTime] = useState(-1);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const handleStart = useCallback(() => {
    if (isRunning) return;

    // Reset state
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
    }
    
    setIsRunning(true);
    setIsFinished(false);
    setHasCollided(false);
    setX1(initialX1);
    setX2(initialX2);
    setV1(v0);
    setV2(0);
    setF1(0);
    setF2(0);
    setCollisionTime(-1);
    setElapsedTime(0);

    startTimeRef.current = performance.now();
    let localHasCollided = false;

    const animate = (now: number) => {
      const rawElapsed = (now - startTimeRef.current) / 1000;
      const elapsed = rawElapsed * TIME_SCALE;
      const SCALE = 10;
      
      let newX1 = initialX1 + (v0 * SCALE) * elapsed;
      let newX2 = initialX2;
      let currentV1 = v0;
      let currentV2 = 0;
      
      const blockWidth = 50; 
      
      // Collision detection
      if (!localHasCollided && newX1 + blockWidth >= newX2) {
        localHasCollided = true;
        setHasCollided(true);
        setCollisionTime(elapsed);
        
        const { v1Final, v2Final } = calculateCollision(m1, v0, m2, 0, 1.0);
        
        const force1 = getImpactForce(m1, v0, v1Final, 0.1);
        const force2 = getImpactForce(m2, 0, v2Final, 0.1);
        
        setF1(force1);
        setF2(force2);
        
        setV1(v1Final);
        setV2(v2Final);
      }
      
      if (localHasCollided) {
        // Find how long ago collision happened
        // Note: setting states is async, so we use elapsed to estimate
        // If we know distance between them at collision is blockWidth:
        // Collision happened when initialX1 + v0 * tCol = initialX2 - blockWidth
        const tCol = (initialX2 - blockWidth - initialX1) / (v0 * SCALE);
        const timeSinceCol = elapsed - tCol;
        
        const { v1Final, v2Final } = calculateCollision(m1, v0, m2, 0, 1.0);
        currentV1 = v1Final;
        currentV2 = v2Final;
        
        newX1 = (initialX2 - blockWidth) + (v1Final * SCALE) * timeSinceCol;
        newX2 = initialX2 + (v2Final * SCALE) * timeSinceCol;
      }
      
      setX1(newX1);
      setX2(newX2);
      setElapsedTime(elapsed);
      
      if (newX2 > 600 || newX1 < 0 || elapsed > 10) {
        setIsRunning(false);
        setIsFinished(true);
        return;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [isRunning, m1, m2, v0]);

  const handleReset = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsRunning(false);
    setIsFinished(false);
    setHasCollided(false);
    setX1(initialX1);
    setX2(initialX2);
    setV1(v0);
    setV2(0);
    setF1(0);
    setF2(0);
    setCollisionTime(-1);
    setElapsedTime(0);
  }, [v0]);


  const showForces = hasCollided && (elapsedTime - collisionTime < 0.5) && collisionTime !== -1;
  const kuvvet_farki = Math.abs(f1 - f2);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="relative w-full max-w-[600px] h-[250px] bg-white mx-auto rounded overflow-hidden shadow-inner border border-gray-200">
          <div className="absolute inset-x-0 bottom-0 h-4 bg-[#e5e7eb] border-t-2 border-[#e5e7eb]" />
          
          {/* Block A */}
          <div
            className="absolute bottom-4 h-12 bg-[#2563eb] rounded-sm shadow-md flex items-center justify-center text-xs font-bold text-white transition-none"
            style={{ 
              left: `${x1}px`,
              width: '50px'
            }}
          >
            A ({m1}kg)
            {/* Force on A (from right to left) */}
            {showForces && (
              <div 
                className="absolute right-full top-1/2 -translate-y-1/2 h-1 bg-red-500 z-10"
                style={{ width: `${Math.min(100, f1 * 2)}px` }}
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 border-b-2 border-l-2 border-red-500 rotate-45 transform -translate-x-px" />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap text-xs font-bold text-red-600">
                  F<sub>BA</sub>
                </div>
              </div>
            )}
          </div>
          
          {/* Block B */}
          <div
            className="absolute bottom-4 h-12 bg-[#16a34a] rounded-sm shadow-md flex items-center justify-center text-xs font-bold text-white transition-none"
            style={{ 
              left: `${x2}px`, 
              width: '50px'
            }}
          >
            B ({m2}kg)
            {/* Force on B (from left to right) */}
            {showForces && (
              <div 
                className="absolute left-full top-1/2 -translate-y-1/2 h-1 bg-red-500 z-10"
                style={{ width: `${Math.min(100, f2 * 2)}px` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 border-t-2 border-r-2 border-red-500 rotate-45 transform translate-x-px" />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap text-xs font-bold text-red-600">
                  F<sub>AB</sub>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Kontrol Paneli
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="flex justify-between text-sm font-medium text-zinc-700 mb-2">
                  <span>Kütle A (kg)</span>
                  <span className="font-semibold text-blue-600">{m1}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={m1}
                  onChange={(e) => setM1(Number(e.target.value))}
                  className="w-full accent-blue-600"
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className="flex justify-between text-sm font-medium text-zinc-700 mb-2">
                  <span>Kütle B (kg)</span>
                  <span className="font-semibold text-green-600">{m2}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={m2}
                  onChange={(e) => setM2(Number(e.target.value))}
                  className="w-full accent-green-600"
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className="flex justify-between text-sm font-medium text-zinc-700 mb-2">
                  <span>Başlangıç Hızı A (m/s)</span>
                  <span className="font-semibold text-blue-600">{v0}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={v0}
                  onChange={(e) => {
                    setV0(Number(e.target.value));
                    if (!isRunning) setV1(Number(e.target.value));
                  }}
                  className="w-full accent-blue-600"
                  disabled={isRunning}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={handleStart}
                disabled={isRunning}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Başlat
              </button>
              <button
                onClick={handleReset}
                disabled={isRunning && !isFinished}
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sıfırla
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
              Gözlem Paneli
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`col-span-1 rounded-lg border px-4 py-3 transition-colors ${
                  isRunning ? "border-blue-200 bg-blue-50" : "border-zinc-100 bg-zinc-50"
                }`}
              >
                <p className="text-xs text-zinc-500">Çarpışmada F1</p>
                <p
                  className={`mt-1 font-mono text-lg font-semibold ${
                    showForces ? "text-red-600" : "text-zinc-900"
                  }`}
                >
                  {hasCollided ? f1.toFixed(1) + " N" : "--"}
                </p>
              </div>

              <div
                className={`col-span-1 rounded-lg border px-4 py-3 transition-colors ${
                  isRunning ? "border-blue-200 bg-blue-50" : "border-zinc-100 bg-zinc-50"
                }`}
              >
                <p className="text-xs text-zinc-500">Çarpışmada F2</p>
                <p
                  className={`mt-1 font-mono text-lg font-semibold ${
                    showForces ? "text-red-600" : "text-zinc-900"
                  }`}
                >
                  {hasCollided ? f2.toFixed(1) + " N" : "--"}
                </p>
              </div>

              <div
                className={`col-span-2 rounded-lg border px-4 py-3 transition-colors ${
                  isRunning ? "border-blue-200 bg-blue-50" : "border-zinc-100 bg-zinc-50"
                }`}
              >
                <p className="text-xs text-zinc-500">Kuvvet Farkı |F1 - F2|</p>
                <p
                  className={`mt-1 font-mono text-lg font-semibold ${
                    hasCollided ? "text-blue-700" : "text-zinc-900"
                  }`}
                >
                  {hasCollided ? kuvvet_farki.toFixed(2) + " N" : "--"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CompletionCheck
        slug={slug}
        zorunluDeney={simulasyon.zorunlu_deney}
        observedValue={hasCollided ? Math.round(kuvvet_farki * 10) / 10 : -99}
        isFinished={hasCollided}
      />
    </div>
  );
}
