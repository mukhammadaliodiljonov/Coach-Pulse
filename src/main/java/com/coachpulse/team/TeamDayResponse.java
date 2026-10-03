package com.coachpulse.team;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** {@code GET /api/teams/{teamId}/athletes/today}, as described in docs/api-contract.md. */
public record TeamDayResponse(UUID teamId, LocalDate date, List<AthleteDay> athletes) {

    /**
     * One athlete's day. {@code baseline} and {@code assessment} are always null for now: the server-side
     * signal engine doesn't exist yet, and the web app evaluates check-ins itself while they're null.
     * {@code position} is null until athlete_profiles has the column.
     */
    public record AthleteDay(
            UUID athleteId,
            String firstName,
            String lastName,
            String position,
            LocalDate dateOfBirth,
            MorningCheckin morningCheckin,
            WorkoutCheckin latestWorkout,
            Object baseline,
            List<DailyLoad> loadHistory,
            Object assessment,
            AlertSummary alert) {
    }

    /** The table has no symptom or notes columns beyond these yet, so {@code symptoms} is always empty. */
    public record MorningCheckin(
            UUID id,
            OffsetDateTime createdAt,
            int sleepQuality,
            int fatigue,
            int muscleSoreness,
            int overallWellness,
            List<String> symptoms,
            String notes) {
    }

    /** {@code tiredness} and {@code muscleSoreness} are null until workout_checkins has the columns. */
    public record WorkoutCheckin(
            UUID id,
            OffsetDateTime createdAt,
            int rpe,
            int durationMinutes,
            Integer tiredness,
            Integer muscleSoreness,
            BigDecimal preWeightKg,
            BigDecimal postWeightKg,
            List<String> symptoms) {
    }

    public record DailyLoad(LocalDate date, long loadAu) {
    }

    /** {@code latestAction} is null until the coach_actions table exists. */
    public record AlertSummary(UUID id, String status, OffsetDateTime createdAt, Object latestAction) {
    }
}
