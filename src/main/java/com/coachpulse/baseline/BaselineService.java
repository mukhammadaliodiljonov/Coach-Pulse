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
 * Personal baselines for a set of athletes, calculated live from their check-ins (docs/baseline-algorithm.md).
 * Nothing is stored, so they always reflect the latest check-ins.
 */
@Service
public class BaselineService {

    private final JdbcClient jdbc;
    private final Clock clock;

    public BaselineService(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /**
     * {@code baseline} is the wellness baseline (with the load baseline inside), null while forming; {@code load}
     * is the load baseline on its own, which the risk engine uses even while the wellness baseline forms.
     */
    public record Baselines(Baseline baseline, LoadBaseline load) {
    }

    /** @param latestWorkout each athlete's latest post-training check-in, the session the load baseline leaves out */
    @Transactional(readOnly = true)
    public Map<UUID, Baselines> calculate(List<UUID> athleteIds, Map<UUID, WorkoutCheckin> latestWorkout) {
        if (athleteIds.isEmpty()) {
            return Map.of();
        }
        ZoneId zone = clock.getZone();
        LocalDate today = LocalDate.now(clock);
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

        Map<UUID, Baselines> results = new HashMap<>();
        for (UUID athleteId : athleteIds) {
            WorkoutCheckin latest = latestWorkout.get(athleteId);
            Baseline wellness = BaselineCalculator.wellness(mornings.getOrDefault(athleteId, List.of()), today, zone)
                    .orElse(null);
            LoadBaseline load = latest == null ? null : BaselineCalculator
                    .load(sessions.getOrDefault(athleteId, List.of()), latest.id(), today, zone)
                    .orElse(null);
            Baseline baseline = wellness == null ? null : new Baseline(wellness.windowDays(), wellness.sleepQuality(),
                    wellness.fatigue(), wellness.muscleSoreness(), wellness.overallWellness(), load);
            results.put(athleteId, new Baselines(baseline, load));
        }
        return results;
    }
}
