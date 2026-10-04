package com.coachpulse.baseline;

/**
 * The approved baseline rules (docs/baseline-algorithm.md). Placeholders until reviewed by a qualified
 * sports-medicine professional; change them here only, and bump {@link #VERSION} when they change.
 */
public final class BaselineRules {

    public static final String VERSION = "baseline-v1";

    /** Days before today that baselines are calculated from. */
    public static final int WINDOW_DAYS = 21;

    /** Days with a morning check-in needed for a wellness baseline. */
    public static final int MIN_MORNING_CHECKINS = 7;

    /** Sessions needed for a load baseline. */
    public static final int MIN_SESSIONS = 4;

    /** Points worse than the baseline, on a 1–5 scale, that count as a recovery signal. */
    public static final double RECOVERY_DELTA = 2.0;

    /** Percent above the load baseline mean that counts as a training signal. */
    public static final double LOAD_INCREASE_PCT = 15.0;

    private BaselineRules() {
    }
}
