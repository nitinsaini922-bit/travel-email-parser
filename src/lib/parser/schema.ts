import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*  Enumerations                                                               */
/* -------------------------------------------------------------------------- */

export const TRIP_TYPES = [
  "one_way",
  "round_trip",
  "multi_city",
  "open_jaw",
  "unknown",
] as const;

export const TRIP_PURPOSES = [
  "leisure",
  "business",
  "bleisure",
  "honeymoon",
  "family",
  "group",
  "event",
  "relocation",
  "other",
  "unknown",
] as const;

export const CABIN_CLASSES = [
  "economy",
  "premium_economy",
  "business",
  "first",
  "unknown",
] as const;

export const BUDGET_BASIS = ["total", "per_person", "per_night", "unknown"] as const;

export const URGENCY = ["low", "normal", "high", "critical"] as const;

/* -------------------------------------------------------------------------- */
/*  Leaf objects                                                               */
/* -------------------------------------------------------------------------- */

const Place = z.object({
  city: z.string().nullable().describe("City or locality name, properly capitalised."),
  region: z.string().nullable().describe("State, province or region if stated."),
  country: z.string().nullable().describe("Country name if stated or confidently inferred."),
  iata: z
    .string()
    .nullable()
    .describe("3-letter IATA airport/city code if stated or confidently inferred."),
  nights: z
    .number()
    .int()
    .nullable()
    .describe("Number of nights the traveller wants to stay in this place, if stated."),
});

const Traveller = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  company: z.string().nullable(),
  loyaltyPrograms: z.array(z.string()).describe("e.g. 'Marriott Bonvoy Gold', 'AA AAdvantage'."),
});

const Dates = z.object({
  departDate: z.string().nullable().describe("ISO 8601 date (YYYY-MM-DD) if resolvable."),
  returnDate: z.string().nullable().describe("ISO 8601 date (YYYY-MM-DD) if resolvable."),
  rawDateText: z.string().nullable().describe("The exact date phrasing used in the email."),
  durationNights: z.number().int().nullable(),
  flexible: z.boolean().describe("True when the traveller signals date flexibility."),
  flexibilityDays: z.number().int().nullable().describe("How many days either side they can move."),
});

const Party = z.object({
  adults: z.number().int().nullable(),
  children: z.number().int().nullable(),
  infants: z.number().int().nullable(),
  childAges: z.array(z.number().int()),
  rooms: z.number().int().nullable(),
  notes: z.string().nullable().describe("e.g. 'two couples travelling together'."),
});

const Budget = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  currency: z.string().nullable().describe("ISO 4217 code, e.g. USD, EUR, GBP, INR."),
  basis: z.enum(BUDGET_BASIS),
  raw: z.string().nullable().describe("The exact budget phrasing used in the email."),
});

const Flights = z.object({
  cabinClass: z.enum(CABIN_CLASSES),
  preferredAirlines: z.array(z.string()),
  avoidAirlines: z.array(z.string()),
  nonStopOnly: z.boolean(),
  maxStops: z.number().int().nullable(),
  seatPreference: z.string().nullable().describe("e.g. 'aisle', 'window', 'extra legroom'."),
  departureWindow: z.string().nullable().describe("e.g. 'after 6pm', 'red-eye', 'morning'."),
  baggage: z.string().nullable(),
});

const Accommodation = z.object({
  type: z.string().nullable().describe("hotel, resort, villa, apartment, hostel, boutique…"),
  starRating: z.number().nullable(),
  boardBasis: z.string().nullable().describe("room only, B&B, half board, all-inclusive…"),
  roomType: z.string().nullable(),
  locationPreference: z.string().nullable().describe("e.g. 'beachfront', 'near the old town'."),
  mustHaveAmenities: z.array(z.string()),
});

const Ground = z.object({
  carRental: z.boolean(),
  airportTransfer: z.boolean(),
  railRequired: z.boolean(),
  notes: z.string().nullable(),
});

/* -------------------------------------------------------------------------- */
/*  The full brief                                                             */
/* -------------------------------------------------------------------------- */

export const TravelBriefSchema = z.object({
  summary: z.string().describe("One or two crisp sentences a travel agent could act on."),
  tripType: z.enum(TRIP_TYPES),
  purpose: z.enum(TRIP_PURPOSES),
  urgency: z.enum(URGENCY),
  traveller: Traveller,
  origin: Place,
  destinations: z.array(Place),
  dates: Dates,
  party: Party,
  budget: Budget,
  flights: Flights,
  accommodation: Accommodation,
  ground: Ground,
  activities: z.array(z.string()).describe("Experiences, tours or interests mentioned."),
  dietary: z.array(z.string()),
  accessibility: z.array(z.string()),
  specialRequests: z.array(z.string()),
  dealBreakers: z.array(z.string()).describe("Hard constraints the traveller will not accept."),
  missingInfo: z
    .array(z.string())
    .describe("Critical fields an agent still needs before quoting."),
  followUpQuestions: z
    .array(z.string())
    .describe("Polite, specific questions to send back to the traveller."),
  confidence: z.number().min(0).max(1).describe("Overall extraction confidence, 0 to 1."),
});

export type TravelBrief = z.infer<typeof TravelBriefSchema>;

export type ParseEngine = "gemini" | "openai" | "heuristic";

export interface ParseResponse {
  ok: true;
  engine: ParseEngine;
  model: string;
  latencyMs: number;
  characters: number;
  warnings: string[];
  data: TravelBrief;
}

export interface ParseErrorResponse {
  ok: false;
  error: string;
  detail?: string;
}

