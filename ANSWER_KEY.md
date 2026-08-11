# ANSWER KEY — CB207-C301 derived corpus

**Internal. Demo preparation only. Do not show a prospect this file.**

Every item below is planted in `corpus/derived/authoring/` and reproduced from
the catalogue of real defects found in a public Phase III statistical analysis
plan. Surface values differ; the failure shapes do not.

`corpus/derived/manifest.json` is the machine-readable version of this file, and
`src/engine/__tests__/pipeline.test.ts` asserts it against the real pipeline
output. **If you edit the corpus and not the manifest, the build fails.** That is
deliberate: it is the mechanism that stops this document drifting away from what
the engine actually does — which is the exact failure mode the product exists to
catch.

Run totals: **5 documents · 204 paragraphs · 267 entities · 119 concepts and
declared checks · 52 findings** (6 critical, 25 major, 21 minor), of which 3 are
downgraded decoys, plus **11 arithmetic checks, 10 confirmed**.

---

## The two findings to build the demo around

### 1. Planned 752 against 811 randomised — `sample_size.planned~sample_size.randomised`

| Where | Value |
|---|---|
| PROTOCOL v2.0 §1, §13 | 752 planned |
| SAP v1.0 §2.3 and Figure 1 | 752 planned |
| SAP v1.0 §5.2 Table 3 (total row) | **811** |
| CSR v1.0 §2 | **811** randomised |

CRITICAL, confidence 0.95, cross-document. An overshoot of 7.8%.

The point to make out loud: **both numbers are individually correct, and the
engine says so.** The arithmetic panel on Run QC shows that the region rows sum
to exactly 811 and that 331 evaluable inflated for 12% dropout gives exactly 376
per arm and 752 in total. Neither figure is an arithmetic error. The plan is
written in the future tense and the table in the past, which is precisely why
this survives ordinary QC and why an inspector reconciles it first.

The engine will not report an overshoot under 2% at all — it downgrades it with
a note about screening lag at study close. Change 811 to 760 in
`corpus/derived/authoring/sap.ts`, run `npm run corpus`, and watch it drop below
the review threshold.

### 2. Opposite verdicts from two pre-specified criteria — `equivalence.criteria_verdict`

CRITICAL, confidence 0.76, cross-document (SAP + CSR).

| Criterion (SAP §5.5) | Reported (CSR §4) | Verdict |
|---|---|---|
| EMA: 95% CI of the **difference** within [-12, 12] | 8.50% (95% CI 1.93 to 15.07) | **NOT MET** — upper bound outside |
| FDA: 90% CI of the **ratio** within [0.760, 1.510] | 1.206 (90% CI 1.068 to 1.362) | **MET** |

The chain to show, in this order:

1. PROTOCOL §13 pre-specifies a **95%** interval for the ratio.
2. SAP §5.5 replaces it with a **90%** interval — finding B1, CRITICAL.
3. The SAP modification history records the change at v0.3 with a date.
4. Against the reported intervals, the two surviving criteria **disagree**.

The study simultaneously passed and failed, depending on which pre-specified
criterion a reviewer applies. Nobody needs the ROI slide after that.

---

## A. Numeric and statistical

| # | Finding | Concept key | Engine |
|---|---|---|---|
| A1 | Planned 752 vs 811 randomised | `sample_size.planned~sample_size.randomised` | CRITICAL 0.95 |
| A2 | Region counts sum correctly to 811 | — | *arithmetic CONFIRMED* |
| A3 | 331 evaluable + 12% dropout → 376/arm → 752 | — | *arithmetic CONFIRMED* |
| A4 | Dose intensities 6/21, 75/21, 600/21 reproduce | — | *arithmetic CONFIRMED ×3* |
| A5 | Margin stated 12% where 15.2 × 0.8 = 12.16% | `design.equivalence_margin` | MINOR 0.90 |
| A6 | 80% power (efficacy) vs 90% power (PK) | `stat.power` | **DECOY** MINOR 0.18 |
| A7 | Default 95% CI vs 90% CI for the primary criterion | `stat.default_ci_level~equivalence.ci_level.ratio` | MAJOR 0.53 |
| A8 | 95% CI for the ratio in a labelled additional analysis | `equivalence.ci_level.ratio` (intra-SAP) | **DECOY** MINOR 0.18 |

