# Production path

What changes on the way from this demo to a validated system, and — more
importantly — what does not.

## What does not change

The comparison engine, the findings model, the citation model, and the audit
trail all survive unchanged. That is the point of the seam.

- **`Entity`** — a `conceptKey`, a normalized value, a citation a human can
  open, and the rule that produced it. Whether a regex or a model produced it is
  not visible downstream.
- **`compare.ts`** — grouping by concept, within and across documents, plus the
  declared checks. It consumes `Entity[]` and knows nothing about extraction.
- **`Citation`** — document, version, section, heading, printed page, PDF page,
  paragraph, verbatim snippet. This is the contract with the reviewer and it
  does not get weaker in production; it gets stronger, because coordinates get
  added to it.
- **`severity.ts` and `profiles.ts`** — the severity table and the regulatory
  context are reference data about concepts. They are reviewed and versioned
  like any other controlled document.
- **`audit.ts`** — append-only, with no delete path. In production the store
  moves from memory to an append-only table with row-level immutability, and
  nothing above it changes.

## 1. Ingestion at scale

The demo already does layout-aware parsing with coordinate retention, geometric
watermark removal, derived header/footer detection, and printed-to-PDF page
reconciliation. Production needs four additions.

**Coordinates in the citation.** Retain the bounding box of every extracted
value, not just its paragraph. A reviewer clicking a finding should land on the
page with the value highlighted in place. The `Citation` type gains a `bbox`
field; nothing else changes.

**DOCX and native formats.** Most submission documents exist as Word before they
exist as PDF, and the Word original has a real heading hierarchy, real tables,
and real cross-reference fields. Parsing the DOCX where it is available is
strictly better than parsing its PDF rendering. `ingest/` gains a second front
end producing the same `ParsedDocument`.

**Real tables.** The demo reconstructs table rows from line geometry, which
works because the generator lays tables out predictably. Production needs proper
table detection — ruling lines, column clustering, merged cells — because the
disposition table, the schedule of assessments, and the shell tables are where a
large share of the numeric drift lives.

**Scanned documents.** Legacy submissions include scanned appendices. OCR with a
confidence score per token, and a hard rule: a finding whose evidence came from
OCR below threshold is surfaced with that fact visible, never silently.

## 2. Hybrid extraction

`Extractor` is a one-method interface. `RulesExtractor` implements it today.
Production runs two implementations and merges their output.

**Rules keep the work they are better at.** Numerics, thresholds, version
strings, cross-reference resolution, code identifiers, arithmetic. A regex is
faster, cheaper, and — the part that matters here — auditable. You can show a
regulator the rule, the input, and the output, and the mapping between them is
total. You cannot do that with a model.

**An LLM extractor takes the work rules cannot reach.** Endpoint definitions
expressed in prose; analysis-set definitions written three different ways in
three documents; terminology drift across paraphrase rather than spelling; the
implied population restrictions that live in a subordinate clause. These are the
findings a rules engine misses, and they are not a small fraction.

The integration is `class LlmExtractor implements Extractor`. Constraints that
come with it:

- **The model extracts; it does not judge.** It returns entities with citations.
  Severity, confidence, and comparison stay in deterministic code. A model that
  decides what matters is a model whose output has to be validated as a decision
  rather than as a data extraction, and that is a much harder validation.
- **Every entity carries its evidence span.** An entity the model cannot point
  at a sentence for is discarded, not surfaced.
- **Two-pass agreement on high-severity concepts.** For concepts that map to
  CRITICAL, extract twice at temperature zero with different prompts and keep
  only agreeing entities. Disagreement is itself surfaced, at reduced
  confidence.
- **Determinism is a product requirement, not a preference.** The same
  submission has to produce the same findings on Tuesday that it produced on
  Monday. That means temperature zero, pinned model versions, cached extraction
  results keyed by document hash and ruleset version, and re-extraction only on
  an explicit version bump. A model upgrade is a ruleset version change and
  triggers re-validation.
