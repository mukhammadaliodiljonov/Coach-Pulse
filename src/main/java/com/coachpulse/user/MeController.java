package com.coachpulse.user;

import java.util.List;
import java.util.UUID;

import com.coachpulse.exception.AuthenticationFailedException;
import com.coachpulse.team.MemberRole;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeController {

    private final UserAccountRepository users;
    private final JdbcClient jdbc;

    public MeController(UserAccountRepository users, JdbcClient jdbc) {
        this.users = users;
        this.jdbc = jdbc;
    }

    @GetMapping("/api/me")
    @Transactional(readOnly = true)
    public MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        // A valid token for a deleted account: treat it like any other unusable sign-in.
        UserAccount user = users.findById(userId).orElseThrow(AuthenticationFailedException::new);

        UUID athleteId = jdbc.sql("SELECT id FROM athlete_profiles WHERE user_id = :userId")
                .param("userId", userId)
                .query(UUID.class)
                .optional()
                .orElse(null);

        List<MeResponse.Membership> teams = jdbc.sql("""
                        SELECT t.id, t.name, t.sport, tm.member_role
                        FROM team_members tm
                        JOIN teams t ON t.id = tm.team_id
                        WHERE tm.user_id = :userId
                        ORDER BY tm.joined_at
                        """)
                .param("userId", userId)
                .query((rs, row) -> new MeResponse.Membership(
                        rs.getObject("id", UUID.class),
                        rs.getString("name"),
                        rs.getString("sport"),
                        MemberRole.valueOf(rs.getString("member_role"))))
                .list();

        return new MeResponse(
                new MeResponse.User(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getRole()),
                athleteId,
                teams);
    }
}
