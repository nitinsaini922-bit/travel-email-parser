"use client";

import { useEffect, useState } from "react";

import {
  BriefEmptyState,
  BriefErrorState,
  BriefLoadingState,
  BriefResult,
} from "@/components/brief-result";
import { Composer } from "@/components/composer";
import { type EngineStatus, Masthead } from "@/components/masthead";
import {
  DEFAULT_SAMPLE,
  SAMPLE_EMAILS,
  type SampleEmail,
} from "@/lib/parser/samples";
import type { ParseErrorResponse, ParseResponse } from "@/lib/parser/schema";

export default function Home() {
  const [value, setValue] = useState(DEFAULT_SAMPLE.body);
  const [activeSample, setActiveSample] = useState<string | null>(
    DEFAULT_SAMPLE.id,
  );
  const [forceHeuristic, setForceHeuristic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<EngineStatus | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) =>
        setStatus({
          engine: data.engine,
          model: data.model,
          aiEnabled: data.aiEnabled,
        }),
      )
      .catch(() => setStatus(null));
  }, []);

  function handleChange(next: string) {
    setValue(next);
    setActiveSample(null);
  }

  function handleLoadSample(sample: SampleEmail) {
    setValue(sample.body);
    setActiveSample(sample.id);
    setResult(null);
    setError(null);
  }

  function handleClear() {
    setValue("");
    setActiveSample(null);
    setResult(null);
    setError(null);
  }

  function handleToggleHeuristic() {
    setForceHeuristic((prev) => !prev);
  }

  async function handleParse() {
    if (!value.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/parse-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, forceHeuristic }),
      });
      const data: ParseResponse | ParseErrorResponse = await res.json();
      if (!data.ok) {
        setError(data.error + (data.detail ? ` — ${data.detail}` : ""));
        setResult(null);
      } else {
        setResult(data);
      }
    } catch {
      setError(
        "Could not reach the parsing API. Check your connection and try again.",
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Masthead status={status} />

      <main className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 px-5 py-6 sm:px-8 lg:grid-cols-2">
        <Composer
          value={value}
          onChange={handleChange}
          onParse={handleParse}
          onClear={handleClear}
          loading={loading}
          samples={SAMPLE_EMAILS}
          activeSample={activeSample}
          onLoadSample={handleLoadSample}
          forceHeuristic={forceHeuristic}
          onToggleHeuristic={handleToggleHeuristic}
        />

        <div className="flex min-h-0 flex-col">
          <div className="flex items-baseline gap-2 pb-3">
            <span className="font-mono text-[10px] text-vermilion">02</span>
            <h2 className="font-display text-[22px] leading-none text-ink">
              Booking brief
            </h2>
          </div>

          {loading ? (
            <BriefLoadingState engine={status?.engine} />
          ) : error ? (
            <BriefErrorState message={error} />
          ) : result ? (
            <BriefResult result={result} />
          ) : (
            <BriefEmptyState />
          )}
        </div>
      </main>
    </div>
  );
}
