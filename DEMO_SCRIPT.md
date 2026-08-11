# Demo script — six minutes

Read `ANSWER_KEY.md` first and know the planted items cold. Run this end to end
twice before showing anyone.

**Before you start:** `npm run dev`, put your name in the Reviewer field in the
sidebar, and leave the app on **Document set**. Do not pre-run the pipeline —
watching it run is part of the argument.

---

## 0:00 — What this is (30 seconds)

> "Five documents. Written by three organisations, at different times, against
> different versions of each other. The protocol is the sponsor's. The analysis
> plan and the study report are from one CRO, the case report form spec from
> another. They drift. Inspectors find the drift. QC teams under deadline do
> not.
>
> This reads all five and tells you where they disagree. It never edits
> anything. It flags, it cites, and it waits for a person."

Point at the document cards: type, version, effective date, **authoring
organisation**. The three different authors are the story.

---

## 0:30 — Run QC (60 seconds)

Click **Run QC**, then **Run QC** again to start it.

Let it run. Read the stage lines as they land:

> "It's parsing the PDFs now — the actual files, in the browser. Watermarks
> stripped, running headers and footers removed. Then it reconciles the page
> numbers: this analysis plan says 'Page 21 of 29' on the sheet your PDF reader
> calls page 23, and every citation you're about to see carries both."

When the summary lands, stop on the arithmetic table.

> "Before it reports a single discrepancy it recomputes what the documents claim
> about themselves. Ten of eleven derivations reproduce exactly. The region
> counts do sum to 811. The power calculation does reproduce. That matters,
> because in a moment I'm going to show you two numbers that disagree, and the
> first question a statistician asks is 'which one is the arithmetic error?'
> Neither. That's the point."

---

## 1:30 — The finding that sells it (90 seconds) — **SLOW DOWN HERE**

**Open findings workbench**, select **F-001**.

> "The analysis plan is designed around 752 randomised subjects. Section 2.3
> derives it: 331 evaluable per arm, inflated 12% for dropout, 376 per arm, 752
> total. Figure 1 repeats it.
>
> Three sections later, the regional disposition table totals 811. The study
> report says 811 too. An 8% overshoot against the pre-specified sample size,
> sitting unremarked in a document otherwise written in the future tense."

Now the part to slow down on. Point at the excerpt panes.

> "Left, the plan. Right, the table. Each one shows you the actual paragraph
> from the actual PDF, with the number underlined in place, and the citation
> above it: document, version, section, printed page, PDF page.
>
> Nothing here is generated. That's the sentence in the document. You can hand
> this to a reviewer and they can confirm it without opening the file — and when
> they do open the file, it's on the page we said."

Hover **confidence 0.95**.

> "And there's no magic number. Every score decomposes: how specific the rule
> was, whether the surrounding context matched, how many documents corroborate
> each value, how much evidence there is. Your team will ask. This answers."

---

## 3:00 — The moment that ends the conversation (60 seconds)

Select **F-002 — Pre-specified equivalence criteria return opposite verdicts**.

> "The plan pre-specifies two acceptance criteria, because two regulators wanted
> two things. EMA gets a 95% interval on the difference within plus or minus 12.
> FDA gets a 90% interval on the ratio within 0.760 to 1.510.
>
> Against the reported results: the ratio criterion is met. The difference
> criterion is not — the upper bound is 15.07 against a margin of 12.
>
> The study passed and failed simultaneously, depending on which pre-specified
> criterion you apply. Both were agreed in advance, so neither can be quietly
> set aside afterwards."

Then select **F-003** and show the chain.

> "And here's how it got there. The protocol specified a 95% interval for the
> ratio. The analysis plan replaced it with 90%, and the modification history
> records the change at version 0.3 with a date. That's a documented, deliberate
> divergence."

**Now demonstrate the disposition path** — this is the part buyers need to see.

