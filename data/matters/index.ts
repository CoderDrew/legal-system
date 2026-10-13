import {
  alSmithVendorEvidence,
  alSmithVendorEventGroundTruth,
  alSmithVendorMatter,
} from "@/data/matters/al-smith-vendor-review";
import {
  alanSmithWestfieldEvidence,
  alanSmithWestfieldEventGroundTruth,
  alanSmithWestfieldMatter,
} from "@/data/matters/alan-smith-v-westfield";
import {
  chenEmploymentEvidence,
  chenEmploymentEventGroundTruth,
  chenEmploymentMatter,
} from "@/data/matters/chen-employment-file";
import {
  patelHarborEvidence,
  patelHarborEventGroundTruth,
  patelHarborMatter,
} from "@/data/matters/patel-v-harbor";
import {
  riveraNorthwindEvidence,
  riveraNorthwindEventGroundTruth,
  riveraNorthwindMatter,
} from "@/data/matters/rivera-v-northwind";
import {
  smithPropertyAdditionalEvidence,
  smithPropertyEventGroundTruth,
} from "@/data/matters/smith-property-acquisition";
import type {
  OperationalEventGroundTruth,
  SyntheticEvidenceItem,
  SyntheticMatter,
} from "@/types/mattermind";

export const adversarialCorpusMatters: SyntheticMatter[] = [
  chenEmploymentMatter,
  riveraNorthwindMatter,
  patelHarborMatter,
  alanSmithWestfieldMatter,
  alSmithVendorMatter,
];

export const adversarialCorpusEvidence: SyntheticEvidenceItem[] = [
  ...smithPropertyAdditionalEvidence,
  ...chenEmploymentEvidence,
  ...riveraNorthwindEvidence,
  ...patelHarborEvidence,
  ...alanSmithWestfieldEvidence,
  ...alSmithVendorEvidence,
];

export const adversarialCorpusEventGroundTruth: OperationalEventGroundTruth = {
  ...smithPropertyEventGroundTruth,
  ...chenEmploymentEventGroundTruth,
  ...riveraNorthwindEventGroundTruth,
  ...patelHarborEventGroundTruth,
  ...alanSmithWestfieldEventGroundTruth,
  ...alSmithVendorEventGroundTruth,
};
