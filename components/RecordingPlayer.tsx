"use client";

import { useRef } from "react";

/**
 * <audio> for MediaRecorder recordings. Chrome writes WebM files without a duration,
 * so the native player shows 0:00 / 0:00 and can't seek. Seeking far past the end once
 * makes the browser scan the file and learn the real duration.
 */
export function RecordingPlayer({ src, className = "" }: { src: string; className?: string }) {
  const fixed = useRef(false);
  return (
    <audio
      controls
      preload="metadata"
      src={src}
      className={className}
      onLoadedMetadata={(e) => {
        const a = e.currentTarget;
        if (fixed.current || Number.isFinite(a.duration)) return;
        fixed.current = true;
        const reset = () => {
          a.removeEventListener("timeupdate", reset);
          a.currentTime = 0;
        };
        a.addEventListener("timeupdate", reset);
        a.currentTime = 1e101;
      }}
    />
  );
}