A5 is checked **exactly** rather than to the precision the document used. A
margin is a regulatory commitment; rounding it down is conservative, which is
why it scores MINOR, but a stated derivation that does not reproduce is still
worth a reviewer's minute.

A7 carries a *mitigating* note rather than a downgrade: §3.3 says "unless
otherwise specified" and §5.5 does specify otherwise, so the difference is
probably intentional. Severity stays MAJOR because the risk is not the drafting
— it is that the analysis programs pick up the default. Confidence drops to 0.53
to say exactly that.

## B. Documented divergence from the protocol

| # | Finding | Concept key | Engine |
|---|---|---|---|
| B1 | 90% CI replaces the protocol's 95% for the ratio | `equivalence.ci_level.ratio` (cross-doc) | CRITICAL 0.74 |
| B2 | PK population revised: ≥4 cycles vs all 8 | `population.pk_set.cycle_requirement` | MAJOR 0.72 |
| B3 | 9 subjects at 2 Ukrainian sites excluded from the PPS | `population.pps_site_exclusion` | MAJOR 0.73 |

**This is the confirm-with-rationale path. Rehearse it.** All three are
deliberate and recorded in the SAP modification history. Use
**Confirm as intentional** on B1: the flag stands, the rationale is captured, and
the audit trail records who accepted it and when. Buyers need to see that a flag
is not an accusation — a tool that can only say "wrong" is a tool their team
will fight.

B3 is a coverage finding, not a value comparison: the SAP applies a named-site
exclusion and the protocol has no corresponding provision. There is no second
value to compare against, which is why a pure value-mismatch engine misses it.

## C. Internal logic and definitions

| # | Finding | Concept key | Engine |
|---|---|---|---|
| C1 | Adjuvant TEAE names the surgery date with no comparator | `definition.teae_shape` | CRITICAL 0.73 |
| C2 | LVEF categories list one band twice, leaving <45 uncovered | `definition.category_set_integrity` | MAJOR 0.80 |
| C3+C4 | Three parallel dose-intensity formulas, three cycle offsets | `derivation.dose_intensity_shape` | MAJOR 0.73 |
| C5 | "No statistical comparisons for safety" vs three specified tests | `policy.safety_testing_contradiction` | MAJOR 0.50 |

C1 works by reducing each period's definition to a shape:
`GTE(FIRST_IP) + LTE(SURGERY)` for the neoadjuvant period against
`GTE(FIRST_IP) + UNQUALIFIED(SURGERY)` for the adjuvant one. The dropped "on or
before" is invisible to a reader holding two sentences in their head and obvious
once both are normalized. Say that; it is the clearest one-sentence explanation
of what normalization buys you.

C3+C4 surface as **one** finding with three variants rather than the two the
source catalogue lists. One finding reading "three parallel formulas use three
different cycle offsets" is more useful to a reviewer than two findings that
each describe half of it.

C5 is deliberately scored at 0.50 with a mitigating note: the scope of the word
"safety" is genuinely ambiguous, and the ambiguity is itself the defect.

## D. Cross-reference integrity

| # | Finding | Concept key | Engine |
|---|---|---|---|
| D1 | Partial dates cited to APPENDIX 1 (the visit-name table) | `crossref.integrity` | MAJOR 0.81 |
| D2a | Mod history cites appendix 4 for CTC grading (it is 6) | `crossref.integrity` | MAJOR 0.81 |
| D2b | Mod history cites appendix 5 for deviations (it is 7) | `crossref.integrity` | MAJOR 0.81 |
| D3 | 12+ references resolve correctly | — | *true negatives, counted not reported* |

All three broken references **resolve** — the appendix they name exists. What is
wrong is that it is not the appendix they describe. The check reads the words of
the reference's own description, scores them against the heading it points at,
and against every other heading in the document; a better match elsewhere means
the reference is stale. This is what happens to every cross-reference in a
document whose appendices were renumbered between drafts, and D2 is exactly that
case: the modification history was written before the renumbering at v0.8.

D2 surfaces as two findings because they are two broken references needing two
dispositions.

## E. Terminology and controlled vocabulary

