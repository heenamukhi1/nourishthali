import rawSeedData from "../../nourishthali-seed-data.json";
import type { NourishThaliSeedData } from "@/types/nourishthali";

export const seedData: NourishThaliSeedData =
  rawSeedData as unknown as NourishThaliSeedData;

