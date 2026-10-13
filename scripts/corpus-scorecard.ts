import { syntheticCorpusCases } from "@/data/synthetic-corpus";
import {
  syntheticEvidenceUniverse,
  syntheticOperationalEventGroundTruth,
  syntheticRequestingUser,
} from "@/data/synthetic-matter";
import {
  evaluateCorpus,
  formatCorpusScorecard,
} from "@/lib/corpus-evaluation";

const scorecard = evaluateCorpus({
  cases: syntheticCorpusCases,
  requestingUser: syntheticRequestingUser,
  evidenceUniverse: syntheticEvidenceUniverse,
  eventGroundTruth: syntheticOperationalEventGroundTruth,
});

process.stdout.write(`${formatCorpusScorecard(scorecard)}\n`);
