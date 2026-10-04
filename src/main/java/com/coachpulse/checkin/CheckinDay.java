package com.coachpulse.checkin;

import java.time.LocalDate;

/** One day of {@code GET /api/athletes/{athleteId}/checkins}: that day's latest check-in of each kind. */
public record CheckinDay(LocalDate date, MorningCheckin morning, WorkoutCheckin workout) {
}
