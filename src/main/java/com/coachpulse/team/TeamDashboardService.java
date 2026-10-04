package com.coachpulse.team;

import java.sql.ResultSet;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.coachpulse.baseline.BaselineService;
import com.coachpulse.risk.Assessment;
import com.coachpulse.risk.RiskService;
import com.coachpulse.checkin.CheckinRows;
import com.coachpulse.checkin.MorningCheckin;
import com.coachpulse.checkin.WorkoutCheckin;
import com.coachpulse.exception.BadRequestException;
import com.coachpulse.team.TeamDayResponse.AlertSummary;
import com.coachpulse.team.TeamDayResponse.AthleteDay;
import com.coachpulse.team.TeamDayResponse.DailyLoad;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * The coach dashboard's read endpoints. "Today" is the calendar day in the server's time zone until
 * teams store their own.
 */
@Service
@Transactional(readOnly = true)
public class TeamDashboardService {

    static final int LOAD_HISTORY_DAYS = 14;
    static final int MAX_LIMIT = 100;
    private static final Set<String> ALERT_STATUSES = Set.of("OPEN", "ACKNOWLEDGED", "RESOLVED");

    private final JdbcClient jdbc;
    private final TeamAccess teamAccess;
    private final BaselineService baselines;
    private final RiskService risk;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public TeamDashboardService(JdbcClient jdbc, TeamAccess teamAccess, BaselineService baselines, RiskService risk,
            ObjectMapper objectMapper, Clock clock) {
        this.jdbc = jdbc;
        this.teamAccess = teamAccess;
        this.baselines = baselines;
        this.risk = risk;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public TeamDayResponse athletesToday(UUID teamId, UUID userId) {
        teamAccess.requireCoach(teamId, userId);
        ZoneId zone = clock.getZone();
        LocalDate today = LocalDate.now(clock);
        OffsetDateTime dayStart = today.atStartOfDay(zone).toOffsetDateTime();
        OffsetDateTime dayEnd = today.plusDays(1).atStartOfDay(zone).toOffsetDateTime();
        LocalDate historyStart = today.minusDays(LOAD_HISTORY_DAYS - 1);

        record AthleteRow(UUID athleteId, String firstName, String lastName, LocalDate dateOfBirth) {
        }
        List<AthleteRow> athletes = jdbc.sql("""
                        SELECT ap.id, u.first_name, u.last_name, ap.date_of_birth
                        FROM team_members tm
                        JOIN users u ON u.id = tm.user_id
                        JOIN athlete_profiles ap ON ap.user_id = u.id
                        WHERE tm.team_id = :teamId AND tm.member_role = 'ATHLETE'
                        ORDER BY u.last_name, u.first_name
                        """)
                .param("teamId", teamId)
                .query((rs, row) -> new AthleteRow(
                        rs.getObject("id", UUID.class),
                        rs.getString("first_name"),
                        rs.getString("last_name"),
                        rs.getObject("date_of_birth", LocalDate.class)))
                .list();
        if (athletes.isEmpty()) {
            return new TeamDayResponse(teamId, today, List.of());
        }
        List<UUID> ids = athletes.stream().map(AthleteRow::athleteId).toList();

        Map<UUID, MorningCheckin> morning = new HashMap<>();
        jdbc.sql("SELECT " + CheckinRows.MORNING_COLUMNS + " FROM morning_checkins"
                        + " WHERE athlete_id IN (:ids) AND created_at >= :from AND created_at < :to ORDER BY created_at DESC")
                .param("ids", ids).param("from", dayStart).param("to", dayEnd)
                .query((ResultSet rs) -> {
                    morning.putIfAbsent(rs.getObject("athlete_id", UUID.class), CheckinRows.morning(rs));
                });

        Map<UUID, WorkoutCheckin> latestWorkout = new HashMap<>();
        jdbc.sql("SELECT DISTINCT ON (athlete_id) " + CheckinRows.WORKOUT_COLUMNS + " FROM workout_checkins"
                        + " WHERE athlete_id IN (:ids) ORDER BY athlete_id, created_at DESC")
                .param("ids", ids)
                .query((ResultSet rs) -> {
                    latestWorkout.put(rs.getObject("athlete_id", UUID.class), CheckinRows.workout(rs));
                });

        Map<UUID, Map<LocalDate, Long>> loads = new HashMap<>();
        jdbc.sql("""
                        SELECT athlete_id, created_at, duration_minutes, rpe
                        FROM workout_checkins
                        WHERE athlete_id IN (:ids) AND created_at >= :from AND created_at < :to
                        """)
                .param("ids", ids)
                .param("from", historyStart.atStartOfDay(zone).toOffsetDateTime())
                .param("to", dayEnd)
                .query((ResultSet rs) -> {
                    LocalDate date = rs.getObject("created_at", OffsetDateTime.class).atZoneSameInstant(zone).toLocalDate();
                    long load = (long) rs.getInt("duration_minutes") * rs.getInt("rpe");
                    loads.computeIfAbsent(rs.getObject("athlete_id", UUID.class), id -> new HashMap<>())
                            .merge(date, load, Long::sum);
                });

        Map<UUID, AlertSummary> alerts = new HashMap<>();
        jdbc.sql("""
                        SELECT id, athlete_id, status, created_at
                        FROM alerts
                        WHERE team_id = :teamId AND athlete_id IN (:ids) AND created_at >= :from AND created_at < :to
                        ORDER BY created_at DESC
                        """)
                .param("teamId", teamId).param("ids", ids).param("from", dayStart).param("to", dayEnd)
                .query((ResultSet rs) -> {
                    alerts.putIfAbsent(rs.getObject("athlete_id", UUID.class), new AlertSummary(
                            rs.getObject("id", UUID.class),
                            rs.getString("status"),
                            rs.getObject("created_at", OffsetDateTime.class),
                            null));
                });

        Map<UUID, BaselineService.Baselines> baselinesById = baselines.calculate(ids, latestWorkout);
        Map<UUID, Assessment> assessments = risk.today(ids, morning, latestWorkout, baselinesById);

        List<AthleteDay> days = athletes.stream()
                .map(a -> new AthleteDay(
                        a.athleteId(),
                        a.firstName(),
                        a.lastName(),
                        null,
                        a.dateOfBirth(),
                        morning.get(a.athleteId()),
                        latestWorkout.get(a.athleteId()),
                        baselinesById.get(a.athleteId()).baseline(),
                        loadHistory(loads.getOrDefault(a.athleteId(), Map.of()), historyStart),
                        assessments.get(a.athleteId()),
                        alerts.get(a.athleteId())))
                .toList();
        return new TeamDayResponse(teamId, today, days);
    }

    public List<AlertResponse> alerts(UUID teamId, UUID userId, String status, int limit) {
        teamAccess.requireCoach(teamId, userId);
        if (status != null && !ALERT_STATUSES.contains(status)) {
            throw new BadRequestException("status must be one of OPEN, ACKNOWLEDGED, RESOLVED");
        }
        return jdbc.sql("""
                        SELECT a.id, a.status, a.created_at, a.athlete_id,
                               u.first_name || ' ' || u.last_name AS athlete_name,
                               ra.risk_status, ra.reason_codes::text AS reasons
                        FROM alerts a
                        JOIN risk_assessments ra ON ra.id = a.risk_assessment_id
                        JOIN athlete_profiles ap ON ap.id = a.athlete_id
                        JOIN users u ON u.id = ap.user_id
                        WHERE a.team_id = :teamId AND (CAST(:status AS VARCHAR) IS NULL OR a.status = :status)
                        ORDER BY a.created_at DESC
                        LIMIT :limit
                        """)
                .param("teamId", teamId).param("status", status).param("limit", clamp(limit))
                .query((rs, row) -> new AlertResponse(
                        rs.getObject("id", UUID.class),
                        rs.getString("status"),
                        rs.getObject("created_at", OffsetDateTime.class),
                        null,
                        rs.getObject("athlete_id", UUID.class),
                        rs.getString("athlete_name"),
                        rs.getString("risk_status"),
                        reasons(rs.getString("reasons"))))
                .list();
    }

    /** The newest alerts and check-ins on the team, merged newest first. */
    public List<ActivityResponse> activity(UUID teamId, UUID userId, int limit) {
        teamAccess.requireCoach(teamId, userId);
        int max = clamp(limit);
        List<ActivityResponse> entries = new ArrayList<>();

        entries.addAll(jdbc.sql("""
                        SELECT a.id, a.created_at, a.athlete_id, u.first_name || ' ' || u.last_name AS athlete_name,
                               ra.risk_status, ra.reason_codes::text AS reasons
                        FROM alerts a
                        JOIN risk_assessments ra ON ra.id = a.risk_assessment_id
                        JOIN athlete_profiles ap ON ap.id = a.athlete_id
                        JOIN users u ON u.id = ap.user_id
                        WHERE a.team_id = :teamId
                        ORDER BY a.created_at DESC
                        LIMIT :limit
                        """)
                .param("teamId", teamId).param("limit", max)
                .query((rs, row) -> ActivityResponse.alertRaised(
                        rs.getObject("id", UUID.class),
                        rs.getObject("created_at", OffsetDateTime.class),
                        rs.getObject("athlete_id", UUID.class),
                        rs.getString("athlete_name"),
                        rs.getString("risk_status"),
                        reasons(rs.getString("reasons"))))
                .list());

        entries.addAll(jdbc.sql("""
                        SELECT mc.id, mc.created_at, mc.athlete_id, u.first_name || ' ' || u.last_name AS athlete_name
                        FROM morning_checkins mc
                        JOIN athlete_profiles ap ON ap.id = mc.athlete_id
                        JOIN users u ON u.id = ap.user_id
                        JOIN team_members tm ON tm.user_id = u.id AND tm.team_id = :teamId AND tm.member_role = 'ATHLETE'
                        ORDER BY mc.created_at DESC
                        LIMIT :limit
                        """)
                .param("teamId", teamId).param("limit", max)
                .query((rs, row) -> ActivityResponse.morningCheckin(
                        rs.getObject("id", UUID.class),
                        rs.getObject("created_at", OffsetDateTime.class),
                        rs.getObject("athlete_id", UUID.class),
                        rs.getString("athlete_name")))
                .list());

        entries.addAll(jdbc.sql("""
                        SELECT wc.id, wc.created_at, wc.athlete_id, u.first_name || ' ' || u.last_name AS athlete_name,
                               wc.duration_minutes, wc.rpe
                        FROM workout_checkins wc
                        JOIN athlete_profiles ap ON ap.id = wc.athlete_id
                        JOIN users u ON u.id = ap.user_id
                        JOIN team_members tm ON tm.user_id = u.id AND tm.team_id = :teamId AND tm.member_role = 'ATHLETE'
                        ORDER BY wc.created_at DESC
                        LIMIT :limit
                        """)
                .param("teamId", teamId).param("limit", max)
                .query((rs, row) -> ActivityResponse.workoutCheckin(
                        rs.getObject("id", UUID.class),
                        rs.getObject("created_at", OffsetDateTime.class),
                        rs.getObject("athlete_id", UUID.class),
                        rs.getString("athlete_name"),
                        rs.getInt("duration_minutes"),
                        rs.getInt("rpe")))
                .list());

        return entries.stream()
                .sorted(Comparator.comparing(ActivityResponse::createdAt).reversed())
                .limit(max)
                .toList();
    }

    /** Exactly LOAD_HISTORY_DAYS entries, oldest first, 0 on days without a session. */
    static List<DailyLoad> loadHistory(Map<LocalDate, Long> loads, LocalDate start) {
        Map<LocalDate, Long> byDay = new LinkedHashMap<>();
        for (int i = 0; i < LOAD_HISTORY_DAYS; i++) {
            byDay.put(start.plusDays(i), 0L);
        }
        loads.forEach((date, load) -> byDay.computeIfPresent(date, (d, zero) -> load));
        return byDay.entrySet().stream().map(e -> new DailyLoad(e.getKey(), e.getValue())).toList();
    }

    /** reason_codes defaults to '{}'; the contract wants a list, so anything but an array becomes []. */
    private JsonNode reasons(String json) {
        JsonNode node = json == null ? null : objectMapper.readTree(json);
        return node != null && node.isArray() ? node : objectMapper.createArrayNode();
    }

    private static int clamp(int limit) {
        return Math.max(1, Math.min(limit, MAX_LIMIT));
    }
}
