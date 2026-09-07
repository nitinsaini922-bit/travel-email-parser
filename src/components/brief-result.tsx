"use client";

import { AlertTriangle, FileQuestion } from "lucide-react";
import { useEffect, useState } from "react";

import { Chip, ChipRow, Field, Panel, Stamp } from "@/components/primitives";
import {
  URGENCY_TONE,
  label as fmtLabel,
  formatBudget,
  formatDate,
  partySummary,
  placeLabel,
} from "@/lib/format";
import type { ParseResponse, TravelBrief } from "@/lib/parser/schema";

/* -------------------------------------------------------------------------- */
/*  Empty / error states                                                      */
/* -------------------------------------------------------------------------- */

export function BriefEmptyState() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 border border-dashed border-rule-strong bg-paper-raised/60 px-6 py-16 text-center">
      <FileQuestion className="h-6 w-6 text-ink-ghost" strokeWidth={1.5} />
      <p className="font-display text-[19px] text-ink-soft">
        Nothing extracted yet
      </p>
      <p className="max-w-[34ch] font-mono text-[11px] leading-relaxed text-ink-faint">
        Paste an email on the left, or load a sample, then press Extract brief.
      </p>
    </div>
  );
}

export function BriefErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 border border-vermilion/45 bg-vermilion-wash px-6 py-16 text-center">
      <AlertTriangle className="h-6 w-6 text-vermilion" strokeWidth={1.5} />
      <p className="font-display text-[19px] text-vermilion">
        Extraction failed
      </p>
      <p className="max-w-[38ch] font-mono text-[11px] leading-relaxed text-ink-soft">
        {message}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Loading state — "the wire is transmitting"                                */
/* -------------------------------------------------------------------------- */

const WIRE_STATUS = [
  "Decoding message headers…",
  "Reading traveller intent…",
  "Cross-checking dates & route…",
  "Weighing budget & party size…",
  "Drafting the booking brief…",
];

// Relative widths give the skeleton fields a natural, non-uniform rhythm
// instead of looking like a perfectly aligned grid.
const SKELETON_ROWS = [
  { label: "w-14", value: "w-24" },
  { label: "w-10", value: "w-32" },
  { label: "w-16", value: "w-20" },
  { label: "w-12", value: "w-28" },
  { label: "w-14", value: "w-16" },
  { label: "w-10", value: "w-24" },
];

