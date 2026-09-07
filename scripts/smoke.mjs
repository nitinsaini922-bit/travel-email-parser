const BASE = process.argv[2] || "http://localhost:3000";

const res = await fetch(`${BASE}/api/samples`);
const { samples } = await res.json();

console.log(`\nengine status:`, await (await fetch(`${BASE}/api/health`)).json());

for (const sample of samples) {
  const started = Date.now();
  const r = await fetch(`${BASE}/api/parse-email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: sample.body }),
  });
  const json = await r.json();
  if (!json.ok) {
    console.log(`\n[FAIL] ${sample.label}: ${json.error}`);
    continue;
  }
  const d = json.data;
  console.log(`\n──────── ${sample.label}  (${json.engine}, ${Date.now() - started}ms) ────────`);
  console.log("summary  :", d.summary);
  console.log("route    :", `${d.origin.city ?? "?"} → ${d.destinations.map((x) => x.city).join(" → ") || "?"}`);
  console.log("dates    :", d.dates.departDate, "→", d.dates.returnDate, `(${d.dates.durationNights ?? "?"} nights)`);
  console.log("party    :", `${d.party.adults ?? "?"} adults / ${d.party.children ?? 0} children`, d.party.childAges);
  console.log("budget   :", d.budget.currency, d.budget.min, "-", d.budget.max, d.budget.basis);
  console.log("cabin    :", d.flights.cabinClass, "| nonstop:", d.flights.nonStopOnly, "| airlines:", d.flights.preferredAirlines);
  console.log("stay     :", d.accommodation.type, d.accommodation.starRating, d.accommodation.boardBasis, d.accommodation.mustHaveAmenities);
  console.log("purpose  :", d.purpose, "| urgency:", d.urgency, "| trip:", d.tripType, "| conf:", d.confidence);
  console.log("gaps     :", d.missingInfo);
}
console.log("");
