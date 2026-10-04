package com.coachpulse.checkin;

import java.sql.ResultSet;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The athlete's own check-ins. "Today" is the calendar day in the server's time zone, as on the coach
 * dashboard. Check-ins are only stored here; the server-side signal engine and alerts come later, and
 * until then the coach app evaluates them itself.
 */
@Service
public class CheckinService {

    static final int MAX_HISTORY_DAYS = 60;

    private final JdbcClient jdbc;
    private final AthleteAccess athleteAccess;
    private final Clock clock;

    public CheckinService(JdbcClient jdbc, AthleteAccess athleteAccess, Clock clock) {
        this.jdbc = jdbc;
        this.athleteAccess = athleteAccess;
        this.clock = clock;
    }

    @Transactional
    public MorningCheckin submitMorning(UUID athleteId, UUID userId, MorningCheckinRequest request) {
        athleteAccess.requireSelf(athleteId, userId);
        Set<SymptomCode> symptoms = Set.copyOf(request.symptoms());
        return jdbc.sql("""
                        INSERT INTO morning_checkins (athlete_id, sleep_quality, fatigue, muscle_soreness, overall_wellness,
                            headache, dizziness, nausea, light_sensitivity, balance_problems, confusion)
                        VALUES (:athleteId, :sleepQuality, :fatigue, :muscleSoreness, :overallWellness,
                            :headache, :dizziness, :nausea, :lightSensitivity, :balanceProblems, :confusion)
                        """ + "RETURNING " + CheckinRows.MORNING_COLUMNS)
                .param("athleteId", athleteId)
                .param("sleepQuality", request.sleepQuality())
                .param("fatigue", request.fatigue())
                .param("muscleSoreness", request.muscleSoreness())
                .param("overallWellness", request.overallWellness())
                .params(symptomParams(symptoms))
                .query((rs, row) -> CheckinRows.morning(rs))
                .single();
    }

    @Transactional
    public WorkoutCheckin submitWorkout(UUID athleteId, UUID userId, WorkoutCheckinRequest request) {
        athleteAccess.requireSelf(athleteId, userId);
        Set<SymptomCode> symptoms = Set.copyOf(request.symptoms());
        return jdbc.sql("""
                        INSERT INTO workout_checkins (athlete_id, rpe, duration_minutes, tiredness, muscle_soreness,
                            pre_weight_kg, post_weight_kg,
                            headache, dizziness, nausea, light_sensitivity, balance_problems, confusion)
                        VALUES (:athleteId, :rpe, :durationMinutes, :tiredness, :muscleSoreness,
                            :preWeightKg, :postWeightKg,
                            :headache, :dizziness, :nausea, :lightSensitivity, :balanceProblems, :confusion)
                        """ + "RETURNING " + CheckinRows.WORKOUT_COLUMNS)
                .param("athleteId", athleteId)
                .param("rpe", request.rpe())
                .param("durationMinutes", request.durationMinutes())
                .param("tiredness", request.tiredness())
                .param("muscleSoreness", request.muscleSoreness())
                .param("preWeightKg", request.preWeightKg())
                .param("postWeightKg", request.postWeightKg())
                .params(symptomParams(symptoms))
                .query((rs, row) -> CheckinRows.workout(rs))
                .single();
    }

