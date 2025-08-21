"use client";
import { Canvas, useFrame } from "@react-three/fiber";
// Import OrbitControls directly to avoid pulling in optional drei modules (e.g., BVH)
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";

function SpinningBox({ spinning }: { spinning: boolean }) {
  const ref = useRef<any>(null);
  useFrame(() => {
    if (!spinning || !ref.current) return;
    ref.current.rotation.y += 0.005;
    ref.current.rotation.x += 0.0025;
  });
  return (
    <mesh ref={ref} rotation={[0.4, 0.3, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#3b82f6" />
    </mesh>
  );
}

export default function ThreeScene() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const spinning = useMemo(() => !prefersReducedMotion, [prefersReducedMotion]);
  return (
    <div
      style={{ width: "100%", height: 280 }}
      aria-label="3D preview"
      role="img"
      data-testid="scene-canvas"
    >
      <Canvas dpr={[1, 1.5]} shadows={false} frameloop={spinning ? "always" : "demand"}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 2]} intensity={0.8} />
        <Suspense fallback={null}>
          <SpinningBox spinning={spinning} />
        </Suspense>
        <OrbitControls enableDamping makeDefault enabled={!prefersReducedMotion} />
      </Canvas>
    </div>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}
