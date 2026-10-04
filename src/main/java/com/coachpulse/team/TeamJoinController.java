package com.coachpulse.team;

import jakarta.validation.Valid;
import com.coachpulse.user.RegistrationResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Public: an athlete without an account looks up a team code, then joins with a new account. */
@RestController
@RequestMapping("/api/auth/join")
public class TeamJoinController {

    private final TeamJoinService joinService;

    public TeamJoinController(TeamJoinService joinService) {
        this.joinService = joinService;
    }

    @GetMapping("/{joinCode}")
    public TeamPreview preview(@PathVariable String joinCode) {
        return joinService.preview(joinCode);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RegistrationResponse join(@Valid @RequestBody JoinTeamRequest request) {
        return joinService.join(request);
    }
}
