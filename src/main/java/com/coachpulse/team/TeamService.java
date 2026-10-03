package com.coachpulse.team;

import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;

import com.coachpulse.exception.ResourceNotFoundException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TeamService {

    // No 0/O or 1/I so codes read out loud or copied by hand stay unambiguous.
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_ATTEMPTS = 10;

    private final TeamRepository teams;
    private final TeamMemberRepository members;
    private final TeamAccess teamAccess;
    private final JdbcClient jdbc;
    private final SecureRandom random = new SecureRandom();

    public TeamService(TeamRepository teams, TeamMemberRepository members, TeamAccess teamAccess, JdbcClient jdbc) {
        this.teams = teams;
        this.members = members;
        this.teamAccess = teamAccess;
        this.jdbc = jdbc;
    }

    /** Creates a team with the caller as its head coach. */
    @Transactional
    public TeamResponse create(CreateTeamRequest request, UUID userId) {
        Team team = teams.save(new Team(
                request.name().trim(),
                request.sport().trim(),
                blankToNull(request.ageGroup()),
                blankToNull(request.trainingFrequency()),
                newJoinCode(),
                userId));
        members.save(new TeamMember(team.getId(), userId, MemberRole.HEAD_COACH));
        members.flush();
        return toResponse(team);
    }

    @Transactional(readOnly = true)
    public TeamResponse get(UUID teamId, UUID userId) {
        teamAccess.requireCoach(teamId, userId);
        Team team = teams.findById(teamId).orElseThrow(() -> new ResourceNotFoundException("Team", teamId));
        return toResponse(team);
    }

    private TeamResponse toResponse(Team team) {
        List<TeamResponse.Coach> coaches = jdbc.sql("""
                        SELECT u.id, u.first_name, u.last_name, tm.member_role
                        FROM team_members tm
                        JOIN users u ON u.id = tm.user_id
                        WHERE tm.team_id = :teamId AND tm.member_role IN ('HEAD_COACH', 'ASSISTANT_COACH')
                        ORDER BY tm.member_role DESC, tm.joined_at
                        """)
                .param("teamId", team.getId())
                .query((rs, row) -> new TeamResponse.Coach(
                        rs.getObject("id", UUID.class),
                        rs.getString("first_name"),
                        rs.getString("last_name"),
                        MemberRole.valueOf(rs.getString("member_role"))))
                .list();
        return new TeamResponse(team.getId(), team.getName(), team.getSport(), team.getAgeGroup(), team.getJoinCode(), coaches);
    }

    private String newJoinCode() {
        for (int attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
            String code = randomCode(3) + "-" + randomCode(4);
            if (!teams.existsByJoinCode(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Could not generate a unique team join code");
    }

    private String randomCode(int length) {
        StringBuilder code = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            code.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
        }
        return code.toString();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
