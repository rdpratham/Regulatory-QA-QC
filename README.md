# Cross-Document Consistency QC

Deterministic, offline discrepancy detection across the interlocking documents
of a clinical trial submission — Protocol, Statistical Analysis Plan, Clinical
Study Report, Case Report Form specification, and Investigator's Brochure.

The tool ingests PDFs, extracts structured entities with page and section
citations retained, cross-references them within and across documents, and
produces a discrepancy report for a human to confirm. It never edits, rewrites,
or corrects anything. It flags, cites, and waits.

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # 402 tests — the manifest spec, ingestion, and every rule
npm run corpus       # regenerate the demo PDFs from corpus/derived/authoring/
```

No backend, no database, no authentication, and **no network call after the page
loads**. The PDF worker, the fonts, and the corpus are all served from the
application's own origin.

---

## What is real and what is simulated in this demo

Read this before showing it to anyone. Never let a buyer discover a limitation
you did not disclose.

**Real:**

- **The ingestion.** Five PDFs are parsed in the browser on every run using
  `pdfjs-dist`, with per-item coordinates, rotation, and font family retained.
  Rotated watermarks and margin stamps are dropped geometrically. Running
  headers and footers are found by detecting repeated text at repeated heights —
  derived from the file, never configured. Printed page numbers are read from
  the footers and reconciled against PDF page numbers, and the offset is
  different for different documents in the corpus because the parser has to
  detect it rather than assume it.
- **The extraction.** 27 named rules across nine categories, each independently
  tested against a positive case and a near miss.
- **The comparison.** Findings are computed from extracted entities by
  `compare.ts`. There is no findings array anywhere in the codebase. Edit a
  value in `corpus/derived/authoring/`, run `npm run corpus`, and the findings
  change — and the test suite fails until the manifest is updated to match.
- **The arithmetic.** Derivations the documents state about themselves are
  recomputed: table totals, sample size inflation, dose intensities, the
  equivalence margin. Confirmations are reported alongside failures.
- **The audit trail.** Append-only, with no delete or edit method and no code
  path that removes an event. A structural test reads the source and fails the
  build if one is introduced.

**Simulated:**

- **The corpus.** The five documents are synthetic. They were written to
  reproduce the structure and failure modes of a real Phase III statistical
  analysis plan released through a public clinical-information portal, at full
  fidelity — the same section skeleton, the same prose register, the same
  categories of drift — with a different sponsor, molecule, sites, and numbers.
  See *Corpus provenance* below.
- **The upload.** The document set is fixed so that the same run is reproducible
  in front of an audience. Arbitrary upload is a configuration change rather
  than a rewrite: `runPipeline` already takes an array of files and a
  descriptor per file.
- **The pacing.** The Run QC stepper is paced over roughly four seconds so the
  stages are legible. The pipeline itself completes in well under a second once
  the PDFs are parsed.
- **The extraction method.** Extraction is rules-based where production would be
  hybrid — rules for numerics, versions, cross-references and code identifiers;
  an LLM for endpoint semantics and paraphrase-level terminology drift. The seam
  for that is already in place and is a single interface. See `PRODUCTION.md`.

**Not simulated, and worth saying explicitly:** nothing in this application
calls a language model, and nothing leaves the machine. That is not a
limitation of the demo; it is the architecture, and it is why the same documents
produce the same findings every time.

---

## Corpus provenance

`corpus/derived/` holds the demo corpus and is generated from the TypeScript
sources in `corpus/derived/authoring/`. It is committed so the application runs
from a clean checkout.

`corpus/source/` is gitignored and ships empty. It is where a real disclosure
document goes when one is being used as an engineering fixture. The split is
deliberate:

- **Real documents drive engineering and validation.** Using a public
  disclosure as a parser test case and rule-tuning corpus is internal R&D.
- **Derived documents drive the demo.** Public disclosure portals release
  documents under non-commercial terms, and putting that watermark on screen
  during a paid sales pitch is both a licence question and — for a company
  selling compliance tooling — a very bad look in the room.

The ingestion tests run against `corpus/source/` when it is populated and skip
themselves when it is not, so a clean checkout is still green.

The therapeutic setting (neoadjuvant HER2-positive breast cancer, with cardiac
monitoring and pathological complete response endpoints) is retained because the
failure modes depend on it — LVEF category sets, dose intensity across two
treatment periods, hormone-receptor stratification. Every sponsor, CRO,
molecule, site, number, and sentence is invented.

---

## Architecture

```
corpus/
  source/                       real PDFs — gitignored, engineering fixture only
  derived/
    authoring/                  the corpus as TypeScript — edit here
    *.pdf                       generated by `npm run corpus`, committed
    documents.json              descriptors, generated
    manifest.json               planted items, hand-maintained, asserted by tests
scripts/build-corpus.ts         renders the authored corpus to PDFs
src/
  engine/
    types.ts                    Document, Entity, Finding, AuditEvent
    ingest/
      pdf.ts                    text extraction with coordinates and rotation
      deboilerplate.ts          watermark, header/footer, redaction handling
      pagination.ts             printed page <-> PDF page reconciliation
      structure.ts              section tree, paragraphs, abbreviation table
    extract/
      index.ts                  Extractor interface  <- the LLM swap point
      normalize.ts              canonicalization tables
      rules/                    one module per category
    arithmetic.ts               recomputation of stated derivations
    compare.ts                  seven comparison strategies
    severity.ts                 severity table and confidence scoring
    profiles.ts                 regulatory context per concept
    audit.ts                    append-only event log
    pipeline.ts                 the whole run, in order
  ui/                           six screens
  store.ts                      review state and disposition rules
