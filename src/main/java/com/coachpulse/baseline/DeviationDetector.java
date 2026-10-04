package com.coachpulse.baseline;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import com.coachpulse.baseline.Baseline.LoadBaseline;
import com.coachpulse.checkin.MorningCheckin;
import com.coachpulse.checkin.WorkoutCheckin;

/**
 * Compares today's check-ins with the athlete's baseline and lists what deviates (docs/baseline-algorithm.md).
 * Pure, so the rules can be tested without a database. The risk engine turns these reasons into a score and a
 * status (docs/risk-model.md); the web app's signals.ts applies the same rules when there's no assessment.
 */
public final class DeviationDetector {

    private DeviationDetector() {
    }

    /**
     * @param morning today's morning check-in, or null while pending
     * @param latestWorkout the athlete's latest post-training check-in from any day, or null
     * @param baseline the wellness baseline, or null while forming
     * @param load the load baseline, or null while forming
     * @return safety symptoms first, then recovery (fatigue, wellness, soreness, sleep), then training load
     */
    public static List<Reason> reasons(MorningCheckin morning, WorkoutCheckin latestWorkout, Baseline baseline,
            LoadBaseline load, LocalDate today, ZoneId zone) {
        List<Reason> reasons = new ArrayList<>();

        // Safety symptoms need no baseline. Symptoms after yesterday's training still count this morning.
        if (morning != null && !morning.symptoms().isEmpty()) {
            reasons.add(Reason.safetySymptom(morning.symptoms(), "MORNING_CHECKIN"));
        }
        if (latestWorkout != null && !latestWorkout.symptoms().isEmpty()
                && !latestWorkout.createdAt().atZoneSameInstant(zone).toLocalDate().isBefore(today.minusDays(1))) {
            reasons.add(Reason.safetySymptom(latestWorkout.symptoms(), "WORKOUT_CHECKIN"));
        }

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
            // Poor sleep adds to the risk score but is never a signal on its own.
            if (worseBy(morning.sleepQuality(), baseline.sleepQuality(), false)) {
                reasons.add(Reason.recovery("SLEEP", morning.sleepQuality(), baseline.sleepQuality()));
            }
        }

        if (latestWorkout != null && load != null && load.meanAu() > 0) {
            long sessionLoad = BaselineCalculator.sessionLoad(latestWorkout);
            double changePct = BaselineCalculator.round1((sessionLoad - load.meanAu()) * 100.0 / load.meanAu());
            if (changePct >= BaselineRules.LOAD_INCREASE_PCT) {
                reasons.add(Reason.trainingLoad(sessionLoad, load.lowAu(), load.highAu(), changePct));
            }
        }

        return reasons;
    }

    /** Points in the worse direction: higher is worse for fatigue and soreness, lower for wellness and sleep. */
    public static double pointsWorse(int value, double baseline, boolean higherIsWorse) {
        return higherIsWorse ? value - baseline : baseline - value;
    }

    static boolean worseBy(int value, double baseline, boolean higherIsWorse) {
        return pointsWorse(value, baseline, higherIsWorse) >= BaselineRules.RECOVERY_DELTA;
    }
}
