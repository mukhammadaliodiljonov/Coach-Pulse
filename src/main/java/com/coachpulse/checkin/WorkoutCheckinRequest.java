package com.coachpulse.checkin;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record WorkoutCheckinRequest(
        @NotNull(message = "rpe is required") @Min(value = 1, message = "rpe must be 1–10") @Max(value = 10, message = "rpe must be 1–10")
        Integer rpe,

        @NotNull(message = "durationMinutes is required") @Min(value = 1, message = "durationMinutes must be 1–600") @Max(value = 600, message = "durationMinutes must be 1–600")
        Integer durationMinutes,

        @NotNull(message = "tiredness is required") @Min(value = 1, message = "tiredness must be 1–5") @Max(value = 5, message = "tiredness must be 1–5")
        Integer tiredness,

        @NotNull(message = "muscleSoreness is required") @Min(value = 1, message = "muscleSoreness must be 1–5") @Max(value = 5, message = "muscleSoreness must be 1–5")
        Integer muscleSoreness,

        @DecimalMin(value = "1", message = "preWeightKg must be 1–999.99") @DecimalMax(value = "999.99", message = "preWeightKg must be 1–999.99")
        BigDecimal preWeightKg,

        @DecimalMin(value = "1", message = "postWeightKg must be 1–999.99") @DecimalMax(value = "999.99", message = "postWeightKg must be 1–999.99")
        BigDecimal postWeightKg,

        /* Required so a missing answer is never read as "no symptoms"; empty means "None of these". */
        @NotNull(message = "symptoms is required")
        List<@NotNull SymptomCode> symptoms) {
}
