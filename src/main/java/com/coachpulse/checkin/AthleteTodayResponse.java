package com.coachpulse.checkin;

import java.util.List;

/**
 * {@code GET /api/athletes/{athleteId}/today}. {@code coachFollowUp} is set while the athlete has an open
 * high-priority alert; it names the coach and never includes the reason.
 */
public record AthleteTodayResponse(
        boolean morningDone,
        boolean workoutDone,
        List<Boolean> lastSevenDays,
        CoachFollowUp coachFollowUp) {

    public record CoachFollowUp(String coachName) {
    }
}
