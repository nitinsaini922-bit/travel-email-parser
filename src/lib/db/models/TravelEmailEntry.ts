import mongoose, { Schema, type Document, type Model } from "mongoose";

import {
  BUDGET_BASIS,
  CABIN_CLASSES,
  TRIP_PURPOSES,
  TRIP_TYPES,
  URGENCY,
  type ParseEngine,
  type TravelBrief,
} from "@/lib/parser/schema";

/* -------------------------------------------------------------------------- */
/*  Sub-schemas — mirror src/lib/parser/schema.ts exactly, minus Mongo's       */
/*  auto _id on every nested object (we don't need one there).                 */
/* -------------------------------------------------------------------------- */

const PlaceSchema = new Schema(
  {
    city: { type: String, default: null },
    region: { type: String, default: null },
    country: { type: String, default: null },
    iata: { type: String, default: null },
    nights: { type: Number, default: null },
  },
  { _id: false },
);

const TravellerSchema = new Schema(
  {
    name: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    company: { type: String, default: null },
    loyaltyPrograms: { type: [String], default: [] },
  },
  { _id: false },
);

const DatesSchema = new Schema(
  {
    departDate: { type: String, default: null },
    returnDate: { type: String, default: null },
    rawDateText: { type: String, default: null },
    durationNights: { type: Number, default: null },
    flexible: { type: Boolean, default: false },
    flexibilityDays: { type: Number, default: null },
  },
  { _id: false },
);

const PartySchema = new Schema(
  {
    adults: { type: Number, default: null },
    children: { type: Number, default: null },
    infants: { type: Number, default: null },
    childAges: { type: [Number], default: [] },
    rooms: { type: Number, default: null },
    notes: { type: String, default: null },
  },
  { _id: false },
);

const BudgetSchema = new Schema(
  {
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    currency: { type: String, default: null },
    basis: { type: String, enum: BUDGET_BASIS, default: "unknown" },
    raw: { type: String, default: null },
  },
  { _id: false },
);

const FlightsSchema = new Schema(
  {
    cabinClass: { type: String, enum: CABIN_CLASSES, default: "unknown" },
    preferredAirlines: { type: [String], default: [] },
    avoidAirlines: { type: [String], default: [] },
    nonStopOnly: { type: Boolean, default: false },
    maxStops: { type: Number, default: null },
    seatPreference: { type: String, default: null },
    departureWindow: { type: String, default: null },
    baggage: { type: String, default: null },
  },
  { _id: false },
);

const AccommodationSchema = new Schema(
  {
    type: { type: String, default: null },
    starRating: { type: Number, default: null },
    boardBasis: { type: String, default: null },
    roomType: { type: String, default: null },
    locationPreference: { type: String, default: null },
    mustHaveAmenities: { type: [String], default: [] },
  },
  { _id: false },
);

const GroundSchema = new Schema(
  {
    carRental: { type: Boolean, default: false },
    airportTransfer: { type: Boolean, default: false },
    railRequired: { type: Boolean, default: false },
    notes: { type: String, default: null },
  },
  { _id: false },
);

/* -------------------------------------------------------------------------- */
/*  Top-level document                                                        */
/* -------------------------------------------------------------------------- */

export interface TravelEmailEntryDocument extends Document {
  // The raw inbound email text that was parsed.
  rawEmail: string;
  characters: number;

  // Everything the parser extracted (same shape as TravelBrief).
  summary: string;
  tripType: TravelBrief["tripType"];
  purpose: TravelBrief["purpose"];
  urgency: TravelBrief["urgency"];
  traveller: TravelBrief["traveller"];
  origin: TravelBrief["origin"];
  destinations: TravelBrief["destinations"];
  dates: TravelBrief["dates"];
  party: TravelBrief["party"];
  budget: TravelBrief["budget"];
  flights: TravelBrief["flights"];
  accommodation: TravelBrief["accommodation"];
  ground: TravelBrief["ground"];
  activities: string[];
  dietary: string[];
  accessibility: string[];
  specialRequests: string[];
  dealBreakers: string[];
  missingInfo: string[];
  followUpQuestions: string[];
  confidence: number;

  // Metadata about how the entry was produced.
  // (Named `parserModel`, not `model` — Mongoose's Document type already
  // has a `model` method, and reusing that name breaks the TS interface.)
  engine: ParseEngine;
  parserModel: string;
  latencyMs: number;
  warnings: string[];

  // Bookkeeping.
  clientIp: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const TravelEmailEntrySchema = new Schema<TravelEmailEntryDocument>(
  {
    rawEmail: { type: String, required: true },
    characters: { type: Number, required: true },

    summary: { type: String, default: "" },
    tripType: { type: String, enum: TRIP_TYPES, default: "unknown" },
    purpose: { type: String, enum: TRIP_PURPOSES, default: "unknown" },
    urgency: { type: String, enum: URGENCY, default: "normal" },
    traveller: { type: TravellerSchema, default: () => ({}) },
    origin: { type: PlaceSchema, default: () => ({}) },
    destinations: { type: [PlaceSchema], default: [] },
    dates: { type: DatesSchema, default: () => ({}) },
    party: { type: PartySchema, default: () => ({}) },
    budget: { type: BudgetSchema, default: () => ({}) },
    flights: { type: FlightsSchema, default: () => ({}) },
    accommodation: { type: AccommodationSchema, default: () => ({}) },
    ground: { type: GroundSchema, default: () => ({}) },
    activities: { type: [String], default: [] },
    dietary: { type: [String], default: [] },
    accessibility: { type: [String], default: [] },
    specialRequests: { type: [String], default: [] },
    dealBreakers: { type: [String], default: [] },
    missingInfo: { type: [String], default: [] },
    followUpQuestions: { type: [String], default: [] },
    confidence: { type: Number, default: 0 },

    engine: { type: String, enum: ["gemini", "openai", "heuristic"], required: true },
    parserModel: { type: String, required: true },
    latencyMs: { type: Number, required: true },
    warnings: { type: [String], default: [] },

    clientIp: { type: String, default: null },
  },
  { timestamps: true },
);

// Useful indexes for browsing/searching stored entries later.
TravelEmailEntrySchema.index({ createdAt: -1 });
TravelEmailEntrySchema.index({ "traveller.email": 1 });
TravelEmailEntrySchema.index({ tripType: 1, purpose: 1 });

// Reuse the compiled model across hot reloads instead of redefining it.
export const TravelEmailEntry: Model<TravelEmailEntryDocument> =
  (mongoose.models.TravelEmailEntry as Model<TravelEmailEntryDocument>) ||
  mongoose.model<TravelEmailEntryDocument>("TravelEmailEntry", TravelEmailEntrySchema);