    @Transactional(readOnly = true)
    public AthleteTodayResponse today(UUID athleteId, UUID userId) {
        athleteAccess.requireSelfOrCoach(athleteId, userId);
        ZoneId zone = clock.getZone();
        LocalDate today = LocalDate.now(clock);
        LocalDate weekStart = today.minusDays(6);

        Set<LocalDate> morningDays = new HashSet<>();
        Set<LocalDate> workoutDays = new HashSet<>();
        jdbc.sql("""
                        SELECT 'MORNING' AS kind, created_at FROM morning_checkins
                        WHERE athlete_id = :athleteId AND created_at >= :from AND created_at < :to
                        UNION ALL
                        SELECT 'WORKOUT', created_at FROM workout_checkins
                        WHERE athlete_id = :athleteId AND created_at >= :from AND created_at < :to
                        """)
                .param("athleteId", athleteId)
                .param("from", startOf(weekStart, zone))
                .param("to", startOf(today.plusDays(1), zone))
                .query((ResultSet rs) -> {
                    LocalDate date = rs.getObject("created_at", OffsetDateTime.class).atZoneSameInstant(zone).toLocalDate();
                    ("MORNING".equals(rs.getString("kind")) ? morningDays : workoutDays).add(date);
                });

        List<Boolean> lastSevenDays = new ArrayList<>();
        for (LocalDate day = weekStart; !day.isAfter(today); day = day.plusDays(1)) {
            lastSevenDays.add(morningDays.contains(day) || workoutDays.contains(day));
        }

        // The head coach of the team whose open high-priority alert this is.
        AthleteTodayResponse.CoachFollowUp followUp = jdbc.sql("""
                        SELECT u.last_name
                        FROM alerts a
                        JOIN risk_assessments ra ON ra.id = a.risk_assessment_id
                        JOIN team_members tm ON tm.team_id = a.team_id AND tm.member_role = 'HEAD_COACH'
                        JOIN users u ON u.id = tm.user_id
                        WHERE a.athlete_id = :athleteId AND a.status = 'OPEN' AND ra.risk_status = 'RED'
                        ORDER BY a.created_at DESC
                        LIMIT 1
                        """)
                .param("athleteId", athleteId)
                .query((rs, row) -> new AthleteTodayResponse.CoachFollowUp("Coach " + rs.getString("last_name")))
                .optional()
                .orElse(null);

        return new AthleteTodayResponse(morningDays.contains(today), workoutDays.contains(today), lastSevenDays, followUp);
    }

    /** One entry per day for the last {@code days} days (including today), newest first. */
    @Transactional(readOnly = true)
    public List<CheckinDay> history(UUID athleteId, UUID userId, int days) {
        athleteAccess.requireSelfOrCoach(athleteId, userId);
        int count = Math.max(1, Math.min(days, MAX_HISTORY_DAYS));
        ZoneId zone = clock.getZone();
        LocalDate today = LocalDate.now(clock);
        OffsetDateTime from = startOf(today.minusDays(count - 1), zone);
        OffsetDateTime to = startOf(today.plusDays(1), zone);

        // Newest first, so the first one seen per day is that day's latest.
        Map<LocalDate, MorningCheckin> mornings = new HashMap<>();
        jdbc.sql("SELECT " + CheckinRows.MORNING_COLUMNS + " FROM morning_checkins"
                        + " WHERE athlete_id = :athleteId AND created_at >= :from AND created_at < :to ORDER BY created_at DESC")
                .param("athleteId", athleteId).param("from", from).param("to", to)
                .query((ResultSet rs) -> {
                    MorningCheckin checkin = CheckinRows.morning(rs);
                    mornings.putIfAbsent(checkin.createdAt().atZoneSameInstant(zone).toLocalDate(), checkin);
                });

        Map<LocalDate, WorkoutCheckin> workouts = new HashMap<>();
        jdbc.sql("SELECT " + CheckinRows.WORKOUT_COLUMNS + " FROM workout_checkins"
                        + " WHERE athlete_id = :athleteId AND created_at >= :from AND created_at < :to ORDER BY created_at DESC")
                .param("athleteId", athleteId).param("from", from).param("to", to)
                .query((ResultSet rs) -> {
                    WorkoutCheckin checkin = CheckinRows.workout(rs);
                    workouts.putIfAbsent(checkin.createdAt().atZoneSameInstant(zone).toLocalDate(), checkin);
                });

        List<CheckinDay> result = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            LocalDate day = today.minusDays(i);
            result.add(new CheckinDay(day, mornings.get(day), workouts.get(day)));
        }
        return result;
    }

    private static Map<String, Object> symptomParams(Set<SymptomCode> symptoms) {
        return Map.of(
                "headache", symptoms.contains(SymptomCode.HEADACHE),
                "dizziness", symptoms.contains(SymptomCode.DIZZINESS),
                "nausea", symptoms.contains(SymptomCode.NAUSEA),
                "lightSensitivity", symptoms.contains(SymptomCode.LIGHT_SENSITIVITY),
                "balanceProblems", symptoms.contains(SymptomCode.BALANCE_PROBLEMS),
                "confusion", symptoms.contains(SymptomCode.CONFUSION));
    }

    private static OffsetDateTime startOf(LocalDate date, ZoneId zone) {
        return date.atStartOfDay(zone).toOffsetDateTime();
    }
}
