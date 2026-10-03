package com.coachpulse.team;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;
import tools.jackson.databind.JsonNode;

/**
 * One entry in {@code GET /api/teams/{teamId}/activity}. Fields that don't apply to the entry's
 * {@code type} are left out. COACH_ACTION entries come once the coach_actions table exists.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ActivityResponse(
        UUID id,
        String type,
        OffsetDateTime createdAt,
        UUID athleteId,
        String athleteName,
        String riskStatus,
        JsonNode reasons,
        Integer durationMinutes,
        Integer rpe) {

    static ActivityResponse alertRaised(UUID id, OffsetDateTime createdAt, UUID athleteId, String athleteName,
            String riskStatus, JsonNode reasons) {
        return new ActivityResponse(id, "ALERT_RAISED", createdAt, athleteId, athleteName, riskStatus, reasons, null, null);
    }

    static ActivityResponse morningCheckin(UUID id, OffsetDateTime createdAt, UUID athleteId, String athleteName) {
        return new ActivityResponse(id, "MORNING_CHECKIN", createdAt, athleteId, athleteName, null, null, null, null);
    }

    static ActivityResponse workoutCheckin(UUID id, OffsetDateTime createdAt, UUID athleteId, String athleteName,
            int durationMinutes, int rpe) {
        return new ActivityResponse(id, "WORKOUT_CHECKIN", createdAt, athleteId, athleteName, null, null, durationMinutes, rpe);
    }
}
