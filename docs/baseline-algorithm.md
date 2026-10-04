# Personal baselines and deviations

**Status:** approved rules, version `baseline-v1`. Implemented in the backend
(`com.coachpulse.baseline`) and returned by `GET /api/teams/{teamId}/athletes/today` as each athlete's `baseline` and
`assessment`. The thresholds are placeholders to be reviewed by a qualified sports-medicine professional before
launch; they all live in `BaselineRules`.

CoachPulse compares each athlete with **their own** usual levels, never with a fixed team or medical number.

## Definitions

- **Today** is the calendar day in the server's time zone (teams don't store their own yet).
- **The window** is the 21 days before today: from `today − 21 days` up to the end of yesterday.
- **Session load** = duration in minutes × RPE (1–10), in arbitrary units (AU). For example 60 min × RPE 8 = 480 AU.

## Wellness baseline

From the athlete's **morning check-ins in the window**. Today's check-in is not part of it, so it is never compared
with itself.

1. Keep one check-in per day: the **latest** one that day.
2. If fewer than **7** days remain, there is no baseline yet ("Baseline still forming").
3. Otherwise the baseline is the **mean** of each score (sleep quality, fatigue, muscle soreness, overall wellness),
   rounded to one decimal.

## Workload baseline

From the athlete's **post-training check-ins in the window and today**, leaving out the session being judged (the
athlete's latest), so it is never compared with itself. Rest days are not sessions and don't count.

1. If fewer than **4** sessions remain, there is no load baseline yet.
2. Otherwise:
   - **mean** = the average session load;
   - **usual range** = the 25th to 75th percentile of session loads (linear interpolation), i.e. the middle half.
   All three are rounded to whole AU, and the comparison below uses the rounded mean, as shown to the coach.

## Deviations and status

| Signal | Rule | Status |
|---|---|---|
| Safety symptom | Any symptom in today's morning check-in, or in the latest post-training check-in if it was today or yesterday. Needs no baseline. | High priority (`RED`) |
| Recovery | Today's morning check-in has fatigue or soreness **2 or more points above** the baseline, or wellness **2 or more points below** it (baseline rounded to one decimal) | Needs review (`YELLOW`) |
| Training load | The latest session's load is **15% or more above** the load baseline mean | Needs review (`YELLOW`) |
| Sleep | Shown next to the baseline; never flagged on its own | — |

The status is the most serious signal: `RED` with any safety symptom, else `YELLOW` with any other signal, else `GREEN`.
Recovery needs today's morning check-in and a wellness baseline; training load needs a load baseline. Until then
only safety symptoms are flagged.

## Output

`baseline` is null until there is a wellness baseline; its `trainingLoad` is null until there is a load baseline.
`assessment` is the result of the rules above, computed live on each request (`id` is null because it isn't stored;
storing assessments and raising alerts belongs to the signal engine). Reasons use the shapes in
[`api-contract.md`](api-contract.md#signal-engine-and-reason_codes).
