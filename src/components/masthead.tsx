"use client";

import { cn } from "@/lib/utils";

export interface EngineStatus {
  engine: "gemini" | "openai" | "heuristic";
  model: string;
  aiEnabled: boolean;
}

const ENGINE_LABEL: Record<EngineStatus["engine"], string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  heuristic: "Offline rules",
};

export function Masthead({ status }: { status: EngineStatus | null }) {
  const live = status?.aiEnabled ?? false;

  return (
    <header className="relative">
      <div className="h-[7px] airmail-edge" />

      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 pb-4 pt-5 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div className="flex items-end gap-4">
          {/* Monogram / postage mark */}
          <div className="relative hidden h-[62px] w-[62px] shrink-0 border-[1.5px] border-ink sm:block">
            <div className="absolute inset-[3px] hatch border border-rule" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[26px] leading-none text-ink">TD</span>
              <span className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.2em] text-ink-faint">
                est. 26
              </span>
            </div>
          </div>

          <div>
            <p className="label-mono mb-1">Unstructured inbox → booking data</p>
            <h1 className="font-display text-[34px] leading-[0.92] tracking-[-0.01em] text-ink sm:text-[44px]">
              The Travel Desk
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 md:justify-end">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block h-[7px] w-[7px] rounded-full",
                live ? "animate-blink bg-sea" : "bg-brass",
              )}
            />
            <div className="leading-tight">
              <p className="label-mono">Extraction engine</p>
              <p className="font-mono text-[12px] text-ink">
                {status ? ENGINE_LABEL[status.engine] : "connecting…"}
                {status ? (
                  <span className="text-ink-faint"> · {status.model}</span>
                ) : null}
              </p>
            </div>
          </div>

          {/* <div className="hidden h-8 w-px bg-[rgba(23,21,15,0.18)] sm:block" /> */}

          {/* <div className="leading-tight">
            <p className="label-mono">Endpoint</p>
            <p className="font-mono text-[12px] text-ink">POST /api/parse-email</p>
          </div> */}
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-5 sm:px-8">
        <div className="h-px w-full bg-[rgba(23,21,15,0.42)]" />
        <div className="mt-[3px] h-px w-full bg-[rgba(23,21,15,0.42)]" />
      </div>
    </header>
  );
}
