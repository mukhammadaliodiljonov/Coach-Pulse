package com.coachpulse.risk;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.coachpulse.baseline.Reason;
import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * The risk engine's verdict (docs/risk-model.md). {@code id} is null for an assessment computed live rather than
 * read from risk_assessments. The score is stored but never sent to clients: the app shows only the status and
 * the reasons.
 */
public record Assessment(
        UUID id,
        OffsetDateTime createdAt,
        String riskStatus,
        List<Reason> reasons,
        String engineVersion,
        @JsonIgnore int riskScore) {
}
