"use client";
import dynamic from "next/dynamic";

const NodeGraph = dynamic(() => import("./NodeGraph"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[280px] w-full animate-pulse rounded-xl bg-slate-800"
      aria-hidden
    />
  ),
});

export default NodeGraph;


