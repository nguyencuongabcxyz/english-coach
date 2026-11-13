"use client";

import { useState } from "react";
import { Icon, ICON } from "@/components/icons";
import { ComboGame } from "./ComboGame";
import { FallingWords } from "./FallingWords";
import { MemoryGame } from "./MemoryGame";
import { GAMES, readBest, ResultView, useBest, writeBest, type GameId, type GameResult } from "./parts";
import { SPEECH_ERROR, useSpeechSupported } from "./useSpeech";

type View =
  | { kind: "hub" }
  | { kind: "play"; game: GameId; run: number }
  | { kind: "result"; game: GameId; result: GameResult; isRecord: boolean; run: number };

const MIN_WORDS = 3;

export function GamesClient({ words, recordPrefix }: { words: string[]; recordPrefix: string }) {
  const [view, setView] = useState<View>({ kind: "hub" });
  const keyOf = (game: GameId) => `${recordPrefix}:${game}`;

  const hub = () => setView({ kind: "hub" });
  const play = (game: GameId, run = 0) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setView({ kind: "play", game, run });
  };
  const finished = (game: GameId, run: number) => (result: GameResult) => {
    const best = readBest(keyOf(game));
    const isRecord = result.record > best;
    if (isRecord) writeBest(keyOf(game), result.record);
    setView({ kind: "result", game, result, isRecord, run });
  };

  let body: React.ReactNode;
  if (view.kind === "play") {
    const props = { words, onExit: hub, onDone: finished(view.game, view.run) };
    body =
      view.game === "fall" ? (
        <FallingWords key={view.run} {...props} />
      ) : view.game === "memory" ? (
        <MemoryGame key={view.run} {...props} />
      ) : (
        <ComboGame key={view.run} {...props} />
      );
  } else if (view.kind === "result") {
    body = (
      <ResultView
        game={view.game}
        result={view.result}
        isRecord={view.isRecord}
        onHub={hub}
        onAgain={() => play(view.game, view.run + 1)}
      />
    );
  } else {
    body = <Hub words={words} keyOf={keyOf} onPlay={play} />;
  }

  return <div className="mx-auto w-full max-w-[560px] px-4 pt-5 pb-8 sm:px-6">{body}</div>;
}

function Hub({ words, keyOf, onPlay }: { words: string[]; keyOf: (g: GameId) => string; onPlay: (g: GameId) => void }) {
  const supported = useSpeechSupported();
  const [all, setAll] = useState(false);
  const enough = words.length >= MIN_WORDS;
  const shown = all ? words : words.slice(0, 8);

  return (
    <div className="stagger flex flex-col gap-3">
      {supported === false && (
        <div className="flex gap-2.5 rounded-2xl bg-bad-bg px-4 py-3 text-[13px] leading-normal text-bad">
          <Icon d={ICON.info} size={18} width={2} className="mt-px shrink-0" />
          {SPEECH_ERROR.unsupported}
        </div>
      )}

      <div className="flex flex-col gap-2.5 rounded-[22px] border border-line p-4">
        <span className="text-[13px] font-semibold text-muted">Bộ từ của chủ đề · {words.length} từ</span>
        {enough ? (
          <div className="flex flex-wrap gap-1.5">
            {shown.map((w) => (
              <span key={w} className="rounded-full bg-chip px-2.5 py-1 text-xs">
                {w}
              </span>
            ))}
            {words.length > shown.length && (
              <button
                type="button"
                onClick={() => setAll(true)}
                className="cursor-pointer rounded-full bg-chip px-2.5 py-1 text-xs font-bold hover:bg-line"
              >
                +{words.length - shown.length} từ
              </button>
            )}
          </div>
        ) : (
          <p className="m-0 text-sm leading-normal text-muted">
            Chủ đề này mới có {words.length} từ vựng, cần ít nhất {MIN_WORDS} từ để chơi. Nhờ thầy cô thêm từ vựng cho chủ đề nhé!
          </p>
        )}
      </div>

      {(Object.keys(GAMES) as GameId[]).map((id) => (
        <GameCard key={id} id={id} best={keyOf(id)} disabled={!enough || supported === false} onPlay={() => onPlay(id)} />
      ))}
    </div>
  );
}

function GameCard({ id, best, disabled, onPlay }: { id: GameId; best: string; disabled: boolean; onPlay: () => void }) {
  const g = GAMES[id];
  const record = useBest(best);
  return (
    <button
      type="button"
      onClick={onPlay}
      disabled={disabled}
      className="flex w-full cursor-pointer items-center gap-4 rounded-[22px] p-4 text-left transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
      style={{ background: g.bg, color: g.ink }}
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/60 text-[30px]">{g.emoji}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[17px] font-bold">{g.title}</span>
        <span className="text-[13px] leading-snug opacity-85">{g.desc}</span>
        <span className="mt-1.5 text-xs font-bold">
          🏆 {record ? `Kỷ lục: ${g.record(record)}` : "Chưa chơi"} · {g.level}
        </span>
      </span>
      <Icon d={ICON.chevronRight} size={18} width={2} />
    </button>
  );
}
