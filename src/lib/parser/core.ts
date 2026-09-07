import { heuristicParse } from "./heuristic";
import { callGemini, callOpenAI, geminiKey, GEMINI_MODEL, openaiKey, OPENAI_MODEL } from "./providers";
import {
  BUDGET_BASIS,
  CABIN_CLASSES,
  emptyBrief,
  type ParseEngine,
  type ParseResponse,
  TRIP_PURPOSES,
  TRIP_TYPES,
  type TravelBrief,
  TravelBriefSchema,
  URGENCY,
} from "./schema";

export const MAX_EMAIL_LENGTH = 20_000;

/* -------------------------------------------------------------------------- */
/*  Coercion — models drift, so normalise before validating                    */
/* -------------------------------------------------------------------------- */

const BLANKS = new Set(["", "n/a", "na", "none", "null", "unknown", "not specified", "not stated", "-"]);

function s(v: unknown): string | null {
  if (typeof v !== "string") return typeof v === "number" ? String(v) : null;
  const t = v.trim();
  return BLANKS.has(t.toLowerCase()) ? null : t;
}

function n(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = Number.parseFloat(v.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

const i = (v: unknown): number | null => {
  const num = n(v);
  return num === null ? null : Math.round(num);
};

function b(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return /^(true|yes|y|1)$/i.test(v.trim());
  return false;
}

function list(v: unknown): string[] {
  if (!Array.isArray(v)) return typeof v === "string" && s(v) ? [v.trim()] : [];
  return Array.from(
    new Set(
      v
        .map((x) => (typeof x === "string" ? x.trim() : typeof x === "number" ? String(x) : null))
        .filter((x): x is string => !!x && !BLANKS.has(x.toLowerCase())),
    ),
  );
}

function pick<T extends readonly string[]>(v: unknown, allowed: T, fallback: T[number]): T[number] {
  const raw = typeof v === "string" ? v.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
  return (allowed as readonly string[]).includes(raw) ? (raw as T[number]) : fallback;
}

function isoDate(v: unknown): string | null {
  const raw = s(v);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function place(v: unknown) {
  const o = (v ?? {}) as Record<string, unknown>;
  const iata = s(o.iata ?? o.iataCode ?? o.airportCode);
  return {
    city: s(o.city ?? o.name),
    region: s(o.region ?? o.state),
    country: s(o.country),
    iata: iata ? iata.toUpperCase().slice(0, 3) : null,
    nights: i(o.nights),
  };
}

export function coerceBrief(input: unknown): TravelBrief {
  const raw = (input ?? {}) as Record<string, unknown>;
  const g = <T,>(key: string, fallback: T) => (raw[key] ?? fallback) as T;
  const obj = (key: string) => (raw[key] ?? {}) as Record<string, unknown>;

  const t = obj("traveller");
  const d = obj("dates");
  const p = obj("party");
  const bud = obj("budget");
  const f = obj("flights");
  const a = obj("accommodation");
  const gr = obj("ground");

  const destinationsRaw = Array.isArray(raw.destinations)
    ? raw.destinations
    : raw.destination
      ? [raw.destination]
      : [];

  const brief: TravelBrief = {
    summary: s(raw.summary) ?? "",
    tripType: pick(raw.tripType, TRIP_TYPES, "unknown"),
    purpose: pick(raw.purpose, TRIP_PURPOSES, "unknown"),
    urgency: pick(raw.urgency, URGENCY, "normal"),
    traveller: {
      name: s(t.name),
      email: s(t.email),
      phone: s(t.phone),
      company: s(t.company),
      loyaltyPrograms: list(t.loyaltyPrograms),
    },
    origin: place(raw.origin),
    destinations: destinationsRaw.map(place).filter((x) => x.city || x.iata).slice(0, 8),
    dates: {
      departDate: isoDate(d.departDate ?? d.departureDate ?? d.start),
      returnDate: isoDate(d.returnDate ?? d.end),
      rawDateText: s(d.rawDateText),
      durationNights: i(d.durationNights ?? d.nights),
      flexible: b(d.flexible),
      flexibilityDays: i(d.flexibilityDays),
    },
    party: {
      adults: i(p.adults),
      children: i(p.children),
      infants: i(p.infants),
      childAges: (Array.isArray(p.childAges) ? p.childAges : [])
        .map(i)
        .filter((x): x is number => x !== null),
      rooms: i(p.rooms),
      notes: s(p.notes),
    },
    budget: {
      min: n(bud.min),
      max: n(bud.max),
      currency: s(bud.currency)?.toUpperCase().slice(0, 3) ?? null,
      basis: pick(bud.basis, BUDGET_BASIS, "unknown"),
      raw: s(bud.raw),
    },
    flights: {
      cabinClass: pick(f.cabinClass, CABIN_CLASSES, "unknown"),
      preferredAirlines: list(f.preferredAirlines),
      avoidAirlines: list(f.avoidAirlines),
      nonStopOnly: b(f.nonStopOnly),
      maxStops: i(f.maxStops),
      seatPreference: s(f.seatPreference),
      departureWindow: s(f.departureWindow),
      baggage: s(f.baggage),
    },
    accommodation: {
      type: s(a.type),
      starRating: n(a.starRating),
      boardBasis: s(a.boardBasis),
      roomType: s(a.roomType),
      locationPreference: s(a.locationPreference),
      mustHaveAmenities: list(a.mustHaveAmenities),
    },
    ground: {
      carRental: b(gr.carRental),
      airportTransfer: b(gr.airportTransfer),
      railRequired: b(gr.railRequired),
      notes: s(gr.notes),
    },
    activities: list(g("activities", [])),
    dietary: list(g("dietary", [])),
    accessibility: list(g("accessibility", [])),
    specialRequests: list(g("specialRequests", [])),
    dealBreakers: list(g("dealBreakers", [])),
    missingInfo: list(g("missingInfo", [])),
    followUpQuestions: list(g("followUpQuestions", [])).slice(0, 4),
    confidence: Math.max(0, Math.min(1, n(raw.confidence) ?? 0.5)),
  };

  // Derived consistency fixes.
  if (brief.dates.departDate && brief.dates.returnDate && brief.dates.durationNights === null) {
    const nights = Math.round(
      (new Date(brief.dates.returnDate).getTime() - new Date(brief.dates.departDate).getTime()) /
        86_400_000,
    );
    if (nights > 0 && nights < 400) brief.dates.durationNights = nights;
  }
  if (brief.tripType === "unknown") {
    if (brief.destinations.length > 1) brief.tripType = "multi_city";
    else if (brief.dates.returnDate) brief.tripType = "round_trip";
  }
  if (brief.flights.maxStops === 0) brief.flights.nonStopOnly = true;

  const parsed = TravelBriefSchema.safeParse(brief);
  return parsed.success ? parsed.data : { ...emptyBrief(), ...brief };
}

/* -------------------------------------------------------------------------- */
/*  Engine selection                                                           */
/* -------------------------------------------------------------------------- */

export function availableEngine(): ParseEngine {
  if (geminiKey()) return "gemini";
  if (openaiKey()) return "openai";
  return "heuristic";
}

export function engineStatus() {
  const engine = availableEngine();
  return {
    engine,
    model: engine === "gemini" ? GEMINI_MODEL : engine === "openai" ? OPENAI_MODEL : "rule-based-v1",
    aiEnabled: engine !== "heuristic",
  };
}

/* -------------------------------------------------------------------------- */
/*  Public entry point                                                         */
/* -------------------------------------------------------------------------- */

export interface ParseOptions {
  /** Force the offline engine, handy for tests and demos. */
  forceHeuristic?: boolean;
}

export async function parseTravelEmail(
  email: string,
  options: ParseOptions = {},
): Promise<ParseResponse> {
  const started = Date.now();
  const text = email.trim();
  const warnings: string[] = [];

  if (!text) throw new Error("Email body is empty.");
  if (text.length > MAX_EMAIL_LENGTH) {
    throw new Error(`Email is too long (${text.length} characters, limit ${MAX_EMAIL_LENGTH}).`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const preferred = options.forceHeuristic ? "heuristic" : availableEngine();

  let engine: ParseEngine = "heuristic";
  let model = "rule-based-v1";
  let data: TravelBrief;

  if (preferred === "gemini" || preferred === "openai") {
    try {
      const raw = preferred === "gemini" ? await callGemini(text, today) : await callOpenAI(text, today);
      data = coerceBrief(raw);
      engine = preferred;
      model = preferred === "gemini" ? GEMINI_MODEL : OPENAI_MODEL;

      // Belt and braces: backfill anything the model left blank.
      const fallback = heuristicParse(text);
      if (!data.summary) data.summary = fallback.summary;
      if (!data.destinations.length && fallback.destinations.length) {
        data.destinations = fallback.destinations;
        warnings.push("Destinations backfilled by the rule-based pass.");
      }
      if (!data.traveller.email && fallback.traveller.email) {
        data.traveller.email = fallback.traveller.email;
      }
    } catch (error) {
      warnings.push(
        `${preferred} call failed (${(error as Error).message}) — served the offline engine instead.`,
      );
      data = heuristicParse(text);
    }
  } else {
    data = heuristicParse(text);
    if (!options.forceHeuristic) {
      warnings.push(
        "No GEMINI_API_KEY or OPENAI_API_KEY found — running the offline rule-based engine.",
      );
    }
  }

  return {
    ok: true,
    engine,
    model,
    latencyMs: Date.now() - started,
    characters: text.length,
    warnings,
    data,
  };
}
