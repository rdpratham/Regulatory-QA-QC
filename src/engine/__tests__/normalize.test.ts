import { describe, expect, it } from 'vitest';
import {
  contentTokens,
  differsOnlyByCaseOrPunctuation,
  identifierRoot,
  normalizeAlpha,
  normalizeCiLevel,
  normalizeComparator,
  normalizeFrequency,
  normalizeScaleVersion,
  normalizeThreshold,
  normalizeTimepoint,
  normalizeTolerance,
  normalizeUnit,
  parseGradeRange,
  stem,
  toNumber,
  tokensContained,
} from '../extract/normalize';

describe('numbers', () => {
  it('reads digits, number words, and compounds', () => {
    expect(toNumber('752')).toBe(752);
    expect(toNumber('1,250')).toBe(1250);
    expect(toNumber('Nine')).toBe(9);
    expect(toNumber('forty-eight')).toBe(48);
    expect(toNumber('CB-207')).toBeNull();
  });
});

describe('comparators and thresholds', () => {
  it('maps every inequality spelling to one token', () => {
    for (const form of ['>=', '≥', 'greater than or equal to', 'at least']) {
      expect(normalizeComparator(form)).toBe('GTE');
    }
    for (const form of ['<=', '≤', 'no more than']) expect(normalizeComparator(form)).toBe('LTE');
  });

  it('produces a comparable threshold string across spellings', () => {
    expect(normalizeThreshold('>=', '50', 'mL/min')).toBe('GTE 50 mL/min');
    expect(normalizeThreshold('at least', '50', 'millilitres per minute')).toBe('GTE 50 mL/min');
  });
});

describe('units and frequency', () => {
  it('harmonizes units', () => {
    expect(normalizeUnit('milligrams')).toBe('mg');
    expect(normalizeUnit('mg/kg')).toBe('mg/kg');
    expect(normalizeUnit('percent')).toBe('%');
  });

  it('collapses dosing frequency spellings', () => {
    for (const form of ['once daily', 'QD', 'q.d.']) expect(normalizeFrequency(form)).toBe('QD');
    for (const form of ['twice daily', 'BID', 'b.i.d.']) expect(normalizeFrequency(form)).toBe('BID');
    expect(normalizeFrequency('every 21 days')).toBe('Q21D');
    expect(normalizeFrequency('once weekly')).toBe('QW');
    expect(normalizeFrequency('once daily')).not.toBe(normalizeFrequency('twice daily'));
  });
});

describe('versioned scales', () => {
  it('keeps trailing zeros, because CTCAE 4.03 is not CTCAE 4.3', () => {
    expect(normalizeScaleVersion('CTCAE', '4.03')).toBe('CTCAE 4.03');
    expect(normalizeScaleVersion('CTCAE', '4.03')).not.toBe(normalizeScaleVersion('CTCAE', '4.3'));
  });
});

describe('statistics', () => {
  it('carries hypothesis direction alongside alpha and accepts both notations', () => {
    expect(normalizeAlpha('0.05', 'two')).toBe('alpha 0.05 (two-sided)');
    expect(normalizeAlpha('5', 'two', true)).toBe('alpha 0.05 (two-sided)');
    expect(normalizeAlpha('0.025', 'one')).toBe('alpha 0.025 (one-sided)');
  });

  it('canonicalizes confidence levels', () => {
    expect(normalizeCiLevel('90', 'two')).toBe('90% CI (two-sided)');
    expect(normalizeCiLevel('90', 'two')).not.toBe(normalizeCiLevel('95', 'two'));
  });
});

describe('grade ranges', () => {
  it('reads every enumeration style used across document types', () => {
    expect(parseGradeRange('ECOG performance status of 0 or 1 at screening')).toBe('0-1');
    expect(parseGradeRange('ECOG performance status of 0 to 2 at study entry')).toBe('0-2');
    expect(parseGradeRange('ECOG: permitted responses are 0, 1, and 2')).toBe('0-2');
  });

  it('ignores field codes so their digits are not read as grades', () => {
    expect(parseGradeRange('Field ELIG-06 captures ECOG status; permitted responses are 0 and 1')).toBe('0-1');
  });

  it('returns null when no grade is present', () => {
    expect(parseGradeRange('ECOG performance status will be recorded at each visit')).toBeNull();
  });
});

describe('schedule', () => {
  it('canonicalizes timepoints', () => {
    expect(normalizeTimepoint('Cycle 9 Day 1')).toBe('c9d1');
    expect(normalizeTimepoint('the end-of-treatment visit')).toBe('eot');
    expect(normalizeTimepoint('screening')).toBe('screening');
  });

  it('canonicalizes visit window tolerance', () => {
    expect(normalizeTolerance('3', 'days')).toBe('+/-3 days');
  });
});

describe('clustering primitives', () => {
  it('stems the morphological pairs that defined terms drift between', () => {
    expect(stem('pathological')).toBe(stem('pathologic'));
    expect(stem('sensitivity')).toBe(stem('sensitive'));
    // The stem need not be a word — only stable across the forms that drift.
    expect(stem('clinical')).toBe(stem('clinically'));
  });

  it('drops stop words and form-specific noise from a page name', () => {
    expect(contentTokens('the End of Study eCRF page')).toEqual(['end', 'study']);
  });

  it('recognises a contained name, allowing an abbreviated token', () => {
    expect(tokensContained(contentTokens('Physical Examination'), contentTokens('Physical Exam- Screening'))).toBe(true);
    expect(tokensContained(contentTokens('Echocardiogram'), contentTokens('Electrocardiogram'))).toBe(false);
  });

  it('lands every spelling of one identifier on one root', () => {
    expect(identifierRoot('hrceptor')).toBe(identifierRoot('hreceptor'));
    expect(identifierRoot('hrecptor')).toBe(identifierRoot('hreceptor'));
    expect(identifierRoot('trt')).toBe(identifierRoot('trt01pn'));
    expect(identifierRoot('trtn')).toBe(identifierRoot('trt'));
  });

  it('keeps genuinely different identifiers on different roots', () => {
    expect(identifierRoot('bpcrfl')).not.toBe(identifierRoot('imputefl'));
    expect(identifierRoot('adpc')).not.toBe(identifierRoot('adpk'));
    expect(identifierRoot('stratum')).not.toBe(identifierRoot('count'));
  });

  it('separates case-only drift from spelling drift', () => {
    expect(differsOnlyByCaseOrPunctuation(['Disease stage', 'Disease Stage'])).toBe(true);
    expect(differsOnlyByCaseOrPunctuation(['pathologic', 'pathological'])).toBe(false);
  });
});