- **Deployment.** Sponsors will not send clinical documents to a third-party
  API. Either a model in the sponsor's own cloud tenancy under their BAA, or an
  on-premise open-weights model. Both are supported by the same interface; the
  demo's "nothing leaves the laptop" claim becomes "nothing leaves your
  tenancy", which is the claim that actually clears their security review.

## 3. Confidence calibration

The demo's weights are hand-set and honest about it: every score decomposes into
factors visible in the UI. Production calibrates them against reviewer
dispositions, which the audit trail is already collecting.

Every disposition is a label. `CONFIRMED` and `INTENTIONAL_DOCUMENTED` are true
positives; `DISMISSED` is a false positive. After a few hundred dispositions
there is enough to fit the weights per concept family and report a precision
figure per severity band.

Two rules for that loop:

- **The threshold is the customer's, not ours.** Different QC groups have
  different tolerance for false positives. `REVIEW_THRESHOLD` becomes a
  per-tenant setting with a documented default.
- **Recalibration is a versioned change.** A confidence model that silently
  retrains is a system whose output cannot be reproduced, and reproducibility is
  the thing being sold. Recalibration bumps the ruleset version, and prior runs
  remain reproducible against the version that produced them.

## 4. Validation

This is a GxP computerised system supporting a regulatory submission. Treat it
as such from the first customer, not from the first audit.

**Computerised system validation.** Risk assessment under GAMP 5 — this is
Category 4 (configured) or 5 (custom) depending on how much of the rule set is
customer-specific. A validation plan, a requirements specification traceable to
the rule registry, a design specification, and a traceability matrix from
requirement to test to result.

**IQ / OQ / PQ.**

- *IQ* — installation qualification of the deployed environment: versions,
  dependencies, configuration, and a documented build provenance from a tagged
  commit.
- *OQ* — operational qualification against a known corpus. `corpus/derived/` is
  already the shape of this: a document set with a manifest of expected
  findings, executed by an automated suite that fails on any deviation. That
  suite becomes the OQ protocol with formal expected results and evidence
  capture.
- *PQ* — performance qualification on the customer's own documents, with a
  reviewer confirming that findings match a manual QC pass on a sample.

**21 CFR Part 11.** The audit trail is already append-only and computer
generated, records the actor and an ISO timestamp, and cannot be modified from
the application. Production adds:

- Authenticated users with unique credentials, so the actor is an identity
  rather than a typed name.
- Electronic signatures on sign-off: two-component authentication at signing,
  the signature manifestation printed on the report (name, date, time, meaning
  of the signature), and a link between the signature and the record that
  cannot be excised.
- Record retention and export in a durable, human-readable form for the
  retention period.
- System-level access controls and a documented account lifecycle.

**Change control.** The rule set is a controlled artefact. Adding, removing, or
retuning a rule bumps `RULESET_VERSION`, goes through review and approval, and
re-runs the OQ suite. Every audit event and every report already carries the
ruleset version, which is what makes a historical finding defensible: you can
say which version of which check produced it, and re-run that version.

**Data integrity (ALCOA+).** Findings are attributable (actor on every event),
legible (verbatim snippet retained), contemporaneous (timestamped at the point
of action), original (the citation points at the source document), and accurate
(the derivation is recomputed and shown). The gap to close in production is
*enduring* and *available*: durable storage with retention, and export in a form
that outlives the application.

## 5. What to build first

In order, on the evidence of what makes the demo land:

1. **Coordinates in citations plus a PDF viewer pane.** The side-by-side
   excerpt is what convinces people. Clicking through to the highlighted value
   in the actual page is the same argument, made twice as hard.
2. **DOCX ingestion.** It removes a whole class of parsing risk and it is the
   format QC teams actually hold.
3. **Rule authoring for the customer's therapeutic area.** The engine
   generalises; the concept list does not. This is the first two weeks of any
   engagement and it should be a documented, repeatable process rather than a
   consulting exercise.
4. **Authentication and electronic signature.** Nothing above matters to a
   Part 11 auditor until the actor is an identity.
5. **The LLM extractor.** Last, deliberately. Every finding it adds is a finding
   that has to be defended in validation, and the rules-based findings are worth
   selling on their own first.
