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

/**
 * Team endpoints. Creating a team and the dashboard are for coaches; a team's basic details are visible to
 * all its members. Each team's data is limited to its own members (see {@link TeamAccess}).
 */
@RestController
@RequestMapping("/api/teams")
public class TeamController {

    private static final String COACHES = "hasAnyRole('COACH', 'ADMIN')";

    private final TeamService teamService;
    private final TeamDashboardService dashboard;

    public TeamController(TeamService teamService, TeamDashboardService dashboard) {
        this.teamService = teamService;
        this.dashboard = dashboard;
    }

    @PostMapping
    @PreAuthorize(COACHES)
    @ResponseStatus(HttpStatus.CREATED)
    public TeamResponse create(@Valid @RequestBody CreateTeamRequest request, @AuthenticationPrincipal Jwt jwt) {
        return teamService.create(request, userId(jwt));
    }

    @GetMapping("/{teamId}")
    public TeamResponse get(@PathVariable UUID teamId, @AuthenticationPrincipal Jwt jwt) {
        return teamService.get(teamId, userId(jwt));
    }

    @GetMapping("/{teamId}/athletes/today")
    @PreAuthorize(COACHES)
    public TeamDayResponse athletesToday(@PathVariable UUID teamId, @AuthenticationPrincipal Jwt jwt) {
        return dashboard.athletesToday(teamId, userId(jwt));
    }

    @GetMapping("/{teamId}/alerts")
    @PreAuthorize(COACHES)
    public List<AlertResponse> alerts(
            @PathVariable UUID teamId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "20") int limit,
            @AuthenticationPrincipal Jwt jwt) {
        return dashboard.alerts(teamId, userId(jwt), status, limit);
    }

    @GetMapping("/{teamId}/activity")
    @PreAuthorize(COACHES)
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
