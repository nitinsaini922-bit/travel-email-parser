"use client";

import { ArrowRight, CircleDashed, Loader2, Trash2 } from "lucide-react";
import type { KeyboardEvent } from "react";

import type { SampleEmail } from "@/lib/parser/samples";
import { cn } from "@/lib/utils";

const MAX = 20_000;

export function Composer({
  value,
  onChange,
  onParse,
  onClear,
  loading,
  samples,
  activeSample,
  onLoadSample,
  forceHeuristic,
  onToggleHeuristic,
}: {
  value: string;
  onChange: (next: string) => void;
  onParse: () => void;
  onClear: () => void;
  loading: boolean;
  samples: SampleEmail[];
  activeSample: string | null;
  onLoadSample: (sample: SampleEmail) => void;
  forceHeuristic: boolean;
  onToggleHeuristic: () => void;
}) {
  const chars = value.length;
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const overflow = chars > MAX;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      onParse();
    }
  }

  return (
    <div className="flex min-h-0 flex-col">
      {/* Section head */}
      <div className="flex items-baseline justify-between gap-3 pb-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] text-vermilion">01</span>
          <h2 className="font-display text-[22px] leading-none text-ink">Inbound enquiry</h2>
        </div>
        <span className={cn("font-mono text-[10px] tracking-[0.1em]", overflow ? "text-vermilion" : "text-ink-faint")}>
          {words} WORDS · {chars.toLocaleString()}/{MAX.toLocaleString()}
        </span>
      </div>

      {/* Samples */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="label-mono mr-1">Load sample</span>
        {samples.map((sample) => (
          <button
            key={sample.id}
            type="button"
            onClick={() => onLoadSample(sample)}
            className={cn(
              "focus-ring group border px-2 py-[5px] font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
              activeSample === sample.id
                ? "border-ink bg-ink text-paper-raised"
                : "border-rule-strong bg-paper text-ink-soft hover:border-ink hover:text-ink",
            )}
          >
            {sample.label}
            <span
              className={cn(
                "ml-1.5 transition-colors",
                activeSample === sample.id ? "text-paper-deep" : "text-vermilion",
              )}
            >
              {sample.tag}
            </span>
          </button>
        ))}
      </div>

      {/* The letter */}
      <div className="relative min-h-0 flex-1 border border-rule-strong bg-paper-raised shadow-lift">
        <div className="flex items-center justify-between border-b border-rule px-3 py-1.5">
          <span className="label-mono">Raw email body</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-ghost">
            plain text
          </span>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute bottom-0 left-[42px] top-0 z-10 w-px bg-vermilion/35" />
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            placeholder={
              "Paste the customer's email here…\n\nSubject: Two weeks in Portugal\n\nHi — we're a family of four hoping to fly from Dublin on the 8th of\nJuly for about twelve nights. Budget around €7,000 all in…"
            }
            className="ruled-surface focus-ring block h-[46vh] min-h-[320px] w-full resize-none bg-transparent pb-6 pl-14 pr-4 pt-[9px] font-mono text-[13px] leading-[28px] text-ink outline-none placeholder:text-ink-ghost lg:h-[calc(100vh-430px)]"
            style={{ backgroundAttachment: "local" }}
          />
        </div>
      </div>

      {/* Action bar */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onParse}
          disabled={loading || !value.trim()}
          className={cn(
            "focus-ring group inline-flex items-center gap-2.5 border border-ink bg-ink px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-paper-raised transition-all",
            "hover:bg-vermilion hover:border-vermilion active:translate-x-[1px] active:translate-y-[1px]",
            "disabled:cursor-not-allowed disabled:border-rule-strong disabled:bg-paper-sunk disabled:text-ink-ghost",
          )}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          ) : (
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          )}
          {loading ? "Extracting" : "Extract brief"}
        </button>

        <span className="hidden font-mono text-[10px] text-ink-ghost sm:inline">⌘ + ⏎</span>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onToggleHeuristic}
          title="Bypass the AI model and run the offline rule-based extractor"
          className={cn(
            "focus-ring inline-flex items-center gap-1.5 border px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
            forceHeuristic
              ? "border-brass bg-brass-wash text-brass"
              : "border-rule-strong bg-paper text-ink-faint hover:border-ink hover:text-ink",
          )}
        >
          <CircleDashed className="h-3 w-3" strokeWidth={2} />
          Offline engine
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={!value}
          className="focus-ring inline-flex items-center gap-1.5 border border-rule-strong bg-paper px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint transition-colors hover:border-ink hover:text-ink disabled:opacity-40 disabled:hover:border-rule-strong disabled:hover:text-ink-faint"
        >
          <Trash2 className="h-3 w-3" strokeWidth={2} />
          Clear
        </button>
      </div>
    </div>
  );
}
