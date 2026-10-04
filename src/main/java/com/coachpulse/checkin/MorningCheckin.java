package com.coachpulse.checkin;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record MorningCheckin(
        UUID id,
        OffsetDateTime createdAt,
        int sleepQuality,
        int fatigue,
        int muscleSoreness,
        int overallWellness,
        List<SymptomCode> symptoms,
        String notes) {
}
