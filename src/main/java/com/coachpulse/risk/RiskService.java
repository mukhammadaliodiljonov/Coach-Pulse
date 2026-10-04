package com.coachpulse.risk;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.coachpulse.baseline.BaselineService;
import com.coachpulse.baseline.BaselineService.Baselines;
import com.coachpulse.baseline.Reason;
import com.coachpulse.checkin.CheckinRows;
import com.coachpulse.checkin.MorningCheckin;
import com.coachpulse.checkin.WorkoutCheckin;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * The risk engine service: assesses an athlete's check-ins against their baselines (RiskEngine) and keeps the
 * results in risk_assessments, an append-only history. "Today" is the day in the server's time zone.
 */
@Service
public class RiskService {

    private static final TypeReference<List<Reason>> REASONS = new TypeReference<>() {
    };

    private final JdbcClient jdbc;
    private final BaselineService baselines;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public RiskService(JdbcClient jdbc, BaselineService baselines, ObjectMapper objectMapper, Clock clock) {
        this.jdbc = jdbc;
        this.baselines = baselines;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    /** Assesses the athlete as of now and stores the result. Runs after every check-in the athlete submits. */
    @Transactional
    public Assessment assessAndStore(UUID athleteId) {
        ZoneId zone = clock.getZone();
        LocalDate today = LocalDate.now(clock);
        OffsetDateTime now = OffsetDateTime.now(clock);

        MorningCheckin morning = jdbc.sql("SELECT " + CheckinRows.MORNING_COLUMNS + " FROM morning_checkins"
                        + " WHERE athlete_id = :athleteId AND created_at >= :from AND created_at < :to"
                        + " ORDER BY created_at DESC LIMIT 1")
                .param("athleteId", athleteId)
                .param("from", today.atStartOfDay(zone).toOffsetDateTime())
                .param("to", today.plusDays(1).atStartOfDay(zone).toOffsetDateTime())
                .query((rs, row) -> CheckinRows.morning(rs))
                .optional().orElse(null);
        WorkoutCheckin latest = jdbc.sql("SELECT " + CheckinRows.WORKOUT_COLUMNS + " FROM workout_checkins"
                        + " WHERE athlete_id = :athleteId ORDER BY created_at DESC LIMIT 1")
                .param("athleteId", athleteId)
                .query((rs, row) -> CheckinRows.workout(rs))
                .optional().orElse(null);

        Baselines b = baselines.calculate(List.of(athleteId), latest == null ? Map.of() : Map.of(athleteId, latest))
                .get(athleteId);
        Assessment assessment = RiskEngine.assess(morning, latest, b.baseline(), b.load(), today, zone, now);
        return store(athleteId, assessment);
    }

    /**
     * Today's assessment per athlete: the latest one stored today, or, for athletes who haven't checked in today,
     * one computed live from the data passed in (not stored, so its id is null).
     */
    @Transactional(readOnly = true)
    public Map<UUID, Assessment> today(List<UUID> athleteIds, Map<UUID, MorningCheckin> morningToday,
            Map<UUID, WorkoutCheckin> latestWorkout, Map<UUID, Baselines> baselinesById) {
        if (athleteIds.isEmpty()) {
            return Map.of();
        }
        ZoneId zone = clock.getZone();
        LocalDate today = LocalDate.now(clock);
        OffsetDateTime now = OffsetDateTime.now(clock);

        Map<UUID, Assessment> result = new HashMap<>();
        jdbc.sql("""
                        SELECT DISTINCT ON (athlete_id) id, athlete_id, created_at, risk_score, risk_status,
                               reason_codes::text AS reasons, engine_version
                        FROM risk_assessments
                        WHERE athlete_id IN (:ids) AND created_at >= :from AND created_at < :to
                        ORDER BY athlete_id, created_at DESC
                        """)
                .param("ids", athleteIds)
                .param("from", today.atStartOfDay(zone).toOffsetDateTime())
                .param("to", today.plusDays(1).atStartOfDay(zone).toOffsetDateTime())
                .query((ResultSet rs) -> {
                    result.put(rs.getObject("athlete_id", UUID.class), stored(rs));
                });

        for (UUID athleteId : athleteIds) {
            result.computeIfAbsent(athleteId, id -> {
                Baselines b = baselinesById.getOrDefault(id, new Baselines(null, null));
                return RiskEngine.assess(morningToday.get(id), latestWorkout.get(id), b.baseline(), b.load(), today,
                        zone, now);
            });
        }
        return result;
    }

    private Assessment store(UUID athleteId, Assessment assessment) {
        return jdbc.sql("""
                        INSERT INTO risk_assessments (athlete_id, risk_score, risk_status, reason_codes, engine_version, created_at)
                        VALUES (:athleteId, :score, :status, CAST(:reasons AS JSONB), :version, :createdAt)
                        RETURNING id, created_at
                        """)
                .param("athleteId", athleteId)
                .param("score", assessment.riskScore())
                .param("status", assessment.riskStatus())
                .param("reasons", objectMapper.writeValueAsString(assessment.reasons()))
                .param("version", assessment.engineVersion())
                .param("createdAt", assessment.createdAt())
                .query((rs, row) -> new Assessment(
                        rs.getObject("id", UUID.class),
                        rs.getObject("created_at", OffsetDateTime.class),
                        assessment.riskStatus(),
                        assessment.reasons(),
                        assessment.engineVersion(),
                        assessment.riskScore()))
                .single();
    }

    /** A stored row. Rows written before reasons were lists (the old '{}' default) have no reasons. */
    private Assessment stored(ResultSet rs) throws SQLException {
        JsonNode json = objectMapper.readTree(rs.getString("reasons"));
        List<Reason> reasons = json.isArray() ? objectMapper.convertValue(json, REASONS) : List.of();
        return new Assessment(
                rs.getObject("id", UUID.class),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getString("risk_status"),
                reasons,
                rs.getString("engine_version"),
                rs.getInt("risk_score"));
    }
}
