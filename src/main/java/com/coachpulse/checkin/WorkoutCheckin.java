package com.coachpulse.checkin;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** {@code tiredness} and {@code muscleSoreness} are null on check-ins saved before those questions existed. */
public record WorkoutCheckin(
        UUID id,
        OffsetDateTime createdAt,
        int rpe,
        int durationMinutes,
        Integer tiredness,
        Integer muscleSoreness,
        BigDecimal preWeightKg,
        BigDecimal postWeightKg,
        List<SymptomCode> symptoms) {
}
