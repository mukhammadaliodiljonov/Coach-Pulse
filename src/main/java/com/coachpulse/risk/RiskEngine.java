package com.coachpulse.risk;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import com.coachpulse.baseline.Baseline;
import com.coachpulse.baseline.Baseline.LoadBaseline;
import com.coachpulse.baseline.DeviationDetector;
import com.coachpulse.baseline.Reason;
import com.coachpulse.checkin.MorningCheckin;
import com.coachpulse.checkin.SymptomCode;
import com.coachpulse.checkin.WorkoutCheckin;

/**
 * The deterministic risk model (docs/risk-model.md): the deviation reasons become a 0–100 score, and the score a
 * traffic-light status. Pure, so every threshold can be tested without a database.
 */
public final class RiskEngine {

    private RiskEngine() {
    }

    /** An unsaved assessment of today's check-ins against the athlete's baselines. */
    public static Assessment assess(MorningCheckin morning, WorkoutCheckin latestWorkout, Baseline baseline,
            LoadBaseline load, LocalDate today, ZoneId zone, OffsetDateTime now) {
        List<Reason> reasons = DeviationDetector.reasons(morning, latestWorkout, baseline, load, today, zone);
        int score = score(reasons);
        return new Assessment(null, now, status(score), reasons, RiskRules.VERSION, score);
    }

    /**
     * Safety symptoms score 70 plus 5 per extra distinct symptom; every other reason adds its points. Without a
     * symptom the score stays below RED, so only a reported symptom makes an athlete high priority.
     */
    static int score(List<Reason> reasons) {
        Set<SymptomCode> symptoms = new LinkedHashSet<>();
        int other = 0;
        for (Reason reason : reasons) {
            switch (reason.kind()) {
                case "SAFETY_SYMPTOM" -> symptoms.addAll(reason.symptoms());
                case "RECOVERY" -> other += recoveryPoints(reason);
                case "TRAINING_LOAD" -> other += loadPoints(reason.changePct());
                default -> throw new IllegalArgumentException("Unknown reason kind " + reason.kind());
            }
        }
        if (symptoms.isEmpty()) {
            return Math.min(other, RiskRules.RED_FROM - 1);
        }
        int safety = RiskRules.SAFETY_SYMPTOM + RiskRules.EACH_EXTRA_SYMPTOM * (symptoms.size() - 1);
        return Math.min(safety + other, RiskRules.MAX_SCORE);
    }

    static String status(int score) {
        if (score >= RiskRules.RED_FROM) {
            return "RED";
        }
        return score >= RiskRules.YELLOW_FROM ? "YELLOW" : "GREEN";
    }

    private static int recoveryPoints(Reason reason) {
        if ("SLEEP".equals(reason.metric())) {
            return RiskRules.SLEEP;
        }
        boolean higherIsWorse = !"WELLNESS".equals(reason.metric());
        double worse = DeviationDetector.pointsWorse(reason.value(), reason.baseline(), higherIsWorse);
        return worse >= RiskRules.RECOVERY_SEVERE_DELTA ? RiskRules.RECOVERY_SEVERE : RiskRules.RECOVERY;
    }

    private static int loadPoints(double changePct) {
        if (changePct >= RiskRules.LOAD_VERY_HIGH_PCT) {
            return RiskRules.LOAD_VERY_HIGH;
        }
        return changePct >= RiskRules.LOAD_HIGH_PCT ? RiskRules.LOAD_HIGH : RiskRules.LOAD;
    }
}
