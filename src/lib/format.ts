/* -------------------------------------------------------------------------- */
/*  Presentation helpers                                                       */
/* -------------------------------------------------------------------------- */

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2027-04-12" -> "Mon 12 Apr 2027". Parsed as UTC so it never shifts a day. */
export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (Number.isNaN(d.getTime())) return iso;
  return `${DAYS_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Days between today and an ISO date, or null. */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const target = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / 86_400_000);
}

const SYMBOLS: Record<string, string> = {
  USD: "$", GBP: "£", EUR: "€", INR: "₹", JPY: "¥", AUD: "A$", CAD: "C$",
  SGD: "S$", AED: "AED ", CHF: "CHF ", KRW: "₩",
};

export function formatMoney(value: number | null, currency: string | null): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  const symbol = currency ? (SYMBOLS[currency] ?? `${currency} `) : "";
  const rounded = Math.abs(value) >= 1000 ? Math.round(value) : value;
  return `${symbol}${rounded.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;
}

export function formatBudget(budget: {
  min: number | null;
  max: number | null;
  currency: string | null;
  basis: string;
}): string | null {
  const min = formatMoney(budget.min, budget.currency);
  const max = formatMoney(budget.max, budget.currency);
  if (!min && !max) return null;

  let core: string;
  if (min && max && budget.min !== budget.max) core = `${min} – ${max}`;
  else if (max && !min) core = `up to ${max}`;
  else core = (min ?? max) as string;

  const suffix =
    budget.basis === "per_person"
      ? " pp"
      : budget.basis === "per_night"
        ? " / night"
        : budget.basis === "total"
          ? " total"
          : "";
  return core + suffix;
}

/** "premium_economy" -> "Premium economy" */
export function label(value: string | null | undefined): string | null {
  if (!value || value === "unknown") return null;
  const words = value.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "Tokyo (HND)" */
export function placeLabel(place: {
  city: string | null;
  country: string | null;
  iata: string | null;
}): string | null {
  if (!place.city && !place.iata) return null;
  if (place.city && place.iata) return `${place.city} (${place.iata})`;
  return place.city ?? place.iata;
}

export function partySummary(party: {
  adults: number | null;
  children: number | null;
  infants: number | null;
}): string | null {
  const bits: string[] = [];
  if (party.adults) bits.push(plural(party.adults, "adult"));
  if (party.children) bits.push(plural(party.children, "child", "children"));
  if (party.infants) bits.push(plural(party.infants, "infant"));
  return bits.length ? bits.join(" · ") : null;
}

export const URGENCY_TONE = {
  low: "sea",
  normal: "ink",
  high: "brass",
  critical: "vermilion",
} as const;