export function BriefLoadingState({ engine }: { engine?: string | null }) {
  const [statusIndex, setStatusIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const statusId = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % WIRE_STATUS.length);
    }, 1100);

    const started = Date.now();
    const clockId = setInterval(() => {
      setElapsedMs(Date.now() - started);
    }, 100);

    return () => {
      clearInterval(statusId);
      clearInterval(clockId);
    };
  }, []);

  const elapsedSeconds = (elapsedMs / 1000).toFixed(1);
  const isTakingAWhile = elapsedMs > 6000;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex h-full min-h-[320px] flex-col overflow-hidden border border-rule-strong bg-paper-raised shadow-lift"
    >
      {/* Scanning beam sweeping down the panel, like a wire photo developing */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 animate-scan bg-gradient-to-b from-vermilion/20 via-vermilion/[0.06] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px animate-scan bg-vermilion/70" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-rule px-3.5 py-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-[7px] w-[7px]">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-vermilion opacity-60" />
            <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-vermilion" />
          </span>
          <h3 className="label-mono text-ink-soft">Receiving transmission</h3>
        </div>
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-ghost">
          {isTakingAWhile && (
            <span className="rounded-sm border border-brass/40 bg-brass-wash px-1.5 py-[1px] text-brass normal-case tracking-normal">
              {elapsedSeconds}s
            </span>
          )}
          {engine ?? "engine"} <span className="animate-blink">▍</span>
        </span>
      </div>

      {/* Skeleton fields, echoing the shape of the real brief panels */}
      <div className="flex-1 space-y-2 px-3.5 py-3">
        <div className="mb-3 h-4 w-3/4 animate-pulse rounded-sm bg-ink/10" />
        <div className="mb-4 flex gap-1.5">
          <div className="h-4 w-16 animate-pulse rounded-sm bg-ink/10" />
          <div className="h-4 w-20 animate-pulse rounded-sm bg-ink/10" />
          <div className="h-4 w-24 animate-pulse rounded-sm bg-ink/10" />
        </div>

        {SKELETON_ROWS.map((row, index) => (
          <div key={row.label + index} className="flex items-baseline gap-1.5 py-[3px]">
            <div
              className={`h-2.5 shrink-0 animate-pulse rounded-sm bg-ink/10 ${row.label}`}
              style={{ animationDelay: `${index * 90}ms` }}
            />
            <span className="leader h-[0.9em] min-w-[10px] flex-1 opacity-40" aria-hidden="true" />
            <div
              className={`h-2.5 shrink-0 animate-pulse rounded-sm bg-ink/15 ${row.value}`}
              style={{ animationDelay: `${index * 90 + 45}ms` }}
            />
          </div>
        ))}
      </div>

      {/* Ticker footer: cycling status line + a printing dashed rule */}
      <div className="border-t border-rule px-3.5 py-2">
        <div
          className="mb-2 h-px w-full bg-[length:16px_1px] bg-repeat-x opacity-60"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--ink) 0 6px, transparent 6px 12px)",
          }}
        />
        <p
          key={statusIndex}
          className="animate-rise-in font-mono text-[11px] tracking-[0.02em] text-ink-soft"
        >
          {WIRE_STATUS[statusIndex]}
        </p>
        {isTakingAWhile && (
          <p className="mt-1 font-mono text-[10px] tracking-[0.02em] text-ink-ghost">
            Still on the line — larger emails and the AI engine can take a little longer.
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Full brief                                                                 */
/* -------------------------------------------------------------------------- */

export function BriefResult({ result }: { result: ParseResponse }) {
  const b: TravelBrief = result.data;
  const route = [b.origin, ...b.destinations]
    .map(placeLabel)
    .filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-3">
      {/* Warnings from the engine (fallbacks, backfills, etc.) */}
      {result.warnings.length > 0 && (
        <div className="flex flex-col gap-1 border border-brass/40 bg-brass-wash px-3 py-2">
          {result.warnings.map((w) => (
            <p
              key={w}
              className="font-mono text-[10.5px] leading-relaxed text-brass"
            >
              ⚠ {w}
            </p>
          ))}
        </div>
      )}

      {/* Summary */}
      <Panel
        title="Extracted brief"
        action={
          <div className="flex items-center gap-1.5">
            <Stamp
              tone={
                b.urgency === "critical" || b.urgency === "high"
                  ? "vermilion"
                  : "ink"
              }
            >
              {b.urgency}
            </Stamp>
          </div>
        }
      >
        <p className="text-pretty font-display text-[18px] leading-snug text-ink">
          {b.summary || "No summary produced."}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {fmtLabel(b.tripType) && (
            <Chip tone="sea">{fmtLabel(b.tripType)}</Chip>
          )}
          {fmtLabel(b.purpose) && <Chip tone="ink">{fmtLabel(b.purpose)}</Chip>}
          <Chip
            tone={
              URGENCY_TONE[b.urgency] === "vermilion" ? "vermilion" : "brass"
            }
          >
            {Math.round(b.confidence * 100)}% confidence
          </Chip>
        </div>
      </Panel>

      {/* Traveller */}
      <Panel title="Traveller">
        <Field label="Name" value={b.traveller.name} />
        <Field label="Email" value={b.traveller.email} />
        <Field label="Phone" value={b.traveller.phone} />
        <Field label="Company" value={b.traveller.company} />
        <ChipRow
          label="Loyalty"
          items={b.traveller.loyaltyPrograms}
          tone="brass"
        />
      </Panel>

      {/* Route & dates */}
      <Panel title="Route & dates">
        <Field label="Route" value={route.length ? route.join(" → ") : null} />
        <Field label="Depart" value={formatDate(b.dates.departDate)} />
        <Field label="Return" value={formatDate(b.dates.returnDate)} />
        <Field
          label="Duration"
          value={
            b.dates.durationNights ? `${b.dates.durationNights} nights` : null
          }
        />
        <Field
          label="Flexible"
          value={
            b.dates.flexible ? `± ${b.dates.flexibilityDays ?? "?"} days` : null
          }
        />
        <Field label="As stated" value={b.dates.rawDateText} tone="muted" />
      </Panel>

      {/* Party & budget */}
      <Panel title="Party & budget">
        <Field label="Party" value={partySummary(b.party)} />
        <Field
          label="Children's ages"
          value={b.party.childAges.length ? b.party.childAges.join(", ") : null}
        />
        <Field label="Rooms" value={b.party.rooms} />
        <Field label="Budget" value={formatBudget(b.budget)} tone="accent" />
        <Field label="Notes" value={b.party.notes} tone="muted" />
      </Panel>

      {/* Flights */}
      <Panel title="Flights">
        <Field label="Cabin" value={fmtLabel(b.flights.cabinClass)} />
        <Field
          label="Non-stop only"
          value={b.flights.nonStopOnly ? "Yes" : null}
        />
        <Field label="Max stops" value={b.flights.maxStops} />
        <Field label="Departure window" value={b.flights.departureWindow} />
        <Field label="Seat" value={b.flights.seatPreference} />
        <Field label="Baggage" value={b.flights.baggage} />
        <ChipRow
          label="Preferred"
          items={b.flights.preferredAirlines}
          tone="sea"
        />
        <ChipRow
          label="Avoid"
          items={b.flights.avoidAirlines}
          tone="vermilion"
        />
      </Panel>

      {/* Accommodation */}
      <Panel title="Accommodation">
        <Field label="Type" value={b.accommodation.type} />
        <Field
          label="Star rating"
          value={
            b.accommodation.starRating ? `${b.accommodation.starRating}★` : null
          }
        />
        <Field label="Board basis" value={b.accommodation.boardBasis} />
        <Field label="Room type" value={b.accommodation.roomType} />
        <Field label="Location" value={b.accommodation.locationPreference} />
        <ChipRow label="Amenities" items={b.accommodation.mustHaveAmenities} />
      </Panel>

      {/* Ground */}
      {(b.ground.carRental ||
        b.ground.airportTransfer ||
        b.ground.railRequired ||
        b.ground.notes) && (
        <Panel title="Ground transport">
          <Field label="Car rental" value={b.ground.carRental ? "Yes" : null} />
          <Field
            label="Airport transfer"
            value={b.ground.airportTransfer ? "Yes" : null}
          />
          <Field label="Rail" value={b.ground.railRequired ? "Yes" : null} />
          <Field label="Notes" value={b.ground.notes} tone="muted" />
        </Panel>
      )}

      {/* Preferences */}
      <Panel title="Preferences & requests">
        <ChipRow label="Activities" items={b.activities} tone="sea" />
        <ChipRow label="Dietary" items={b.dietary} tone="brass" />
        <ChipRow label="Accessibility" items={b.accessibility} tone="brass" />
        <ChipRow label="Special requests" items={b.specialRequests} />
        <ChipRow
          label="Deal-breakers"
          items={b.dealBreakers}
          tone="vermilion"
        />
      </Panel>

      {/* Gaps */}
      {(b.missingInfo.length > 0 || b.followUpQuestions.length > 0) && (
        <Panel title="Before you can quote">
          {b.missingInfo.length > 0 && (
            <div className="mb-2">
              <span className="label-mono">Missing</span>
              <ul className="mt-1 space-y-1">
                {b.missingInfo.map((item) => (
                  <li
                    key={item}
                    className="font-mono text-[12px] leading-snug text-ink-soft"
                  >
                    · {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {b.followUpQuestions.length > 0 && (
            <div>
              <span className="label-mono">Ask the traveller</span>
              <ul className="mt-1 space-y-1">
                {b.followUpQuestions.map((item) => (
                  <li
                    key={item}
                    className="font-mono text-[12px] leading-snug text-vermilion"
                  >
                    · {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      )}

      {/* Engine footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-ghost">
        <span>
          {result.engine} · {result.model}
        </span>
        <span>
          {result.latencyMs}ms · {result.characters} chars
        </span>
      </div>
    </div>
  );
}
