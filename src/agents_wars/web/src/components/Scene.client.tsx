"use client";
import dynamic from "next/dynamic";
import React from "react";

const DisabledScene: React.FC = () => (
  <div
    className="h-[280px] w-full rounded-xl"
    style={{ background: "linear-gradient(135deg, rgba(30,58,138,0.25), rgba(2,6,23,1))" }}
    aria-hidden
    data-testid="scene-disabled"
  />
);

const ThreeScene = process.env.NEXT_PUBLIC_DISABLE_3D === "1"
  ? DisabledScene
  : dynamic(() => import("./ThreeScene"), {
      ssr: false,
      loading: () => (
        <div
          className="h-[280px] w-full animate-pulse rounded-xl bg-slate-800"
          aria-hidden
        />
      ),
    });

export default ThreeScene;


