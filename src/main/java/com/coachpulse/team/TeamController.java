package com.coachpulse.team;

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

/** Team endpoints for coaches; each team's data is limited to its own coaches (see {@link TeamAccess}). */
@RestController
@RequestMapping("/api/teams")
@PreAuthorize("hasAnyRole('COACH', 'ADMIN')")
public class TeamController {

    private final TeamService teamService;
    private final TeamDashboardService dashboard;

    public TeamController(TeamService teamService, TeamDashboardService dashboard) {
        this.teamService = teamService;
        this.dashboard = dashboard;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TeamResponse create(@Valid @RequestBody CreateTeamRequest request, @AuthenticationPrincipal Jwt jwt) {
        return teamService.create(request, userId(jwt));
    }

    @GetMapping("/{teamId}")
    public TeamResponse get(@PathVariable UUID teamId, @AuthenticationPrincipal Jwt jwt) {
        return teamService.get(teamId, userId(jwt));
    }

    @GetMapping("/{teamId}/athletes/today")
    public TeamDayResponse athletesToday(@PathVariable UUID teamId, @AuthenticationPrincipal Jwt jwt) {
        return dashboard.athletesToday(teamId, userId(jwt));
    }

    @GetMapping("/{teamId}/alerts")
    public List<AlertResponse> alerts(
            @PathVariable UUID teamId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "20") int limit,
            @AuthenticationPrincipal Jwt jwt) {
        return dashboard.alerts(teamId, userId(jwt), status, limit);
    }

    @GetMapping("/{teamId}/activity")
    public List<ActivityResponse> activity(
            @PathVariable UUID teamId,
            @RequestParam(defaultValue = "50") int limit,
            @AuthenticationPrincipal Jwt jwt) {
        return dashboard.activity(teamId, userId(jwt), limit);
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
