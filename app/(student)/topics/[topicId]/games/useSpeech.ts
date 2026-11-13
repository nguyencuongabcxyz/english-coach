"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// The Web Speech API is not in TypeScript's DOM lib, so describe the parts we use.
type Alternative = { transcript: string };
type Result = { isFinal: boolean; length: number; [i: number]: Alternative };
type ResultEvent = { resultIndex: number; results: { length: number; [i: number]: Result } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: ResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noop = () => () => {};
/** true / false in the browser, null while server rendering. */
export function useSpeechSupported(): boolean | null {
  return useSyncExternalStore(noop, () => ctor() !== null, () => null);
}

/** One piece of speech. `id` stays the same while the recogniser refines the words. */
export type SpeechUpdate = { id: number; alts: string[]; final: boolean };
export type SpeechError = "denied" | "network" | "unsupported" | null;

/**
 * Continuous English speech recognition in the browser (free, no server call).
 * Restarts itself when the browser stops listening after a silence.
 */
export function useSpeech(onUpdate: (u: SpeechUpdate) => void) {
  const cb = useRef(onUpdate);
  useEffect(() => {
    cb.current = onUpdate;
  });

  const rec = useRef<Recognition | null>(null);
  const wanted = useRef(false);
  const nextId = useRef(0);
  const ended = useRef<(() => void)[]>([]);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState<SpeechError>(null);
  const reopen = useRef<() => void>(() => {});

  const open = useCallback(() => {
    const C = ctor();
    if (!C) {
      wanted.current = false;
      setError("unsupported");
      return;
    }
    const r = new C();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 3;
    const offset = nextId.current;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const alts: string[] = [];
        for (let k = 0; k < res.length; k++) alts.push(res[k].transcript.trim());
        const id = offset + i;
        nextId.current = Math.max(nextId.current, id + 1);
        if (alts[0]) setHeard(alts[0]);
        cb.current({ id, alts: alts.filter(Boolean), final: res.isFinal });
      }
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wanted.current = false;
        setError("denied");
      } else if (e.error === "network") {
        wanted.current = false;
        setError("network");
      }
      // "no-speech" and "aborted" are normal: onend restarts if still wanted.
    };
    r.onend = () => {
      if (rec.current === r) rec.current = null;
      if (wanted.current) {
        // Chrome stops after a pause; carry on with fresh ids after the last ones seen.
        nextId.current += 1;
        setTimeout(() => {
          if (wanted.current && !rec.current) reopen.current();
        }, 120);
      } else {
        setListening(false);
        const waiting = ended.current;
        ended.current = [];
        waiting.forEach((f) => f());
      }
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      rec.current = null;
    }
  }, []);

  useEffect(() => {
    reopen.current = open;
  }, [open]);

  const start = useCallback(() => {
    setError(null);
    wanted.current = true;
    if (!rec.current) open();
  }, [open]);

  /** Stops listening; resolves once the last words have arrived (or after a short wait). */
  const stop = useCallback(
    () =>
      new Promise<void>((resolve) => {
        wanted.current = false;
        const r = rec.current;
        if (!r) {
          setListening(false);
          resolve();
          return;
        }
        ended.current.push(resolve);
        setTimeout(resolve, 1500);
        r.stop();
      }),
    [],
  );

  /** The id the next piece of speech will get: lets a game ignore anything said before now. */
  const mark = useCallback(() => nextId.current, []);
  const clearHeard = useCallback(() => setHeard(""), []);

  useEffect(
    () => () => {
      wanted.current = false;
      rec.current?.abort();
      rec.current = null;
    },
    [],
  );

  return { start, stop, mark, listening, heard, clearHeard, error };
}

export const SPEECH_ERROR: Record<Exclude<SpeechError, null>, string> = {
  denied: "Chưa được phép dùng micro. Hãy bấm biểu tượng 🔒 trên thanh địa chỉ và cho phép micro.",
  network: "Nhận diện giọng nói cần kết nối mạng. Kiểm tra mạng rồi thử lại nhé.",
  unsupported: "Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Hãy mở bằng Chrome, Edge hoặc Safari.",
};
