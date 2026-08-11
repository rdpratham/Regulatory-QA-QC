import { CROSSREF_RULES } from './crossref';
import { CRF_MAPPING_RULES } from './crf_mapping';
import { DERIVATION_RULES } from './derivation';
import { EDITORIAL_RULES } from './editorial';
import { NUMERIC_RULES } from './numeric';
import { POPULATION_RULES } from './population';
import { SCHEDULE_RULES } from './schedule';
import { STATISTICAL_RULES } from './statistical';
import { TERMINOLOGY_RULES } from './terminology';
import type { Rule } from './types';

export * from './types';
export { STANDARD_ACRONYMS } from './terminology';
export { MISSPELLINGS, CONFUSABLES } from './editorial';
export { teaeShape, categorySetIntegrity } from './derivation';

/** The registry. One module per category; every rule independently testable. */
export const RULES: Rule[] = [
  ...NUMERIC_RULES,
  ...STATISTICAL_RULES,
  ...POPULATION_RULES,
  ...SCHEDULE_RULES,
  ...TERMINOLOGY_RULES,
  ...CROSSREF_RULES,
  ...CRF_MAPPING_RULES,
  ...DERIVATION_RULES,
  ...EDITORIAL_RULES,
];

export const RULE_BY_ID = new Map(RULES.map((rule) => [rule.id, rule]));