| # | Finding | Concept key | Engine |
|---|---|---|---|
| E1 | Three grading versions in one plan: 4.0, 4.03, 3.0 | `safety.ae_grading_scale` (intra-SAP) | MAJOR 0.73 |
| E2 | PR = progesterone receptor **and** partial response | `acronym.PR` | MAJOR 0.72 |
| E3 | PD = progression of disease, PDs = protocol deviations | `acronym.PD` | MAJOR 0.72 |
| E4 | ATCC used for the Anatomical Therapeutic Chemical classification | `standard.acronym.anatomical_therapeutic_chemical` | MAJOR 0.80 |
| E5 | Mostellar for Mosteller | `standard.spelling.mosteller` | MINOR 0.82 |
| E6 | pathologic vs pathological | `vocabulary.pathological_complete_response` | MINOR 0.68 |
| E7 | "Sensitive Analysis" heading vs sensitivity analysis | `vocabulary.sensitivity_analysis` | MINOR 0.68 |
| E8 | ECOG summarised as (0, 1, >1), listed on the 0–5 scale | `reporting.ecog_scale` | MAJOR 0.71 |
| E9a/b | Full Analysis Set / Per-Protocol Set capitalised inconsistently | `vocabulary.*` | MINOR 0.68 |
| E10 | CTC used for CTCAE | `standard.acronym.common_terminology_criteria` | MAJOR 0.80 |

E2 and E3 are read out of the document's **own abbreviation table**, not from a
configured list. E3 needs the plural normalized — PDs and PD are one acronym.

E4 and E10 compare the declared expansion against an external standard: the
expansion is right and the acronym is wrong, which no spell check catches and no
value comparison finds, because there is nothing in the submission to compare it
against. A reviewer who looks up ATCC finds the American Type Culture
Collection.

E8 is the hook back to protocol eligibility. The protocol permits ECOG 0–1; a
summary category of ">1" can hold a value the protocol excludes, and the listing
scale goes to 5.

## F. eCRF page-name drift

| # | Surface forms | Concept key | Engine |
|---|---|---|---|
| F1 | pCR / Pathological Complete Response | `crf_page.pcr` | MAJOR 0.82 |
| F2 | Clinical Response / RESPONSE / CRDAT | `crf_page.clin_response` | MAJOR 0.82 |
| F3 | Disease stage / Disease Stage | `crf_page.disease_stage` | MINOR 0.82 |
| F4 | Physical Examination / Physical Exam- Screening | `crf_page.phys_examination` | MAJOR 0.82 |
| F5 | End of Study / End of Study (EOS) | `crf_page.end_study` | MINOR 0.67 |
| F6 | IP infusion / IP Infusion / Non-IP Infusion | `crf_page.non_ip_infusion` | MAJOR 0.82 |

F1 and F2 only cluster because the engine expands acronyms using the document's
own abbreviation table: pCR → pathologic complete response, CRDAT → clinical
response data page. That is worth pointing at — it is the same table doing work
in two different checks.

Severity is computed, not assigned: a cluster whose forms differ only in
capitalisation or in a parenthesised acronym is MINOR (F3, F5); anything else is
MAJOR. F4 and F6 score MAJOR where the source catalogue called them minor. Say
so if asked — the reasoning is that "Physical Exam- Screening" and "Physical
Examination" may be two real pages or one page named twice, and the reviewer has
to open the database to find out. That is a MAJOR-shaped question.

## G. Derivation-spec integrity

| # | Finding | Concept key | Engine |
|---|---|---|---|
| G1 | Stratification variable as hrceptor / hreceptor / hrecptor | `derivation.identifier.hrcptr` | CRITICAL 0.71 |
| G2 | Treatment variable as trt / trt01pn / trtn | `derivation.identifier.trt` | CRITICAL 0.71 |
| G3 | One analysis block reads from two unrelated datasets | `derivation.dataset_consistency` | MAJOR 0.79 |
| G4 | Stray literal `8` inside the IML block | `derivation.code_hygiene` | MINOR 0.80 |
| G5 | "biomial" for binomial | `standard.spelling.binomial` | MINOR 0.82 |

