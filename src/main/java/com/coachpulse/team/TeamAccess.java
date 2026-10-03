package com.coachpulse.team;

import java.util.UUID;

import com.coachpulse.exception.ResourceNotFoundException;
import org.springframework.stereotype.Component;

/**
 * Team data is visible only to the team's coaches. Anyone else gets the same 404 as for a team
 * that doesn't exist, so team ids can't be probed.
 */
@Component
public class TeamAccess {

    private final TeamMemberRepository members;

    public TeamAccess(TeamMemberRepository members) {
        this.members = members;
    }

    public void requireCoach(UUID teamId, UUID userId) {
        boolean coach = members.findByTeamIdAndUserId(teamId, userId)
                .map(member -> member.getMemberRole().isCoach())
                .orElse(false);
        if (!coach) {
            throw new ResourceNotFoundException("Team", teamId);
        }
    }
}
