## ✅ Full end-to-end scope

### 1) Threat assumption: **ECT can be corrupted** 🧨

So the system is designed as an **independent public truth layer**:

* Trust **evidence + reconciliation + transparency logs**, not any single institution.
* Always separate:

  * **Raw evidence** (photos/videos/events)
  * **Derived claims** (numbers, discrepancies, suspected tampering)
  * **Impact** (does it change anything?)

### 2) Track the whole chain, not just the final form 🔗

You explicitly said we must track:

* **Vote box** (identity + sealing)
* **Board** (tally board / public count display)
* **Counting process** (how voids/invalids handled)
* **Station identity** (so evidence is anchored)
* **Aggregation** (how station totals become constituency/national)
* **Invalid/voided ballots** (and how they alter outcomes)
* **Big picture** (seat-level impact, not just "this station is wrong")

So the system is **5 evidence streams + 2 analysis streams**:

#### Evidence streams (what people capture)

1. **Station anchor**

   * Station ID via registry selection (Province → Khet → Tambon → Station)
   * Plus photo evidence with visible **S.S. 5/18 header** (since no QR)

2. **Ballot box & seal**

   * Capture **box ID + seal ID** at key moments (intact → sealed → handoff)
   * Log these as **custody events** (your repo now includes custody UI)

3. **Counting process & tally board**

   * Evidence that count happened publicly (board photos, short clips)
   * Checklist events (count start/end, objections, interruptions)

4. **Invalid / void / no-vote handling**

   * Evidence of **invalid/blank/no-vote** piles and/or the summary totals on 5/18
   * Reconciliation fields to detect suspicious inflation patterns

5. **S.S. 5/18 forms (core proof)**

   * Constituency (MP) sheet
   * Party-list sheet
   * Captured and processed **independently** (decoupled statuses)

#### Analysis streams (what the system computes)

6. **Aggregation**

   * Verified station totals → constituency → national rollups
   * Coverage metrics (missing / pending / verified / disputed)

7. **Impact**

   * "Does this station matter?"
   * Margin-to-flip & leverage ranking
   * **Simulation sandbox**: change numbers → see outcome shift

### 3) "Tool helps people" philosophy (not volunteer-centric) 🧰

You said: "design a tool/process to help people—not people help us."
So the app must be self-serve:

* Guides **when to use / how to use**
* Makes "what to capture" simple (minimal vs ideal)
* Explains "what this changes" (impact)
* Produces "what to do next" (legal kit)

---

## ✅ Key design decisions you locked (must be remembered)

### Election scope

* **MP General Election only** (no referendum in v1)

### Core proof artifact

* **S.S. 5/18** posted at polling station after counting

### Verification model ("Trusted 1.5")

* **1 photo + user checksum + 1 trusted reviewer transcription**
* Auto-verify if reconciliation + checksum match passes

### Dirty baseline registry

* Use **ECT66 (2023) station dataset** as baseline
* Add **Unlisted Station** flow + admin merge review

### Open evidence stance

* Publish images openly
* **EXIF wiped** on ingest
* "Report/takedown" if faces/sensitive info appear

### DDoS / traffic resilience strategy

* Public totals served as **static JSON snapshots** via CDN
* No live DB reads for public dashboards during peak

---

## ✅ The "Simulation Ground" we discussed (with the nuance)

This part is critical and slightly under-specified in my earlier summary, so here's the precise version:

### What it is 🎮

A sandbox that lets users:

* pick a **constituency**
* select stations (or disputed ones)
* adjust values (candidate votes, invalid/no-vote, etc.)
* instantly see:

  * whether the constituency winner flips
  * how many votes are needed to flip
  * which stations are high leverage

### The nuance that must be explicit ⚠️

* **Constituency-seat simulation** is straightforward and should be MVP.
* **Party-list seat simulation** depends on the electoral rule set in force (formula changes historically).
  So: for MVP, the simulator should:

  * **guarantee correctness for constituency flip impact**
  * and label party-list impact as **"rule-set dependent"** unless you implement the exact legal allocation engine.

That's a real nuance: without a correct allocation model, party-list "national seat impact" becomes misinformation. The solution is either:

* implement the **exact** party-list allocation rules for that election, or
* keep party-list sandbox as "explore totals only" until rules are implemented.

---

## ✅ "Legal authority" part (critical nuance)

You said: "equip user with legal authority to go after ECT / corrupted party."

Nuance:

* We **cannot give authority**, but we **can make citizens operationally effective** by generating **legally usable artifacts**:

  * Evidence packet with **hashes**, **timestamps**, **audit trail**
  * Structured incident report
  * Clear routing to complaint channels

So the "authority" we provide is:

* **procedural power** (know where/how to file)
* **evidentiary power** (packets that hold up better)
* **strategic power** (impact ranking to focus on cases that can change outcomes)

---

## ✅ What I *did not explicitly include before* (now included)

These are the only "nuances" that were previously not spelled out clearly:

1. **Party-list seat impact is rule-set dependent** (needs correct allocation engine or label as conditional)
2. **Custody tracking beyond public visibility is limited**

   * Citizens can track seals/box IDs when visible
   * But you can't "guarantee" the full logistics chain unless you have eyes on every handoff
     → the system should treat custody as "observed events" with gaps explicitly shown
3. **Defamation / safety posture**

   * The app should default to **facts + evidence**, not accusations
   * Claims should be phrased as "discrepancy observed" / "seal mismatch observed"
4. **Methodology + reproducibility**

   * Publish how verification works, what "verified" means, what "disputed" means
   * Provide export so media/others can recompute totals

---

## Master checklist (printable) ✅🧾

If this list is in your docs, you won't forget anything:

### Evidence capture

* [ ] Station selection + header photo proof
* [ ] S.S. 5/18 constituency photo (clear header + grid + totals + signatures)
* [ ] S.S. 5/18 party-list photo (same)
* [ ] Invalid/blank/no-vote evidence (photo/checklist)
* [ ] Tally board / counting process evidence (photo/video/checklist)
* [ ] Ballot box & seal IDs logged at visible moments
* [ ] Incident reporting (intimidation, blockage, missing poster, etc.)

### Verification & integrity

* [ ] EXIF wipe + hashes + audit log
* [ ] Trusted 1.5 verification flow
* [ ] Disputed / rejected categories + senior review path
* [ ] Anti-spam / junk photo controls

### Aggregation & public transparency

* [ ] Verified-only totals default
* [ ] Coverage dashboard + missing/disputed map
* [ ] Static JSON snapshots via CDN

### Impact & action

* [ ] Swing threshold + "worth chasing?" indicator
* [ ] Simulation sandbox (constituency guaranteed; party-list conditional unless rule engine implemented)
* [ ] Legal packet generator (PDF/ZIP + hashes + incident summary + station metadata)
* [ ] Routing guidance (ECT/NACC/Ombudsman/info request)