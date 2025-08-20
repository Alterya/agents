import { useCallback, useMemo, useState } from "react";

type Provider = "openai" | "openrouter";

export type ArenaState = {
  broadcast: string;
  setBroadcast: (v: string) => void;
  promptA: string;
  setPromptA: (v: string) => void;
  promptB: string;
  setPromptB: (v: string) => void;
  reveal: boolean;
  setReveal: (v: boolean) => void;
  isRunning: boolean;
  isStarting: boolean;
  canStart: boolean;
  startArena: () => Promise<void> | void;
};

export function useArenaState(args: {
  agentId: string;
  provider: Provider;
  model: string;
  allowedModels: string[];
}) {
  const { agentId, provider, model, allowedModels } = args;

  const [broadcast, setBroadcast] = useState<string>("");
  const [promptA, setPromptA] = useState<string>("");
  const [promptB, setPromptB] = useState<string>("");
  const [reveal, setReveal] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);

  const modelAllowed = useMemo(() => {
    const trimmed = model.trim();
    if (!trimmed) return false;
    if (!allowedModels || allowedModels.length === 0) return true;
    return allowedModels.includes(trimmed);
  }, [model, allowedModels]);

  const canStart = useMemo(() => {
    if (!agentId.trim()) return false;
    if (!modelAllowed) return false;
    if (!broadcast.trim()) return false;
    return true;
  }, [agentId, modelAllowed, broadcast]);

  const startArena = useCallback(async () => {
    if (!canStart || isStarting) return;
    setIsStarting(true);
    try {
      // Placeholder implementation: mark running and clear outcome placeholders.
      setIsRunning(true);
      setReveal(false);
      // In a future step, this will start two sessions and wire polling similar to Hub.
    } finally {
      setIsStarting(false);
    }
  }, [canStart, isStarting]);

  const state: ArenaState = {
    broadcast,
    setBroadcast,
    promptA,
    setPromptA,
    promptB,
    setPromptB,
    reveal,
    setReveal,
    isRunning,
    isStarting,
    canStart,
    startArena,
  };

  return state;
}


