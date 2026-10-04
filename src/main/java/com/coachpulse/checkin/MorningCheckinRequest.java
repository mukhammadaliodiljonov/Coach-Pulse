package com.coachpulse.checkin;

import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record MorningCheckinRequest(
        @NotNull(message = "sleepQuality is required") @Min(value = 1, message = "sleepQuality must be 1–5") @Max(value = 5, message = "sleepQuality must be 1–5")
        Integer sleepQuality,

        @NotNull(message = "fatigue is required") @Min(value = 1, message = "fatigue must be 1–5") @Max(value = 5, message = "fatigue must be 1–5")
        Integer fatigue,

        @NotNull(message = "muscleSoreness is required") @Min(value = 1, message = "muscleSoreness must be 1–5") @Max(value = 5, message = "muscleSoreness must be 1–5")
        Integer muscleSoreness,

        @NotNull(message = "overallWellness is required") @Min(value = 1, message = "overallWellness must be 1–5") @Max(value = 5, message = "overallWellness must be 1–5")
        Integer overallWellness,

        /* Required so a missing answer is never read as "no symptoms"; empty means "None of these". */
        @NotNull(message = "symptoms is required")
        List<@NotNull SymptomCode> symptoms) {
}
