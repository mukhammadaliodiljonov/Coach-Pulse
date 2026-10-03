package com.coachpulse.user;

import java.util.Arrays;
import java.util.Optional;

/**
 * The CoachPulse application roles. Values must match the {@code ck_users_role} database
 * constraint and are carried in the JWT {@code role} claim.
 */
public enum UserRole {
    ATHLETE,
    COACH,
    ADMIN;

    public static final String AUTHORITY_PREFIX = "ROLE_";

    /** The Spring Security authority for this role, e.g. {@code ROLE_COACH}. */
    public String authority() {
        return AUTHORITY_PREFIX + name();
    }

    /** Parses an exact role name; anything else (including {@code null} or other casing) is empty. */
    public static Optional<UserRole> fromName(String name) {
        return Arrays.stream(values())
                .filter(role -> role.name().equals(name))
                .findFirst();
    }
}
