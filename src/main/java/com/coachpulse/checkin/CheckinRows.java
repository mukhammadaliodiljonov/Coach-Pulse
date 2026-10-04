package com.coachpulse.checkin;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Column lists and row mapping shared by every query that reads check-ins. */
public final class CheckinRows {

    private static final String SYMPTOM_COLUMNS = "headache, dizziness, nausea, light_sensitivity, balance_problems, confusion";

    public static final String MORNING_COLUMNS = "id, athlete_id, created_at, sleep_quality, fatigue, muscle_soreness, "
            + "overall_wellness, notes, " + SYMPTOM_COLUMNS;

    public static final String WORKOUT_COLUMNS = "id, athlete_id, created_at, rpe, duration_minutes, tiredness, "
            + "muscle_soreness, pre_weight_kg, post_weight_kg, " + SYMPTOM_COLUMNS;

    private CheckinRows() {
    }

    public static MorningCheckin morning(ResultSet rs) throws SQLException {
        return new MorningCheckin(
                rs.getObject("id", UUID.class),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getInt("sleep_quality"),
                rs.getInt("fatigue"),
                rs.getInt("muscle_soreness"),
                rs.getInt("overall_wellness"),
                symptoms(rs),
                rs.getString("notes"));
    }

    public static WorkoutCheckin workout(ResultSet rs) throws SQLException {
        return new WorkoutCheckin(
                rs.getObject("id", UUID.class),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getInt("rpe"),
                rs.getInt("duration_minutes"),
                rs.getObject("tiredness", Integer.class),
                rs.getObject("muscle_soreness", Integer.class),
                rs.getBigDecimal("pre_weight_kg"),
                rs.getBigDecimal("post_weight_kg"),
                symptoms(rs));
    }

    private static List<SymptomCode> symptoms(ResultSet rs) throws SQLException {
        List<SymptomCode> symptoms = new ArrayList<>();
        for (SymptomCode symptom : SymptomCode.values()) {
            if (rs.getBoolean(symptom.column())) {
                symptoms.add(symptom);
            }
        }
        return symptoms;
    }
}
