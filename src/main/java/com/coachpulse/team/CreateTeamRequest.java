package com.coachpulse.team;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTeamRequest(
        @NotBlank(message = "name is required")
        @Size(max = 150, message = "name must be at most 150 characters")
        String name,

        @NotBlank(message = "sport is required")
        @Size(max = 100, message = "sport must be at most 100 characters")
        String sport,

        @Size(max = 20, message = "ageGroup must be at most 20 characters")
        String ageGroup,

        @Size(max = 30, message = "trainingFrequency must be at most 30 characters")
        String trainingFrequency) {
}