```

### The data model

Four nouns carry the system. A **Document** is a parsed PDF: a section tree of
paragraphs, each with both page numbers. An **Entity** is one extracted fact
with the citation that proves it and the rule that found it. A **Finding** is a
disagreement between entities that share a `conceptKey`. An **AuditEvent**
records that any of the above happened.

### How findings are produced

`compare.ts` runs seven strategies over the extracted entities:

1. **Value comparison, within a document.** Most drift in an analysis plan is
   internal; a document that contradicts itself does not need a second document
   to be a problem.
2. **Value comparison, across documents**, using each document's settled
   position so an internal disagreement is reported once as internal rather than
   twice.
3. **Reference standards.** Some facts are wrong on their own: a cross-reference
   that names the wrong target, an acronym that is not the standard one for the
   term it expands, a category set that leaves a gap.
4. **Name clustering.** eCRF page names are linked by token set after acronym
   expansion using the document's own abbreviation table, then by similarity
   with a deliberately high floor.
5. **Coverage.** A concept required by one document with no counterpart in the
   document that must implement it. There is no second value to compare, so no
   value comparison would ever find it.
6. **Related concepts.** Declared pairs a naive comparison would either miss or
   over-report — planned against actual enrolment being the important one.
7. **Pre-specified criteria against reported results.** Each acceptance
   criterion is evaluated against the reported interval, and disagreeing
   verdicts are a finding in themselves.

### Severity and confidence are scored separately

They answer different questions. *Severity*: if this is real, how much does it
matter? *Confidence*: how likely is it the engine read the documents correctly?

A capitalisation drift is high-confidence and MINOR. A dose quoted from a
different study is low-confidence and, once downgraded, MINOR. Collapsing the
two into one number makes "certain but unimportant" indistinguishable from
"important but shaky", which is the fastest way to lose a regulatory audience.
Every confidence score carries its contributing factors, visible on hover.

### Benign patterns are downgraded, never suppressed

A rule can declare that a paragraph is a known-benign setting for it. The entity
is still extracted, still shown, and still carries its citation; what changes is
that severity drops and confidence is capped, with the reason rendered verbatim.
A reviewer can audit a downgraded finding. They cannot audit one that was never
surfaced.

The downgrade is conditional: it applies only when removing the benign
occurrences collapses the remaining values to one. If a real disagreement
survives without the benign occurrence, the finding stands at full severity.

---

## Design

The audience is a Director of Regulatory Affairs and a GCP Compliance Lead,
measured on inspection readiness, so the interface is built to read as an
instrument of record.

| Token | Value | Role |
|---|---|---|
| `--surface` | `#f7f8f9` | cool near-white ground |
| `--raised` / `--sunken` | `#ffffff` / `#eef0f2` | two further steps, no elevation |
| `--line` | `#e0e3e7` | hairline; there are no shadows anywhere |
| `--ink` | `#12151a` | text, with `--ink-muted` and `--ink-faint` below it |
| `--critical` | `#8f1d21` | oxblood |
| `--major` | `#96620c` | ochre |
| `--minor` | `#47566a` | slate |
| `--settled` | `#7c848e` | dispositioned; deliberately inert |

Colour appears with force in exactly one place: severity. Three colours that
read as a register rather than as a traffic light, plus one neutral. Everything
else is greyscale.

Type is a system grotesque for the interface and a real monospace for **every
extracted value, document identifier, page reference and timestamp**. The
monospace is the signature: in this product the value *is* the evidence and it
should look like evidence. No web fonts are loaded — a demo that reaches for a
font CDN fails the security question it exists to pass.

Citations are typographically first-class and always carry both page numbers:

```
PROTOCOL v2.0 · §5.2 · p.7 (pdf 9)
```

The document type is set in letterspaced monospace uppercase. An inspector
cites the printed page; a reviewer opening the file navigates by the PDF page. A
citation carrying only one of them sends somebody to the wrong sheet, and a
citation that sends somebody to the wrong sheet is worse than no citation
because it looks precise and is not.

Motion appears only where it communicates state: the QC stepper animates and
nothing else does, and it respects `prefers-reduced-motion`. Empty states are in
the interface's voice — "No findings match these filters", with a clear-filters
action, not an illustration. Focus is visible throughout.

---

## Testing

```bash
npm test
```

- **`pipeline.test.ts`** is the specification. It runs the real pipeline over
  the generated PDFs and asserts every item in `manifest.json` at the expected
  severity, from the expected documents, with the decoys held below the review
  threshold and the true negatives confirmed rather than reported.
- **`ingest.test.ts`** tests against the real PDFs, not a fixture of clean text:
  no watermark fragment survives, the page offset is detected per document, code
  appendices stay line-structured, table rows stay separable, and the
  abbreviation table is read out of the document.
- **`rules.test.ts`** fires every registered rule on its positive case and on a
  near miss. A completeness test fails if a rule is added without a case.
- **`audit.test.ts`** includes a structural test that reads the source tree and
  fails if any code path mutating the audit log is introduced.
- **`normalize.test.ts`** covers the canonicalization and clustering primitives.

---

## Further reading

- `ANSWER_KEY.md` — every planted item, its location, and how the engine scores
  it. Internal; do not show a prospect.
- `DEMO_SCRIPT.md` — a six-minute walkthrough with the objections and their
  answers.
- `PRODUCTION.md` — what changes and what does not on the way to a validated
  system.
