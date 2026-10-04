# Risk model

**Status:** approved MVP model, version `risk-v1/baseline-v1`. Implemented in the backend (`com.coachpulse.risk`).
The points and bands are placeholders to be reviewed by a qualified sports-medicine professional before launch;
they all live in `RiskRules`.

The model is deterministic: the same check-ins and baselines always give the same result. It builds on the
personal baselines and deviation reasons in [`baseline-algorithm.md`](baseline-algorithm.md).

## Score (0–100)

The score orders and records how concerning a day is. **It is stored but never sent to the app or shown to anyone**
(see [`api-contract.md`](api-contract.md)): coaches see only the status and the plain-language reasons.

| Reason | Points |
|---|---|
| Any safety symptom (today's morning check-in, or the latest post-training check-in from today or yesterday) | **70**, plus **5** for each additional distinct symptom |
| Fatigue or soreness 2 points above the baseline / 3 or more | **15** / **25** each |
| Wellness 2 points below the baseline / 3 or more | **15** / **25** |
| Sleep 2 or more points below the baseline | **5** |
| Latest session load 15% / 30% / 50% or more above the baseline mean | **15** / **20** / **25** |

Without a safety symptom the score is **capped at 69**, so only a reported symptom can make an athlete high
priority. With one, the total is capped at **100**.

## Status

| Score | Status |
|---|---|
| 0–14 | `GREEN` — Normal |
| 15–69 | `YELLOW` — Needs review |
| 70–100 | `RED` — High priority (always a safety symptom) |

Sleep alone (5 points) stays `GREEN`; it adds to the score and is listed as a reason, but the app never shows it as
a signal. Every other reason is enough for `YELLOW` on its own.

## Reasons

Each assessment lists what contributed, in the `reason_codes` shapes of the API contract: `SAFETY_SYMPTOM` (the
symptoms and which check-in), `RECOVERY` (the metric — `FATIGUE`, `WELLNESS`, `SORENESS` or `SLEEP` — today's value
and the baseline) and `TRAINING_LOAD` (the session load, the usual range and the percent change).

## Storage

Every check-in an athlete submits is assessed right away and stored in `risk_assessments` with its score, status,
reasons and engine version. The table is an append-only history: rows are never updated or deleted.

The coach dashboard shows each athlete's latest assessment from today. For an athlete without a check-in today it
computes one live (not stored, `id` null), so symptoms reported after yesterday's training still show.

Raising alerts from assessments is not part of this model yet.
