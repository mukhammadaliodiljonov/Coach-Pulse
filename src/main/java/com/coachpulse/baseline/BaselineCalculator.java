package com.coachpulse.baseline;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.ToIntFunction;

import com.coachpulse.baseline.Baseline.LoadBaseline;
import com.coachpulse.checkin.MorningCheckin;
import com.coachpulse.checkin.WorkoutCheckin;

/** The baseline calculations from docs/baseline-algorithm.md. Pure: everything comes in as arguments. */
public final class BaselineCalculator {

    private BaselineCalculator() {
    }

    /**
     * The wellness baseline from morning check-ins in the window (the {@link BaselineRules#WINDOW_DAYS} days
     * before {@code today}), one per day, or empty with fewer than {@link BaselineRules#MIN_MORNING_CHECKINS} days.
     * {@code trainingLoad} is filled in separately.
     */
    public static Optional<Baseline> wellness(List<MorningCheckin> checkins, LocalDate today, ZoneId zone) {
        LocalDate windowStart = today.minusDays(BaselineRules.WINDOW_DAYS);
        Map<LocalDate, MorningCheckin> latestPerDay = new HashMap<>();
        for (MorningCheckin checkin : checkins) {
            LocalDate day = checkin.createdAt().atZoneSameInstant(zone).toLocalDate();
            if (day.isBefore(windowStart) || !day.isBefore(today)) {
                continue;
            }
            latestPerDay.merge(day, checkin,
                    (a, b) -> a.createdAt().isAfter(b.createdAt()) ? a : b);
        }
        if (latestPerDay.size() < BaselineRules.MIN_MORNING_CHECKINS) {
            return Optional.empty();
        }
        List<MorningCheckin> days = List.copyOf(latestPerDay.values());
        return Optional.of(new Baseline(
                BaselineRules.WINDOW_DAYS,
                mean(days, MorningCheckin::sleepQuality),
                mean(days, MorningCheckin::fatigue),
                mean(days, MorningCheckin::muscleSoreness),
                mean(days, MorningCheckin::overallWellness),
                null));
    }

    /**
     * The load baseline from sessions in the window and today, leaving out {@code judgedSessionId} (the session
     * being compared), or empty with fewer than {@link BaselineRules#MIN_SESSIONS} sessions.
     */
    public static Optional<LoadBaseline> load(List<WorkoutCheckin> sessions, UUID judgedSessionId, LocalDate today,
            ZoneId zone) {
        LocalDate windowStart = today.minusDays(BaselineRules.WINDOW_DAYS);
        List<Long> loads = sessions.stream()
                .filter(s -> !s.id().equals(judgedSessionId))
                .filter(s -> {
                    LocalDate day = s.createdAt().atZoneSameInstant(zone).toLocalDate();
                    return !day.isBefore(windowStart) && !day.isAfter(today);
                })
                .map(BaselineCalculator::sessionLoad)
                .sorted()
                .toList();
        if (loads.size() < BaselineRules.MIN_SESSIONS) {
            return Optional.empty();
        }
        return Optional.of(new LoadBaseline(
                Math.round(meanOf(loads)),
                Math.round(percentile(loads, 0.25)),
                Math.round(percentile(loads, 0.75))));
    }

    /** Duration × RPE, in AU. */
    public static long sessionLoad(WorkoutCheckin session) {
        return (long) session.durationMinutes() * session.rpe();
    }

    /** Linear interpolation between the closest ranks (the common "type 7" percentile); {@code sorted} ascending. */
    static double percentile(List<Long> sorted, double p) {
        double rank = p * (sorted.size() - 1);
        int lower = (int) Math.floor(rank);
        int upper = (int) Math.ceil(rank);
        return sorted.get(lower) + (rank - lower) * (sorted.get(upper) - sorted.get(lower));
    }

    static double round1(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }

    private static double mean(List<MorningCheckin> days, ToIntFunction<MorningCheckin> score) {
        return round1(days.stream().mapToInt(score).average().orElseThrow());
    }

    private static double meanOf(List<Long> values) {
        return values.stream().mapToLong(Long::longValue).average().orElseThrow();
    }
}
