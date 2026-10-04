package com.coachpulse.baseline;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

import com.coachpulse.checkin.MorningCheckin;
import com.coachpulse.checkin.SymptomCode;
import com.coachpulse.checkin.WorkoutCheckin;

/** Check-ins for baseline tests. Times are UTC; TODAY is a fixed day. */
final class Checkins {

    static final LocalDate TODAY = LocalDate.of(2026, 10, 5);

    private Checkins() {
    }

    static OffsetDateTime at(LocalDate day, int hour) {
        return day.atTime(hour, 0).atOffset(ZoneOffset.UTC);
    }

    static MorningCheckin morning(LocalDate day, int sleep, int fatigue, int soreness, int wellness, SymptomCode... symptoms) {
        return morningAt(at(day, 8), sleep, fatigue, soreness, wellness, symptoms);
    }

    static MorningCheckin morningAt(OffsetDateTime time, int sleep, int fatigue, int soreness, int wellness,
            SymptomCode... symptoms) {
        return new MorningCheckin(UUID.randomUUID(), time, sleep, fatigue, soreness, wellness, List.of(symptoms), null);
    }

    /** The same scores on each of the {@code days} days before TODAY. */
    static List<MorningCheckin> usualMornings(int days, int sleep, int fatigue, int soreness, int wellness) {
        return IntStream.rangeClosed(1, days)
                .mapToObj(i -> morning(TODAY.minusDays(i), sleep, fatigue, soreness, wellness))
                .toList();
    }

    static WorkoutCheckin session(LocalDate day, int minutes, int rpe, SymptomCode... symptoms) {
        return new WorkoutCheckin(UUID.randomUUID(), at(day, 18), rpe, minutes, 3, 3, null, null, List.of(symptoms));
    }
}
