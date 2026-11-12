"use client";

import { useRef, useState } from "react";
import { Icon, ICON } from "./icons";

/** Reads English text aloud with the browser's speech synthesis ("Nghe mẫu"). */
export function SpeakButton({ text, label = "Nghe mẫu", className = "" }: { text: string; label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-GB";
        u.rate = 0.85;
        const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith("en"));
        if (v) u.voice = v;
        window.speechSynthesis.speak(u);
      }}
      className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold hover:bg-line ${className}`}
    >
      <Icon d={ICON.speaker} size={12} width={2} /> {label}
    </button>
  );
}

/** Plays back a stored recording ("Nghe lại bài nói"). */
export function PlayRecording({ src, className, label = "Nghe lại bài nói" }: { src: string; className: string; label?: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          const a = (ref.current ??= new Audio(src));
          a.onended = () => setPlaying(false);
          if (playing) {
            a.pause();
            setPlaying(false);
          } else {
            a.currentTime = 0;
            a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
          }
        }}
      >
        <Icon d={playing ? ICON.close : ICON.play} size={14} /> {playing ? "Dừng" : label}
      </button>
    </>
  );
}