**G1 is the finding that wins the statistician in the room.** Three spellings of
one variable in the code that implements the primary analysis: the program
either fails, or runs and stratifies on nothing.

The clustering is worth explaining because it is one sentence: strip digits and
the ADaM numeric-suffix conventions, then remove the vowels. `trt`, `trtn`, and
`trt01pn` all land on `trt`; `hrceptor`, `hreceptor`, and `hrecptor` all land on
`hrcptr`. No edit-distance threshold anybody would then have to defend.

G2 scores CRITICAL where the source catalogue called it major — every
identifier-spelling finding does, because the failure mode is the same one.

G3 excludes datasets the block creates itself, so a legitimate
`data sens; set adef;` chain does not fire. Appendix 4 is the control case and
stays quiet.

## H. Editorial

Seven findings, all MINOR: `catgory`, `PARAMTERS`, `ADDITONAL`, `preformed`,
`Owend`, `there neoadjuvant studies`, `Safety Set consist of`.

Individually worth nothing. As a count they are a volume-of-drift metric: a
document with seven of them has not had a careful read, and that is a fact a QC
lead wants before deciding how hard to look at everything else. Say that rather
than reading them out.

## I. Cross-document

| # | Finding | Concept key | Engine |
|---|---|---|---|
| I1 | Opposite equivalence verdicts | `equivalence.criteria_verdict` | CRITICAL 0.76 |
| I2 | ECOG 0–1 (Protocol, CRF) vs 0–2 (IB) | `inclusion.ecog` | MAJOR 0.95 |
| I3 | Safety follow-up 30 days vs 28 on the end-of-study page | `safety.followup_window` | MAJOR 0.95 |
| I4 | Grading 4.0 in four documents, 4.03 in the brochure | `safety.ae_grading_scale` | MAJOR 0.95 |
| I5 | Visit window ±3 (Protocol) vs ±5 (CRF) | `schedule.visit_window` | MINOR 0.72 |
| I6 | LVEF required at Cycle 9 Day 1, no CRF field | `assessment.lvef.c9d1` | MAJOR 0.71 |
| I7 | Phase 1 dose of 4 mg/kg once weekly in the brochure | `dose.regimen` | **DECOY** MINOR 0.18 |

I6 is the coverage check. The controls that prove it discriminates:
`assessment.lvef.screening`, `assessment.ecg.screening` and `assessment.ecg.eot`
are all present in both the Protocol and the CRF and produce nothing.

---

## The three decoys

All are **surfaced, not suppressed**. A reviewer can audit a downgraded finding;
they cannot audit one that was never shown. All three sit below the 0.50 review
threshold with a visible explanation.

- **A6** — 80% power for efficacy against 90% for pharmacokinetics. Different
  objectives are powered separately. Confidence 0.18.
- **A8** — a 95% interval for the ratio in §11.2.5, which the plan itself labels
  as an additional descriptive analysis excluded from the equivalence
  assessment. Confidence 0.18.
- **I7** — a 4 mg/kg weekly dose from the Phase 1 study CB207-C101, correctly
  labelled as such. Confidence 0.18.

The downgrade is **conditional, not absolute**: it applies only because removing
the benign occurrence collapses the remaining values to one. Prove it live —
change the IB §8 confirmatory regimen from 6 mg/kg to 5 mg/kg in
`corpus/derived/authoring/ib.ts`, run `npm run corpus`, and the dose finding
comes back at full severity, because the disagreement now survives without the
Phase 1 reference.

## Things the engine checked and did not report

Worth naming, because "we checked these and they agree" is half the value:

- `stat.alpha` — two-sided 0.05 in the Protocol and the SAP, stated both as
  "0.05" and as "5%" and normalized to one value
- `equivalence.ci_level.difference` — 95% in the Protocol and the SAP
- `schedule.cycle_interval` — 21 days everywhere
- `coding.meddra_version` — MedDRA 27.0 in the SAP and the CSR
- `assessment.lvef.screening`, `assessment.ecg.screening`, `assessment.ecg.eot`
- `standard.acronym.medical_dictionary_for_regulatory_activities` — MedDRA is
  declared correctly, and the same check that flagged ATCC stays quiet here
- 12+ internal references that resolve to the section they describe
- 10 of 11 recomputed derivations
