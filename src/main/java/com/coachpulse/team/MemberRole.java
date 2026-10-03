package com.coachpulse.team;

/** A user's role within one team; values match {@code ck_team_members_member_role}. */
public enum MemberRole {
    HEAD_COACH,
    ASSISTANT_COACH,
    ATHLETE;

    public boolean isCoach() {
        return this != ATHLETE;
    }
}
