package com.coachpulse.user;

import java.util.List;
import java.util.UUID;

import com.coachpulse.team.MemberRole;

/** {@code GET /api/me}: who is signed in and their teams. */
public record MeResponse(User user, UUID athleteId, List<Membership> teams) {

    public record User(UUID id, String email, String firstName, String lastName, UserRole role) {
    }

    public record Membership(UUID teamId, String name, String sport, MemberRole memberRole) {
    }
}
