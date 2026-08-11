# corpus/source — engineering fixtures only

This directory is **gitignored except for this file**. It ships empty.

It is where a real clinical document goes when it is being used as a parser test
case or a rule-tuning corpus. Documents released through public
clinical-information portals typically carry a non-commercial disclosure notice.
Using one as an internal engineering fixture is research; putting its watermark
on screen during a paid sales demo is a licence question and, for a company
selling compliance tooling, a bad look in the room.

The split the project holds to:

- **Real documents drive engineering and validation.** Drop a PDF here and the
  ingestion tests will parse it.
- **Derived documents drive the demo.** `corpus/derived/` reproduces the
  structure and failure modes of a real document at full fidelity, with every
  identifying detail invented.

The tests in `src/engine/__tests__/ingest.test.ts` that target this directory
skip themselves when it is empty, so a clean checkout stays green.

If you want a real document on screen in front of a customer, read the portal's
terms of use and get permission in writing first. "These are real regulatory
disclosure documents" is a strong line — get the permission before you build the
deck around it.
