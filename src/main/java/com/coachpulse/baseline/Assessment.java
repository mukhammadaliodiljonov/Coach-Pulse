package com.coachpulse.baseline;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * The rules' verdict for today, computed live. {@code id} is null because it isn't stored; storing
 * assessments and raising alerts belongs to the signal engine.
 */
public record Assessment(UUID id, OffsetDateTime createdAt, String riskStatus, List<Reason> reasons, String engineVersion) {
}
