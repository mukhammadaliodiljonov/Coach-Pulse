package com.coachpulse.team;

import java.util.List;
import java.util.UUID;

public record TeamResponse(
        UUID id,
        String name,
        String sport,
        String ageGroup,
        String joinCode,
        List<Coach> coaches) {

    public record Coach(UUID userId, String firstName, String lastName, MemberRole memberRole) {
    }
}
