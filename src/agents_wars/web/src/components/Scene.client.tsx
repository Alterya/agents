"use client";
import dynamic from "next/dynamic";

const ThreeScene = dynamic(() => import("./ThreeScene"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[280px] w-full animate-pulse rounded-xl bg-slate-800"
      aria-hidden
    />
  ),
});

export default ThreeScene;