/* -------------------------------------------------------------------------- */
/*  JSON Schema handed to the model (kept hand-written so it stays provider    */
/*  agnostic and free of unsupported keywords such as additionalProperties).   */
/* -------------------------------------------------------------------------- */

const str = { type: "string", nullable: true } as const;
const strList = { type: "array", items: { type: "string" } } as const;
const num = { type: "number", nullable: true } as const;
const int = { type: "integer", nullable: true } as const;
const bool = { type: "boolean" } as const;

export const TRAVEL_BRIEF_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    tripType: { type: "string", enum: [...TRIP_TYPES] },
    purpose: { type: "string", enum: [...TRIP_PURPOSES] },
    urgency: { type: "string", enum: [...URGENCY] },
    traveller: {
      type: "object",
      properties: {
        name: str,
        email: str,
        phone: str,
        company: str,
        loyaltyPrograms: strList,
      },
      required: ["name", "email", "phone", "company", "loyaltyPrograms"],
    },
    origin: {
      type: "object",
      properties: { city: str, region: str, country: str, iata: str, nights: int },
      required: ["city", "region", "country", "iata", "nights"],
    },
    destinations: {
      type: "array",
      items: {
        type: "object",
        properties: { city: str, region: str, country: str, iata: str, nights: int },
        required: ["city", "region", "country", "iata", "nights"],
      },
    },
    dates: {
      type: "object",
      properties: {
        departDate: str,
        returnDate: str,
        rawDateText: str,
        durationNights: int,
        flexible: bool,
        flexibilityDays: int,
      },
      required: [
        "departDate",
        "returnDate",
        "rawDateText",
        "durationNights",
        "flexible",
        "flexibilityDays",
      ],
    },
    party: {
      type: "object",
      properties: {
        adults: int,
        children: int,
        infants: int,
        childAges: { type: "array", items: { type: "integer" } },
        rooms: int,
        notes: str,
      },
      required: ["adults", "children", "infants", "childAges", "rooms", "notes"],
    },
    budget: {
      type: "object",
      properties: {
        min: num,
        max: num,
        currency: str,
        basis: { type: "string", enum: [...BUDGET_BASIS] },
        raw: str,
      },
      required: ["min", "max", "currency", "basis", "raw"],
    },
    flights: {
      type: "object",
      properties: {
        cabinClass: { type: "string", enum: [...CABIN_CLASSES] },
        preferredAirlines: strList,
        avoidAirlines: strList,
        nonStopOnly: bool,
        maxStops: int,
        seatPreference: str,
        departureWindow: str,
        baggage: str,
      },
      required: [
        "cabinClass",
        "preferredAirlines",
        "avoidAirlines",
        "nonStopOnly",
        "maxStops",
        "seatPreference",
        "departureWindow",
        "baggage",
      ],
    },
    accommodation: {
      type: "object",
      properties: {
        type: str,
        starRating: num,
        boardBasis: str,
        roomType: str,
        locationPreference: str,
        mustHaveAmenities: strList,
      },
      required: [
        "type",
        "starRating",
        "boardBasis",
        "roomType",
        "locationPreference",
        "mustHaveAmenities",
      ],
    },
    ground: {
      type: "object",
      properties: {
        carRental: bool,
        airportTransfer: bool,
        railRequired: bool,
        notes: str,
      },
      required: ["carRental", "airportTransfer", "railRequired", "notes"],
    },
    activities: strList,
    dietary: strList,
    accessibility: strList,
    specialRequests: strList,
    dealBreakers: strList,
    missingInfo: strList,
    followUpQuestions: strList,
    confidence: { type: "number" },
  },
  required: [
    "summary",
    "tripType",
    "purpose",
    "urgency",
    "traveller",
    "origin",
    "destinations",
    "dates",
    "party",
    "budget",
    "flights",
    "accommodation",
    "ground",
    "activities",
    "dietary",
    "accessibility",
    "specialRequests",
    "dealBreakers",
    "missingInfo",
    "followUpQuestions",
    "confidence",
  ],
} as const;

/* -------------------------------------------------------------------------- */
/*  An empty brief — the shape every parser starts from                        */
/* -------------------------------------------------------------------------- */

export function emptyBrief(): TravelBrief {
  return {
    summary: "",
    tripType: "unknown",
    purpose: "unknown",
    urgency: "normal",
    traveller: { name: null, email: null, phone: null, company: null, loyaltyPrograms: [] },
    origin: { city: null, region: null, country: null, iata: null, nights: null },
    destinations: [],
    dates: {
      departDate: null,
      returnDate: null,
      rawDateText: null,
      durationNights: null,
      flexible: false,
      flexibilityDays: null,
    },
    party: { adults: null, children: null, infants: null, childAges: [], rooms: null, notes: null },
    budget: { min: null, max: null, currency: null, basis: "unknown", raw: null },
    flights: {
      cabinClass: "unknown",
      preferredAirlines: [],
      avoidAirlines: [],
      nonStopOnly: false,
      maxStops: null,
      seatPreference: null,
      departureWindow: null,
      baggage: null,
    },
    accommodation: {
      type: null,
      starRating: null,
      boardBasis: null,
      roomType: null,
      locationPreference: null,
      mustHaveAmenities: [],
    },
    ground: { carRental: false, airportTransfer: false, railRequired: false, notes: null },
    activities: [],
    dietary: [],
    accessibility: [],
    specialRequests: [],
    dealBreakers: [],
    missingInfo: [],
    followUpQuestions: [],
    confidence: 0,
  };
}
