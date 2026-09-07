import { heuristicParse } from "../src/lib/parser/heuristic.ts";
import { SAMPLE_EMAILS } from "../src/lib/parser/samples.ts";

for (const s of SAMPLE_EMAILS) {
  const b = heuristicParse(s.body);
  console.log(s.label, "=>", JSON.stringify(b.budget));
}
