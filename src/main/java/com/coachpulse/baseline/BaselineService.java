package com.coachpulse.baseline;

import java.sql.ResultSet;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.coachpulse.baseline.Baseline.LoadBaseline;
import com.coachpulse.checkin.CheckinRows;
import com.coachpulse.checkin.MorningCheckin;
import com.coachpulse.checkin.WorkoutCheckin;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Personal baselines and today's assessment for a set of athletes, calculated live from their check-ins
 * (docs/baseline-algorithm.md). Nothing is stored, so results always reflect the latest check-ins.
 */
@Service
public class BaselineService {

    private final JdbcClient jdbc;
    private final Clock clock;

    public BaselineService(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /** {@code baseline} is null while forming; {@code assessment} is always set. */
    public record Result(Baseline baseline, Assessment assessment) {
    }

    /**
     * @param morningToday today's morning check-in per athlete (missing while pending)
     * @param latestWorkout each athlete's latest post-training check-in from any day (missing without one)
     */
    @Transactional(readOnly = true)
    public Map<UUID, Result> evaluate(List<UUID> athleteIds, Map<UUID, MorningCheckin> morningToday,
            Map<UUID, WorkoutCheckin> latestWorkout) {
        if (athleteIds.isEmpty()) {
            return Map.of();
        }
        ZoneId zone = clock.getZone();
        LocalDate today = LocalDate.now(clock);
        OffsetDateTime now = OffsetDateTime.now(clock);
        OffsetDateTime windowStart = today.minusDays(BaselineRules.WINDOW_DAYS).atStartOfDay(zone).toOffsetDateTime();
        OffsetDateTime tomorrow = today.plusDays(1).atStartOfDay(zone).toOffsetDateTime();

        Map<UUID, List<MorningCheckin>> mornings = new HashMap<>();
        jdbc.sql("SELECT " + CheckinRows.MORNING_COLUMNS + " FROM morning_checkins"
                        + " WHERE athlete_id IN (:ids) AND created_at >= :from AND created_at < :to")
                .param("ids", athleteIds).param("from", windowStart).param("to", tomorrow)
                .query((ResultSet rs) -> {
                    mornings.computeIfAbsent(rs.getObject("athlete_id", UUID.class), id -> new ArrayList<>())
                            .add(CheckinRows.morning(rs));
                });

        Map<UUID, List<WorkoutCheckin>> sessions = new HashMap<>();
        jdbc.sql("SELECT " + CheckinRows.WORKOUT_COLUMNS + " FROM workout_checkins"
                        + " WHERE athlete_id IN (:ids) AND created_at >= :from AND created_at < :to")
                .param("ids", athleteIds).param("from", windowStart).param("to", tomorrow)
                .query((ResultSet rs) -> {
                    sessions.computeIfAbsent(rs.getObject("athlete_id", UUID.class), id -> new ArrayList<>())
                            .add(CheckinRows.workout(rs));
                });

        Map<UUID, Result> results = new HashMap<>();
        for (UUID athleteId : athleteIds) {
            WorkoutCheckin latest = latestWorkout.get(athleteId);
            Baseline wellness = BaselineCalculator.wellness(mornings.getOrDefault(athleteId, List.of()), today, zone)
                    .orElse(null);
            LoadBaseline load = latest == null ? null : BaselineCalculator
                    .load(sessions.getOrDefault(athleteId, List.of()), latest.id(), today, zone)
                    .orElse(null);
            Baseline baseline = wellness == null ? null : new Baseline(wellness.windowDays(), wellness.sleepQuality(),
                    wellness.fatigue(), wellness.muscleSoreness(), wellness.overallWellness(), load);
            Assessment assessment = DeviationDetector.assess(
                    morningToday.get(athleteId), latest, baseline, load, today, zone, now);
            results.put(athleteId, new Result(baseline, assessment));
        }
        return results;
    }
}
