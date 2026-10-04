package com.coachpulse.baseline;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import com.coachpulse.baseline.Baseline.LoadBaseline;
import com.coachpulse.checkin.MorningCheckin;
import com.coachpulse.checkin.WorkoutCheckin;

/**
 * Compares today's check-ins with the athlete's baseline (docs/baseline-algorithm.md). Pure, so the rules
 * can be tested without a database; the same rules run in the web app's signals.ts when there's no assessment.
 */
public final class DeviationDetector {

    private DeviationDetector() {
    }

    /**
     * @param morning today's morning check-in, or null while pending
     * @param latestWorkout the athlete's latest post-training check-in from any day, or null
     * @param baseline the wellness baseline, or null while forming
     * @param load the load baseline, or null while forming
     */
    public static Assessment assess(MorningCheckin morning, WorkoutCheckin latestWorkout, Baseline baseline,
            LoadBaseline load, LocalDate today, ZoneId zone, OffsetDateTime now) {
        List<Reason> reasons = new ArrayList<>();

        // Safety symptoms need no baseline. Symptoms after yesterday's training still count this morning.
        if (morning != null && !morning.symptoms().isEmpty()) {
            reasons.add(Reason.safetySymptom(morning.symptoms(), "MORNING_CHECKIN"));
        }
        if (latestWorkout != null && !latestWorkout.symptoms().isEmpty()
                && !latestWorkout.createdAt().atZoneSameInstant(zone).toLocalDate().isBefore(today.minusDays(1))) {
            reasons.add(Reason.safetySymptom(latestWorkout.symptoms(), "WORKOUT_CHECKIN"));
        }
        boolean safety = !reasons.isEmpty();

        if (morning != null && baseline != null) {
            if (worseBy(morning.fatigue(), baseline.fatigue(), true)) {
                reasons.add(Reason.recovery("FATIGUE", morning.fatigue(), baseline.fatigue()));
            }
            if (worseBy(morning.overallWellness(), baseline.overallWellness(), false)) {
                reasons.add(Reason.recovery("WELLNESS", morning.overallWellness(), baseline.overallWellness()));
            }
            if (worseBy(morning.muscleSoreness(), baseline.muscleSoreness(), true)) {
                reasons.add(Reason.recovery("SORENESS", morning.muscleSoreness(), baseline.muscleSoreness()));
            }
        }

        if (latestWorkout != null && load != null && load.meanAu() > 0) {
            long sessionLoad = BaselineCalculator.sessionLoad(latestWorkout);
            double changePct = BaselineCalculator.round1((sessionLoad - load.meanAu()) * 100.0 / load.meanAu());
            if (changePct >= BaselineRules.LOAD_INCREASE_PCT) {
                reasons.add(Reason.trainingLoad(sessionLoad, load.lowAu(), load.highAu(), changePct));
            }
        }

        String riskStatus = safety ? "RED" : reasons.isEmpty() ? "GREEN" : "YELLOW";
        return new Assessment(null, now, riskStatus, reasons, BaselineRules.VERSION);
    }

    /** Higher is worse for fatigue and soreness; lower is worse for wellness. */
    static boolean worseBy(int value, double baseline, boolean higherIsWorse) {
        double worse = higherIsWorse ? value - baseline : baseline - value;
        return worse >= BaselineRules.RECOVERY_DELTA;
    }
}
