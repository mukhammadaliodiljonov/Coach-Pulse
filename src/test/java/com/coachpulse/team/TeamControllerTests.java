package com.coachpulse.team;

import java.util.List;
import java.util.UUID;

import com.coachpulse.exception.GlobalExceptionHandler;
import com.coachpulse.exception.ResourceNotFoundException;
import com.coachpulse.security.JwtSecurityConfiguration;
import com.coachpulse.security.JwtTokenService;
import com.coachpulse.user.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TeamController.class)
@Import({ JwtSecurityConfiguration.class, JwtTokenService.class, GlobalExceptionHandler.class })
@TestPropertySource(properties = "app.security.jwt.secret=test-secret-with-at-least-thirty-two-bytes")
class TeamControllerTests {

	private static final String TEAM_JSON = "{\"name\":\"Northside U17\",\"sport\":\"Football\",\"ageGroup\":\"U17\"}";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtTokenService jwtTokenService;

	@MockitoBean
	private TeamService teamService;

	@MockitoBean
	private TeamDashboardService dashboard;

	@Test
	void coachCreatesTeamAsThemselves() throws Exception {
		UUID userId = UUID.randomUUID();
		UUID teamId = UUID.randomUUID();
		when(teamService.create(any(), eq(userId))).thenReturn(new TeamResponse(teamId, "Northside U17", "Football", "U17",
				"ABC-DEFG", List.of(new TeamResponse.Coach(userId, "Sam", "Rivera", MemberRole.HEAD_COACH))));

		mockMvc.perform(post("/api/teams").header(HttpHeaders.AUTHORIZATION, bearer(userId, UserRole.COACH))
				.contentType(MediaType.APPLICATION_JSON).content(TEAM_JSON))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.joinCode").value("ABC-DEFG"))
			.andExpect(jsonPath("$.coaches[0].memberRole").value("HEAD_COACH"));
	}

	@Test
	void athletesCannotUseTeamEndpoints() throws Exception {
		String athlete = bearer(UUID.randomUUID(), UserRole.ATHLETE);

		mockMvc.perform(post("/api/teams").header(HttpHeaders.AUTHORIZATION, athlete)
				.contentType(MediaType.APPLICATION_JSON).content(TEAM_JSON))
			.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/teams/" + UUID.randomUUID() + "/athletes/today").header(HttpHeaders.AUTHORIZATION, athlete))
			.andExpect(status().isForbidden());
		verifyNoInteractions(teamService, dashboard);
	}

	@Test
	void athletesCanSeeTheirTeamDetails() throws Exception {
		UUID userId = UUID.randomUUID();
		UUID teamId = UUID.randomUUID();
		when(teamService.get(teamId, userId)).thenReturn(new TeamResponse(teamId, "Northside U17", "Football", "U17",
				"ABC-DEFG", List.of()));

		mockMvc.perform(get("/api/teams/" + teamId).header(HttpHeaders.AUTHORIZATION, bearer(userId, UserRole.ATHLETE)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Northside U17"));
	}

	@Test
	void invalidTeamIsRejected() throws Exception {
		mockMvc.perform(post("/api/teams").header(HttpHeaders.AUTHORIZATION, bearer(UUID.randomUUID(), UserRole.COACH))
				.contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\",\"sport\":\"\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.name").value("name is required"))
			.andExpect(jsonPath("$.errors.sport").value("sport is required"));
		verifyNoInteractions(teamService);
	}

	@Test
	void teamsOfOtherCoachesAreNotFound() throws Exception {
		UUID userId = UUID.randomUUID();
		UUID teamId = UUID.randomUUID();
		when(teamService.get(teamId, userId)).thenThrow(new ResourceNotFoundException("Team", teamId));

		mockMvc.perform(get("/api/teams/" + teamId).header(HttpHeaders.AUTHORIZATION, bearer(userId, UserRole.COACH)))
			.andExpect(status().isNotFound());
	}

	@Test
	void requiresAuthentication() throws Exception {
		mockMvc.perform(get("/api/teams/" + UUID.randomUUID())).andExpect(status().isUnauthorized());
	}

	private String bearer(UUID userId, UserRole role) {
		return "Bearer " + jwtTokenService.createToken(userId.toString(), role);
	}
}
