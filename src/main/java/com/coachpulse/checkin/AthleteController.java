package com.coachpulse.checkin;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * An athlete's check-ins. Only the athlete submits them; the athlete and their team's coaches can read them
 * (see {@link AthleteAccess}).
 */
@RestController
@RequestMapping("/api/athletes/{athleteId}")
public class AthleteController {

    private final CheckinService checkins;

    public AthleteController(CheckinService checkins) {
        this.checkins = checkins;
    }

    @GetMapping("/today")
    public AthleteTodayResponse today(@PathVariable UUID athleteId, @AuthenticationPrincipal Jwt jwt) {
        return checkins.today(athleteId, userId(jwt));
    }

    @GetMapping("/checkins")
    public List<CheckinDay> history(
            @PathVariable UUID athleteId,
            @RequestParam(defaultValue = "7") int days,
            @AuthenticationPrincipal Jwt jwt) {
        return checkins.history(athleteId, userId(jwt), days);
    }

    @PostMapping("/morning-checkins")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ATHLETE')")
    public MorningCheckin submitMorning(
            @PathVariable UUID athleteId,
            @Valid @RequestBody MorningCheckinRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return checkins.submitMorning(athleteId, userId(jwt), request);
    }

    @PostMapping("/workout-checkins")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ATHLETE')")
    public WorkoutCheckin submitWorkout(
            @PathVariable UUID athleteId,
            @Valid @RequestBody WorkoutCheckinRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return checkins.submitWorkout(athleteId, userId(jwt), request);
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
