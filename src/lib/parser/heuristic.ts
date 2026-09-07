import {
  ACCESS_KEYWORDS,
  ACTIVITY_KEYWORDS,
  AIRLINES,
  AMENITY_KEYWORDS,
  DIET_KEYWORDS,
  GAZETTEER,
} from "./gazetteer";
import { emptyBrief, type TravelBrief } from "./schema";

/* -------------------------------------------------------------------------- */
/*  Small utilities                                                            */
/* -------------------------------------------------------------------------- */

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

const toNum = (raw: string | undefined): number | null => {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  if (key in NUMBER_WORDS) return NUMBER_WORDS[key];
  const n = Number.parseInt(key.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

const iso = (d: Date) => {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const uniq = <T,>(xs: T[]) => Array.from(new Set(xs));

const has = (text: string, ...needles: string[]) =>
  needles.some((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));

/* -------------------------------------------------------------------------- */
/*  Dates                                                                      */
/* -------------------------------------------------------------------------- */

interface Hit {
  date: Date;
  index: number;
  raw: string;
}

/** Build a UTC date, rolling the year forward when the month has already passed. */
function resolveYear(month: number, day: number, explicitYear: number | null, today: Date) {
  let year = explicitYear ?? today.getUTCFullYear();
  if (explicitYear === null) {
    const candidate = Date.UTC(year, month, day);
    if (candidate < today.getTime() - 86_400_000 * 2) year += 1;
  }
  return new Date(Date.UTC(year, month, day));
}

function findDates(text: string, today: Date): Hit[] {
  const hits: Hit[] = [];
  const push = (date: Date, index: number, raw: string) => {
    if (Number.isNaN(date.getTime())) return;
    hits.push({ date, index, raw });
  };

  // 2026-06-12
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    push(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])), m.index ?? 0, m[0]);
  }

  // 6/12/2026 or 6/12 (assume month/day)
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) {
    const month = +m[1] - 1;
    const day = +m[2];
    if (month > 11 || day > 31) continue;
    let year: number | null = null;
    if (m[3]) year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    push(resolveYear(month, day, year, today), m.index ?? 0, m[0]);
  }

  const monthNames = Object.keys(MONTHS).join("|");

  // "June 12", "June 12th, 2026", "Jun 12 - 19"
  const reMonthFirst = new RegExp(
    `\\b(${monthNames})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*(?:-|–|—|to|through|thru|until)\\s*(\\d{1,2})(?:st|nd|rd|th)?)?(?:,?\\s*(\\d{4}))?`,
    "gi",
  );
  for (const m of text.matchAll(reMonthFirst)) {
    const month = MONTHS[m[1].toLowerCase()];
    const year = m[4] ? +m[4] : null;
    push(resolveYear(month, +m[2], year, today), m.index ?? 0, m[0]);
    if (m[3]) push(resolveYear(month, +m[3], year, today), (m.index ?? 0) + 1, m[0]);
  }

  // "12 June", "12th of June 2026", "12-19 June"
  const reDayFirst = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*(?:-|–|—|to|through|thru|until)\\s*(\\d{1,2})(?:st|nd|rd|th)?)?\\s+(?:of\\s+)?(${monthNames})\\.?(?:,?\\s*(\\d{4}))?`,
    "gi",
  );
  for (const m of text.matchAll(reDayFirst)) {
    const month = MONTHS[m[3].toLowerCase()];
    const year = m[4] ? +m[4] : null;
    push(resolveYear(month, +m[1], year, today), m.index ?? 0, m[0]);
    if (m[2]) push(resolveYear(month, +m[2], year, today), (m.index ?? 0) + 1, m[0]);
  }

  // Bare month with a qualifier: "early June", "mid-October", "in September"
  if (hits.length === 0) {
    const reBare = new RegExp(
      `\\b(early|mid|middle of|late|beginning of|end of|first week of|last week of|in|during|around)[\\s-]+(${monthNames})\\b`,
      "gi",
    );
    for (const m of text.matchAll(reBare)) {
      const month = MONTHS[m[2].toLowerCase()];
      const qualifier = m[1].toLowerCase();
      const day = /late|end of|last week/.test(qualifier)
        ? 22
        : /mid|middle/.test(qualifier)
          ? 14
          : 5;
      push(resolveYear(month, day, null, today), m.index ?? 0, m[0]);
    }
  }

  // Relative windows
  if (hits.length === 0) {
    const rel: Array<[RegExp, number]> = [
      [/\bnext week\b/i, 7],
      [/\bin two weeks\b/i, 14],
      [/\bnext month\b/i, 30],
      [/\bin (\d+) weeks\b/i, -1],
      [/\bin (\d+) months\b/i, -2],
    ];
    for (const [re, offset] of rel) {
      const m = re.exec(text);
      if (!m) continue;
      let days = offset;
      if (offset === -1) days = (toNum(m[1]) ?? 1) * 7;
      if (offset === -2) days = (toNum(m[1]) ?? 1) * 30;
      push(new Date(today.getTime() + days * 86_400_000), m.index ?? 0, m[0]);
    }
  }

  return hits.sort((a, b) => a.index - b.index || a.date.getTime() - b.date.getTime());
}

function findDuration(text: string): number | null {
  const m = text.match(
    /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen)[\s-]*(night|nights|day|days|week|weeks)\b/i,
  );
  if (m) {
    const n = toNum(m[1]) ?? 0;
    const unit = m[2].toLowerCase();
    if (unit.startsWith("week")) return n * 7;
    if (unit.startsWith("day")) return Math.max(n - 1, 1);
    return n;
  }
  if (/\blong weekend\b/i.test(text)) return 3;
  if (/\bweekend\b/i.test(text)) return 2;
  if (/\ba week\b/i.test(text)) return 7;
  if (/\bfortnight\b/i.test(text)) return 14;
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Places                                                                     */
/* -------------------------------------------------------------------------- */

const ORIGIN_CUES =
  /(from|out of|departing|departure from|leaving|based in|fly out of|flying out of|origin|we(?:'re| are) in|i(?:'m| am) in|located in)\s*$/i;

function findPlaces(text: string) {
  interface PlaceHit {
    entry: (typeof GAZETTEER)[number];
    index: number;
    origin: boolean;
  }
  const hits: PlaceHit[] = [];

  for (const entry of GAZETTEER) {
    const names = [entry.city, ...(entry.aliases ?? [])];
    for (const name of names) {
      const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      for (const m of text.matchAll(re)) {
        const index = m.index ?? 0;
        const before = text.slice(Math.max(0, index - 28), index);
        hits.push({ entry, index, origin: ORIGIN_CUES.test(before.trimEnd()) });
      }
    }
    // Bare IATA codes, e.g. "SFO -> NRT"
    for (const m of text.matchAll(new RegExp(`\\b${entry.iata}\\b`, "g"))) {
      const index = m.index ?? 0;
      const before = text.slice(Math.max(0, index - 28), index);
      hits.push({ entry, index, origin: ORIGIN_CUES.test(before.trimEnd()) });
    }
  }

  hits.sort((a, b) => a.index - b.index);

  const seen = new Set<string>();
  const deduped = hits.filter((h) => {
    const key = h.entry.iata + h.entry.city;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const originHit = deduped.find((h) => h.origin) ?? null;
  const destinations = deduped.filter((h) => h !== originHit);

  return { originHit, destinations };
}

/* -------------------------------------------------------------------------- */
/*  Main heuristic pass                                                        */
/* -------------------------------------------------------------------------- */

export function heuristicParse(email: string, now = new Date()): TravelBrief {
  const brief = emptyBrief();
  const text = email.replace(/\r/g, "");
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let score = 0.3;

  /* --- traveller ------------------------------------------------------- */
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/);
  if (emailMatch) {
    brief.traveller.email = emailMatch[0];
    score += 0.04;
  }
  const phoneMatch = text.match(/(\+?\d[\d\s().-]{7,}\d)/);
  if (phoneMatch && !/\d{4}-\d{2}-\d{2}/.test(phoneMatch[0])) {
    brief.traveller.phone = phoneMatch[0].trim();
  }
  const signoff = text.match(
    /\b(?:best(?: regards| wishes)?|regards|kind regards|thanks(?:,| a lot)?|thank you|cheers|sincerely|warmly)[,!]?\s*\n+\s*([A-Z][\w'-]+(?:\s+[A-Z][\w'-]+){0,2})/,
  );
  if (signoff) {
    brief.traveller.name = signoff[1].trim();
    score += 0.04;
  } else {
    const intro = text.match(/\b(?:my name is|this is|i(?:'m| am))\s+([A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)?)/);
    if (intro) brief.traveller.name = intro[1];
  }
  const company = text.match(/\b(?:at|from|with)\s+([A-Z][\w&.-]+(?:\s+[A-Z][\w&.-]+)*\s+(?:Inc|LLC|Ltd|GmbH|Corp|Group|Partners|Labs|Studio|Technologies))\b/);
  if (company) brief.traveller.company = company[1];
  for (const m of text.matchAll(
    /\b(Marriott Bonvoy|Hilton Honors|World of Hyatt|IHG One Rewards|Accor Live Limitless|AAdvantage|SkyMiles|MileagePlus|Executive Club|Flying Blue|KrisFlyer|Miles ?& ?More|Skywards|Privilege Club)(?:\s+(Gold|Platinum|Diamond|Titanium|Silver|Elite))?\b/gi,
  )) {
    brief.traveller.loyaltyPrograms.push(m[0].trim());
  }
  brief.traveller.loyaltyPrograms = uniq(brief.traveller.loyaltyPrograms);

  /* --- places ---------------------------------------------------------- */
  const { originHit, destinations } = findPlaces(text);
  if (originHit) {
    brief.origin = {
      city: originHit.entry.city,
      region: null,
      country: originHit.entry.country,
      iata: originHit.entry.iata,
      nights: null,
    };
    score += 0.07;
  }
  brief.destinations = destinations.slice(0, 5).map((d) => ({
    city: d.entry.city,
    region: null,
    country: d.entry.country,
    iata: d.entry.iata,
    nights: null,
  }));
  if (brief.destinations.length) score += 0.1;

  /* --- dates ----------------------------------------------------------- */
  const dateHits = findDates(text, today);
  const duration = findDuration(text);
  if (dateHits.length) {
    brief.dates.departDate = iso(dateHits[0].date);
    brief.dates.rawDateText = dateHits[0].raw;
    score += 0.1;
    const later = dateHits.find((h) => h.date.getTime() > dateHits[0].date.getTime());
    if (later) {
      brief.dates.returnDate = iso(later.date);
      brief.dates.durationNights = Math.round(
        (later.date.getTime() - dateHits[0].date.getTime()) / 86_400_000,
      );
      score += 0.05;
    } else if (duration) {
      const ret = new Date(dateHits[0].date.getTime() + duration * 86_400_000);
      brief.dates.returnDate = iso(ret);
      brief.dates.durationNights = duration;
    }
  }
  if (duration && brief.dates.durationNights === null) brief.dates.durationNights = duration;
  if (/\bflexib|\bflexible\b|\bor so\b|\baround (?:that|those)\b|\bgive or take\b/i.test(text)) {
    brief.dates.flexible = true;
    const flex = text.match(/(?:give or take|plus or minus|\+\/-|±)\s*(\d+|a few|couple)/i);
    brief.dates.flexibilityDays = flex ? (toNum(flex[1]) ?? 3) : 3;
  }

  /* --- party ----------------------------------------------------------- */
  const adults = text.match(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+adults?\b/i);
  if (adults) brief.party.adults = toNum(adults[1]);
  const kids = text.match(
    /\b(\d{1,2}|one|two|three|four|five|six)\s+(?:kids?|children|child)\b/i,
  );
  if (kids) brief.party.children = toNum(kids[1]);
  const infants = text.match(/\b(\d{1,2}|one|two)\s+(?:infants?|babies|baby|toddlers?)\b/i);
  if (infants) brief.party.infants = toNum(infants[1]);
  for (const m of text.matchAll(/\bages?\s+((?:\d{1,2})(?:\s*(?:,|and|&|\+)\s*\d{1,2})*)\b/gi)) {
    for (const a of m[1].split(/[^0-9]+/)) {
      const n = Number.parseInt(a, 10);
      if (Number.isFinite(n) && n <= 18) brief.party.childAges.push(n);
    }
  }
  const partyOf = text.match(/\b(?:party|group|family)\s+of\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i);
  if (partyOf && brief.party.adults === null) {
    const total = toNum(partyOf[1]) ?? 0;
    brief.party.adults = Math.max(total - (brief.party.children ?? 0), 1);
    brief.party.notes = partyOf[0];
  }
  if (brief.party.adults === null && /\b(?:my (?:wife|husband|partner|girlfriend|boyfriend|spouse) and i|the two of us|just us two|my partner and i)\b/i.test(text)) {
    brief.party.adults = 2;
  }
  if (brief.party.adults === null && /\b(?:solo|just me|myself|i'?m travelling alone|travelling solo|traveling solo)\b/i.test(text)) {
    brief.party.adults = 1;
  }
  const rooms = text.match(/\b(\d{1,2}|one|two|three|four|five)\s+rooms?\b/i);
  if (rooms) brief.party.rooms = toNum(rooms[1]);
  if (brief.party.adults !== null) score += 0.06;
  if (brief.party.childAges.length) brief.party.childAges = uniq(brief.party.childAges);

  /* --- budget ---------------------------------------------------------- */
  const currencySigns: Record<string, string> = {
    $: "USD", "£": "GBP", "€": "EUR", "₹": "INR", "¥": "JPY", "₩": "KRW", "A$": "AUD", "C$": "CAD",
  };
  const budgetRe =
    /(?:(USD|EUR|GBP|INR|AED|CAD|AUD|SGD|JPY|CHF)\s*)?([$£€₹¥])?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|K|thousand)?\s*(?:(?:-|–|to|and)\s*([$£€₹¥])?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|K|thousand)?)?/;
  const budgetContext = text.match(
    new RegExp(
      `(?:budget|spend|around|about|up to|under|below|max(?:imum)?|no more than|roughly|approximately|ceiling of|keep it (?:under|below))[^.\\n]{0,40}?${budgetRe.source}`,
      "i",
    ),
  );
  const scale = (v: string | undefined, k: string | undefined) => {
    if (!v) return null;
    const n = Number.parseFloat(v.replace(/,/g, ""));
    if (!Number.isFinite(n)) return null;
    return k ? n * 1000 : n;
  };
  if (budgetContext) {
    const [, code, sign, v1, k1, , v2, k2] = budgetContext;
    const min = scale(v1, k1);
    const max = scale(v2, k2);
    if (min !== null && min >= 50) {
      brief.budget.raw = budgetContext[0].trim();
      brief.budget.currency = code?.toUpperCase() ?? (sign ? currencySigns[sign] : null) ?? "USD";
      if (max !== null) {
        brief.budget.min = min;
        brief.budget.max = max;
      } else if (/under|below|up to|max|no more than|ceiling|keep it/i.test(budgetContext[0])) {
        brief.budget.max = min;
      } else {
        brief.budget.min = min;
        brief.budget.max = min;
      }
      brief.budget.basis = /per person|each|pp\b|a head|per head/i.test(text)
        ? "per_person"
        : /per night|a night|nightly/i.test(budgetContext[0])
          ? "per_night"
          : "total";
      score += 0.08;
    }
  }

  /* --- flights --------------------------------------------------------- */
  if (has(text, "premium economy")) brief.flights.cabinClass = "premium_economy";
  else if (/\bbusiness(?: class)?\b/i.test(text) && !/business trip|business meeting/i.test(text))
    brief.flights.cabinClass = "business";
  else if (/\bfirst class\b/i.test(text)) brief.flights.cabinClass = "first";
  else if (/\beconomy\b|\bcoach\b/i.test(text)) brief.flights.cabinClass = "economy";
  if (brief.flights.cabinClass !== "unknown") score += 0.04;

  if (/\b(non-?stop|direct flight|direct flights|no layovers?|no connections?|avoid connections)\b/i.test(text)) {
    brief.flights.nonStopOnly = true;
    brief.flights.maxStops = 0;
  }
  const stops = text.match(/\b(?:max(?:imum)?|no more than|at most)\s+(one|two|1|2)\s+stops?\b/i);
  if (stops) brief.flights.maxStops = toNum(stops[1]);

  for (const airline of AIRLINES) {
    const re = new RegExp(`\\b${airline}\\b`, "i");
    if (!re.test(text)) continue;
    if (new RegExp(`(?:avoid|not|no|never|rather not|except)[^.\\n]{0,24}${airline}`, "i").test(text)) {
      brief.flights.avoidAirlines.push(airline);
    } else {
      brief.flights.preferredAirlines.push(airline);
    }
  }
  brief.flights.preferredAirlines = uniq(brief.flights.preferredAirlines);
  brief.flights.avoidAirlines = uniq(brief.flights.avoidAirlines);

  const seat = text.match(/\b(aisle|window|extra legroom|bulkhead|exit row|front of the cabin)\b/i);
  if (seat) brief.flights.seatPreference = seat[1].toLowerCase();
  const window = text.match(
    /\b(?:(?:leave|depart|fly out|arrive|land)[^.\n]{0,20}?)?(red-?eye|overnight flight|morning|afternoon|evening|after \d{1,2}\s*(?:am|pm)|before \d{1,2}\s*(?:am|pm))\b/i,
  );
  if (window) brief.flights.departureWindow = window[1].toLowerCase();
  const bags = text.match(/\b(\d|one|two|three)\s+(?:checked )?(?:bags?|suitcases?|luggage)\b/i);
  if (bags) brief.flights.baggage = bags[0];
  if (/\bcarry-?on only\b/i.test(text)) brief.flights.baggage = "carry-on only";

  /* --- accommodation --------------------------------------------------- */
  const stars = text.match(/\b([2-5])[\s-]*(?:star|\*)\b/i);
  if (stars) {
    brief.accommodation.starRating = Number.parseInt(stars[1], 10);
    score += 0.03;
  }
  const stayType = text.match(
    /\b(resort|boutique hotel|hotel|villa|apartment|airbnb|hostel|guesthouse|riad|ryokan|lodge|chalet|cabin|b&b|bed and breakfast)\b/i,
  );
  if (stayType) brief.accommodation.type = stayType[1].toLowerCase();
  const board = text.match(/\b(all-?inclusive|half board|full board|room only|bed and breakfast|b&b|breakfast included)\b/i);
  if (board) brief.accommodation.boardBasis = board[1].toLowerCase();
  const room = text.match(/\b((?:one|two|1|2)[\s-]bedroom|suite|king room|twin room|double room|family room|adjoining rooms?|connecting rooms?|overwater bungalow|villa with (?:a )?private pool)\b/i);
  if (room) brief.accommodation.roomType = room[1].toLowerCase();
  const loc = text.match(/\b(beachfront|city centre|city center|downtown|near the (?:old town|beach|station|airport|office)|walking distance to [^.,\n]{3,40}|close to [^.,\n]{3,40})\b/i);
  if (loc) brief.accommodation.locationPreference = loc[1].trim();
  for (const [label, needles] of Object.entries(AMENITY_KEYWORDS)) {
    if (needles.some((n) => new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text))) {
      brief.accommodation.mustHaveAmenities.push(label);
    }
  }

  /* --- ground ---------------------------------------------------------- */
  brief.ground.carRental = /\b(car (?:rental|hire)|rent a car|hire a car|rental car|suv)\b/i.test(text);
  brief.ground.airportTransfer = /\b(transfer|pick ?-?up from the airport|airport pickup|private driver|chauffeur)\b/i.test(text);
  brief.ground.railRequired = /\b(train|rail pass|eurostar|shinkansen|jr pass|by rail)\b/i.test(text);

  /* --- lists ----------------------------------------------------------- */
  const collect = (dict: Record<string, string[]>) =>
    Object.entries(dict)
      .filter(([, needles]) =>
        needles.some((n) => new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text)),
      )
      .map(([label]) => label);

  brief.activities = collect(ACTIVITY_KEYWORDS);
  brief.dietary = collect(DIET_KEYWORDS);
  brief.accessibility = collect(ACCESS_KEYWORDS);

  for (const m of text.matchAll(
    /\b(?:please (?:make sure|ensure|note)|we(?:'d| would) (?:really )?(?:like|love|prefer)|it(?:'s| is) important that|must (?:be|have)|ideally)\b([^.!?\n]{6,120})/gi,
  )) {
    brief.specialRequests.push(m[0].replace(/\s+/g, " ").trim());
  }
  brief.specialRequests = uniq(brief.specialRequests).slice(0, 5);

  for (const m of text.matchAll(
    /\b(?:absolutely no|definitely not|we (?:can'?t|cannot|won'?t)|deal-?breaker[^.\n]{0,4}|under no circumstances)\b([^.!?\n]{4,100})/gi,
  )) {
    brief.dealBreakers.push(m[0].replace(/\s+/g, " ").trim());
  }
  brief.dealBreakers = uniq(brief.dealBreakers).slice(0, 4);

  /* --- classification -------------------------------------------------- */
  if (brief.destinations.length > 1) brief.tripType = "multi_city";
  else if (
    brief.dates.returnDate ||
    /\b(return|round-?trip|come back|back on|returning|both ways)\b/i.test(text)
  )
    brief.tripType = "round_trip";
  else if (/\bone-?way\b/i.test(text)) brief.tripType = "one_way";

  if (/\bhoneymoon|anniversary trip|just got married\b/i.test(text)) brief.purpose = "honeymoon";
  else if (/\b(conference|client|offsite|off-site|business trip|work trip|summit|trade show|meetings?)\b/i.test(text))
    brief.purpose = "business";
  else if (/\b(wedding|reunion|birthday|bachelorette|bachelor party|graduation)\b/i.test(text))
    brief.purpose = "event";
  else if ((brief.party.children ?? 0) > 0 || /\b(family (?:trip|holiday|vacation)|with the kids)\b/i.test(text))
    brief.purpose = "family";
  else if ((brief.party.adults ?? 0) >= 6) brief.purpose = "group";
  else if (/\b(holiday|vacation|getaway|break|trip)\b/i.test(text)) brief.purpose = "leisure";

  if (/\b(asap|urgent|urgently|today|by (?:end of day|eod|tonight)|right away|immediately|last minute)\b/i.test(text))
    brief.urgency = "critical";
  else if (/\b(soon|quickly|this week|within 24 hours|by tomorrow|short notice|quick turnaround)\b/i.test(text))
    brief.urgency = "high";
  else if (/\b(no rush|whenever|sometime|just exploring|thinking ahead|next year)\b/i.test(text))
    brief.urgency = "low";

  if (brief.dates.departDate) {
    const days = (new Date(brief.dates.departDate).getTime() - today.getTime()) / 86_400_000;
    if (days >= 0 && days <= 7) brief.urgency = "critical";
    else if (days > 7 && days <= 30 && brief.urgency === "normal") brief.urgency = "high";
  }

  /* --- gaps & follow-ups ------------------------------------------------ */
  const gaps: string[] = [];
  const questions: string[] = [];
  if (!brief.destinations.length) {
    gaps.push("Destination");
    questions.push("Which destination (or shortlist) should we price up for you?");
  }
  if (!brief.origin.city) {
    gaps.push("Departure city");
    questions.push("Which airport would you like to depart from?");
  }
  if (!brief.dates.departDate) {
    gaps.push("Travel dates");
    questions.push("Do you have firm travel dates, or a rough window we can work around?");
  } else if (!brief.dates.returnDate && brief.tripType !== "one_way") {
    gaps.push("Return date");
    questions.push("How many nights would you like to stay?");
  }
  if (brief.party.adults === null) {
    gaps.push("Party size");
    questions.push("How many travellers will be joining, and are any of them children?");
  }
  if (brief.budget.min === null && brief.budget.max === null) {
    gaps.push("Budget");
    questions.push("Roughly what budget should we plan around?");
  }
  brief.missingInfo = gaps;
  brief.followUpQuestions = questions.slice(0, 4);

  /* --- summary --------------------------------------------------------- */
  const route = brief.destinations.map((d) => d.city).filter(Boolean).join(" → ");
  const partyBits: string[] = [];
  if (brief.party.adults) partyBits.push(`${brief.party.adults} adult${brief.party.adults > 1 ? "s" : ""}`);
  if (brief.party.children) partyBits.push(`${brief.party.children} child${brief.party.children > 1 ? "ren" : ""}`);
  const pieces = [
    brief.traveller.name ? `${brief.traveller.name} is enquiring about` : "Enquiry for",
    route ? `a trip to ${route}` : "a trip (destination not yet named)",
    brief.origin.city ? `from ${brief.origin.city}` : null,
    brief.dates.departDate
      ? `departing ${brief.dates.departDate}${brief.dates.durationNights ? ` for ${brief.dates.durationNights} nights` : ""}`
      : "with dates still to confirm",
    partyBits.length ? `for ${partyBits.join(" and ")}` : null,
    brief.budget.max
      ? `on a budget of ${brief.budget.currency ?? ""} ${brief.budget.max.toLocaleString()}`.trim()
      : null,
  ].filter(Boolean);
  brief.summary = `${pieces.join(" ")}.`.replace(/\s+/g, " ");

  brief.confidence = Math.min(0.78, Math.round(score * 100) / 100);
  return brief;
}
