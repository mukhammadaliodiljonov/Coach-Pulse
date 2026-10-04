package com.coachpulse.team;

import java.util.Locale;

import com.coachpulse.exception.ResourceNotFoundException;
import com.coachpulse.user.RegistrationRequest;
import com.coachpulse.user.RegistrationResponse;
import com.coachpulse.user.RegistrationService;
import com.coachpulse.user.UserAccount;
import com.coachpulse.user.UserAccountRepository;
import com.coachpulse.user.UserRole;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Athletes join with their coach's team code. This is the only way to create an ATHLETE account: the code
 * proves the coach invited them, and the role is never taken from the request.
 */
@Service
public class TeamJoinService {

    private final TeamRepository teams;
    private final TeamMemberRepository members;
    private final RegistrationService registration;
    private final UserAccountRepository users;
    private final JdbcClient jdbc;

    public TeamJoinService(TeamRepository teams, TeamMemberRepository members, RegistrationService registration,
            UserAccountRepository users, JdbcClient jdbc) {
        this.teams = teams;
        this.members = members;
        this.registration = registration;
        this.users = users;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public TeamPreview preview(String joinCode) {
        Team team = findByCode(joinCode);
        TeamPreview.Coach headCoach = jdbc.sql("""
                        SELECT u.first_name, u.last_name
                        FROM team_members tm JOIN users u ON u.id = tm.user_id
                        WHERE tm.team_id = :teamId AND tm.member_role = 'HEAD_COACH'
                        ORDER BY tm.joined_at
                        LIMIT 1
                        """)
                .param("teamId", team.getId())
                .query((rs, row) -> new TeamPreview.Coach(rs.getString("first_name"), rs.getString("last_name")))
                .optional()
                .orElse(null);
        return new TeamPreview(team.getName(), team.getSport(), headCoach);
    }

    /** Creates the athlete's account, profile and team membership together. */
    @Transactional
    public RegistrationResponse join(JoinTeamRequest request) {
        Team team = findByCode(request.joinCode());
        UserAccount user = registration.createAccount(
                new RegistrationRequest(request.email(), request.password(), request.firstName(), request.lastName()),
                UserRole.ATHLETE);
        // The profile is inserted with SQL, so the account must be in the database first.
        users.flush();
        jdbc.sql("INSERT INTO athlete_profiles (user_id) VALUES (:userId)").param("userId", user.getId()).update();
        members.saveAndFlush(new TeamMember(team.getId(), user.getId(), MemberRole.ATHLETE));
        return RegistrationResponse.from(user);
    }

    private Team findByCode(String joinCode) {
        String code = joinCode == null ? "" : joinCode.trim().toUpperCase(Locale.ROOT);
        return teams.findByJoinCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("No team uses this code. Check it with your coach."));
    }
}
