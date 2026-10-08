"use client";

import { useEffect, useRef } from "react";
import type { Magazine } from "@/lib/types";

const KEY = (id: string) => `pdfm-funnel-${id}`;

function sessionId(magazineId: string) {
  try {
    const existing = sessionStorage.getItem(KEY(magazineId));
    if (existing && existing.length >= 8) return existing;
    const next = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(KEY(magazineId), next);
    return next;
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

function shouldTrack(magazine: Magazine, openShare?: boolean) {
  if (openShare) return false;
  if (magazine.ownerId === "demo" || magazine.id.startsWith("demo-")) return false;
  return magazine.public;
}

export function useMagazineFunnel(magazine: Magazine, page: number, openShare?: boolean) {
  const sidRef = useRef<string>("");
  const pageRef = useRef(page);
  const lastSent = useRef(0);
  const ended = useRef(false);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    if (!shouldTrack(magazine, openShare)) return;
    ended.current = false;
    sidRef.current = sessionId(magazine.id);

    function send(done: boolean) {
      const sid = sidRef.current;
      if (!sid || ended.current) return;
      const now = Date.now();
      if (!done && now - lastSent.current < 1200) return;
      if (done) ended.current = true;
      lastSent.current = now;
      const body = JSON.stringify({
        sessionId: sid,
        page: pageRef.current,
        done,
      });
      const url = `/api/magazines/${magazine.id}/funnel`;
      if (done && typeof navigator.sendBeacon === "function") {
        const ok = navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
        if (ok) return;
      }
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => undefined);
    }

    send(false);

    function onPageHide() {
      send(true);
    }

    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [magazine.id, magazine.ownerId, magazine.public, openShare]);

  useEffect(() => {
    if (!shouldTrack(magazine, openShare) || ended.current) return;
    if (!sidRef.current) return;
    const now = Date.now();
    if (now - lastSent.current < 1200) return;
    lastSent.current = now;
    void fetch(`/api/magazines/${magazine.id}/funnel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sidRef.current, page, done: false }),
      keepalive: true,
    }).catch(() => undefined);
  }, [page, magazine.id, magazine.ownerId, magazine.public, openShare]);
}
