package com.coachpulse.risk;

import com.coachpulse.baseline.BaselineRules;

/**
 * The approved risk model (docs/risk-model.md). Placeholders until reviewed by a qualified sports-medicine
 * professional; change them here only, and bump {@link #VERSION} when they or the baseline rules change.
 */
public final class RiskRules {

    /** Stored with every assessment: the risk model and the baseline rules it was computed with. */
    public static final String VERSION = "risk-v1/" + BaselineRules.VERSION;

    public static final int MAX_SCORE = 100;

    /** Any safety symptom, plus a little more for each additional one. */
    public static final int SAFETY_SYMPTOM = 70;
    public static final int EACH_EXTRA_SYMPTOM = 5;

    /** Fatigue, soreness or wellness 2 points worse than usual, or 3 or more. */
    public static final int RECOVERY = 15;
    public static final int RECOVERY_SEVERE = 25;
    public static final double RECOVERY_SEVERE_DELTA = 3.0;

    /** Sleep 2 or more points below usual: adds to the score but can't change the status on its own. */
    public static final int SLEEP = 5;

    /** Latest session load above the usual mean: 15%, 30% or 50% and more. */
    public static final int LOAD = 15;
    public static final int LOAD_HIGH = 20;
    public static final int LOAD_VERY_HIGH = 25;
    public static final double LOAD_HIGH_PCT = 30.0;
    public static final double LOAD_VERY_HIGH_PCT = 50.0;

    /** Status bands: GREEN below YELLOW_FROM, RED from RED_FROM. */
    public static final int YELLOW_FROM = 15;
    public static final int RED_FROM = 70;

    private RiskRules() {
    }
}
