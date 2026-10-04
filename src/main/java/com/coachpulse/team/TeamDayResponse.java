package com.coachpulse.team;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.coachpulse.baseline.Assessment;
import com.coachpulse.baseline.Baseline;
import com.coachpulse.checkin.MorningCheckin;
import com.coachpulse.checkin.WorkoutCheckin;

/** {@code GET /api/teams/{teamId}/athletes/today}, as described in docs/api-contract.md. */
public record TeamDayResponse(UUID teamId, LocalDate date, List<AthleteDay> athletes) {

    /**
     * One athlete's day. {@code baseline} is null while it's forming; {@code assessment} is today's verdict
     * from the baseline rules (docs/baseline-algorithm.md), computed live. {@code position} is null until
     * athlete_profiles has the column.
     */
    public record AthleteDay(
            UUID athleteId,
            String firstName,
            String lastName,
            String position,
            LocalDate dateOfBirth,
            MorningCheckin morningCheckin,
            WorkoutCheckin latestWorkout,
            Baseline baseline,
            List<DailyLoad> loadHistory,
            Assessment assessment,
            AlertSummary alert) {
    }

    public record DailyLoad(LocalDate date, long loadAu) {
    }

    /** {@code latestAction} is null until the coach_actions table exists. */
    public record AlertSummary(UUID id, String status, OffsetDateTime createdAt, Object latestAction) {
    }
}
