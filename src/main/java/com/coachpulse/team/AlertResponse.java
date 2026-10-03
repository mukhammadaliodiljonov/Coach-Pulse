package com.coachpulse.team;

import java.time.OffsetDateTime;
import java.util.UUID;

import tools.jackson.databind.JsonNode;

/** {@code GET /api/teams/{teamId}/alerts}. {@code latestAction} is null until coach_actions exists. */
public record AlertResponse(
        UUID id,
        String status,
        OffsetDateTime createdAt,
        Object latestAction,
        UUID athleteId,
        String athleteName,
        String riskStatus,
        JsonNode reasons) {
}
