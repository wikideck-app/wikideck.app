"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { LiveEvent } from "@wikideck/shared";

type Handler = (event: LiveEvent) => void;
const handlers = new Set<Handler>();
const subscribers = new Set<() => void>();
let connected = false;

export function emitLive(event: LiveEvent) {
  handlers.forEach((h) => h(event));
}

export function setPushConnected(value: boolean) {
  if (connected === value) return;
  connected = value;
  subscribers.forEach((s) => s());
}

export const usePushConnected = () =>
  useSyncExternalStore(
    (cb) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    () => connected,
    () => false,
  );

export function useLiveEvents(types: LiveEvent["type"][], handler: (event: LiveEvent) => void) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  const key = types.join(",");
  useEffect(() => {
    const wanted = new Set(key.split(","));
    const h: Handler = (e) => wanted.has(e.type) && latest.current(e);
    handlers.add(h);
    return () => {
      handlers.delete(h);
    };
  }, [key]);
}

export const pollDelay = (connected: boolean, fast: number) => (connected ? 45_000 : fast);