Type a comment ("Confirmed against SAP modification history v0.3, agreed with
sponsor 14 Feb 2024; change predates unblinding") and click
**Confirm as intentional**.

> "A flag is not an accusation. Some divergences are deliberate and recorded.
> The tool still flags it — it has to, an inspector will — and the reviewer
> confirms it as intentional with the rationale. That goes in the audit trail
> with a name and a timestamp. What you have afterwards is not a clean document.
> It's a documented one, which is what a health authority actually asks for."

---

## 4:00 — Two more, fast (45 seconds)

Filter the master list to **CRITICAL**.

Select **F-005 — programming identifier spelling**.

> "Three spellings of one stratification variable, in the code appendix that
> implements the primary analysis. `hrceptor`, `hreceptor`, `hrecptor`. That
> program either fails, or runs and stratifies on nothing. No human reading two
> appendices twenty pages apart catches that."

Select **F-004 — TEAE definition**.

> "The neoadjuvant definition says onset on or after first dose and on or before
> surgery. The adjuvant one says on or after first dose *and the date of
> surgery* — no comparator. A programmer has to guess whether the surgery date
> opens or closes the window, and the safety database reflects the guess."

Then filter to **MINOR** and scroll, without reading them out.

> "And twenty-one of these. Spellings, capitalisations, a stray literal left in
> a code block. Individually worth nothing. As a count it tells your QC lead how
> carefully this document was read before it reached them."

---

## 4:45 — Consistency matrix (20 seconds)

> "Document by category, shaded by worst severity. This is the slide your team
> puts in front of the steering committee. Every cell is clickable — a picture
> of a conclusion that you can drill into is worth having; one you can't isn't."

Click a cell to prove it filters.

---

## 5:05 — The sign-off gate (55 seconds) — **SLOW DOWN HERE**

Go to **Audit trail**. Scroll to the top of the panel.

> "Here's the part I actually want you to push on."

Tick the attestation box. Point at the disabled **Sign off** button.

> "Fifty-one of fifty-two findings are still undispositioned, so this is
> refused. Not warned — refused. There is no override in this application, and
> there is no 'sign off anyway'.
>
> The one finding that isn't open is the one I dispositioned two minutes ago."

Scroll the event table.

> "And every step is here. Each document as it was ingested, with the page
> offset it detected. The extraction. The comparison run, against a named
> ruleset version. My disposition, with my name, my comment, and the timestamp.
>
> This log is append-only. There's no delete method on it and no code path in
> the application that removes an event — and there's a test in the suite that
> reads the source and fails the build if anyone ever adds one. That's the
> difference between claiming an audit trail and having one."

Export the CSV if they look interested.

---

## 6:00 — Stop.

Do not keep going. Let them ask.

---

# The three objections

## "How do we know it isn't hallucinating?"

> "It can't. There's no model in it. Extraction is regular expressions and
> normalization tables, comparison is set logic, and the whole thing runs
> offline — nothing left this laptop while you were watching.
>
> Which means two things you can check. First, every finding shows you the rule
> that produced it, by name, and the verbatim sentence it came from. Second, run
> it again: same documents, same findings, same order, same confidence scores.
> Every time. A tool that surfaced different findings on Tuesday than on Monday
> would be useless to you for exactly the reason you're asking."

If they push, point at the arithmetic table on Run QC.

> "And it reports what it checked and *didn't* find. Ten derivations recomputed
> and confirmed, twelve cross-references resolved correctly, three decoys
> deliberately held below the review threshold — the Phase 1 dose in the
> brochure, the pharmacokinetic power figure, the descriptive interval in
> section 11.2.5. A tool that only ever says 'wrong' is a tool your team learns
> to ignore."

## "What about our document formats?"

> "These are PDFs, parsed live in the browser just now. Watermark on every page,
> rotated export stamp down the margin, running header, running footer, and
> printed page numbers that don't match the PDF page numbers — which is what
> your submission documents actually look like.
>
> None of the boilerplate handling is configured for this study. It finds the
> header by noticing the same text at the same height on most pages. Point it at
> a different sponsor's template and the same code finds that sponsor's header.
>
> What we'd tune for you is the rule set, not the parser — the concepts your
> therapeutic area cares about. That's a scoping conversation, and it's the
> first two weeks."

## "How does this fit our QC SOP?"

> "It doesn't replace a step; it front-loads one. Your reviewer opens this
> instead of opening five PDFs, and arrives at the same reconciliation meeting
> with the discrepancies already located and cited.
>
> Nothing is auto-resolved — you saw that every disposition requires a comment
> and there's no path that records one without a reviewer name. The output is a
> print-ready discrepancy report with a QA sign-off block, and a CSV audit
> trail. Both slot into the QC documentation you already file.
>
> The sign-off gate is the piece that maps to your SOP most directly: it will
> not let anyone close a review with an open finding. If your SOP already says
> that, this enforces it. If it doesn't, this is the argument for adding it."

---

# If somebody asks to see it break

Say yes. It is the strongest thing you can do.

Open `corpus/derived/authoring/sap.ts`, change the region table total row from
`811` to `752`, run `npm run corpus`, and re-run.

The planned-versus-actual finding drops to a downgraded note about screening
lag, because the overshoot is now under 2%. The arithmetic check for the table
total **fails**, because the rows still sum to 811 and the total row now says
752.

> "Findings are computed, not stored. There's no list of answers in this
> codebase — and the test suite fails if the corpus and the expected findings
> ever disagree, which is the same discipline we're selling you."
