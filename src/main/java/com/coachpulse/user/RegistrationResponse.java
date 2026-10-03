package com.coachpulse.user;

import java.time.OffsetDateTime;
import java.util.UUID;

public record RegistrationResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        UserRole role,
        OffsetDateTime createdAt) {

    static RegistrationResponse from(UserAccount user) {
        return new RegistrationResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole(),
                user.getCreatedAt());
    }
}
