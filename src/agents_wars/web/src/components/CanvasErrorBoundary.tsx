"use client";
import React from "react";

type Props = { children: React.ReactNode };

type State = { hasError: boolean };

export default class CanvasErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }
  componentDidCatch(): void {}
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-200">
          WebGL not available or context lost. <button className="underline" onClick={() => this.setState({ hasError: false })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}


