package com.coachpulse.team;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.coachpulse.exception.ConflictException;
import com.coachpulse.exception.GlobalExceptionHandler;
import com.coachpulse.exception.ResourceNotFoundException;
import com.coachpulse.security.JwtSecurityConfiguration;
import com.coachpulse.security.JwtTokenService;
import com.coachpulse.user.RegistrationResponse;
import com.coachpulse.user.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TeamJoinController.class)
@Import({ JwtSecurityConfiguration.class, JwtTokenService.class, GlobalExceptionHandler.class })
@TestPropertySource(properties = "app.security.jwt.secret=test-secret-with-at-least-thirty-two-bytes")
class TeamJoinControllerTests {

	private static final String JOIN = "{\"joinCode\":\"ABC-DEFG\",\"email\":\"emma@club.org\",\"password\":\"correct-horse\","
			+ "\"firstName\":\"Emma\",\"lastName\":\"Wilson\"}";

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private TeamJoinService joinService;

	@Test
	void previewIsPublic() throws Exception {
		when(joinService.preview("abc-defg"))
			.thenReturn(new TeamPreview("Northside U17", "Football", new TeamPreview.Coach("Sam", "Rivera")));

		mockMvc.perform(get("/api/auth/join/abc-defg"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Northside U17"))
			.andExpect(jsonPath("$.headCoach.lastName").value("Rivera"));
	}

	@Test
	void unknownCodeIsNotFound() throws Exception {
		when(joinService.preview("NOPE")).thenThrow(new ResourceNotFoundException("No team uses this code. Check it with your coach."));

		mockMvc.perform(get("/api/auth/join/NOPE"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.detail").value("No team uses this code. Check it with your coach."));
	}

	@Test
	void joiningCreatesAnAthleteWithoutSigningIn() throws Exception {
		when(joinService.join(any())).thenReturn(new RegistrationResponse(UUID.randomUUID(), "emma@club.org", "Emma",
				"Wilson", UserRole.ATHLETE, OffsetDateTime.now()));

		mockMvc.perform(post("/api/auth/join").contentType(MediaType.APPLICATION_JSON).content(JOIN))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.role").value("ATHLETE"));
	}

	@Test
	void roleCannotBeChosenAndInvalidAccountsAreRejected() throws Exception {
		mockMvc.perform(post("/api/auth/join").contentType(MediaType.APPLICATION_JSON)
				.content("{\"joinCode\":\"\",\"email\":\"bad\",\"password\":\"short\",\"firstName\":\"E\",\"lastName\":\"W\",\"role\":\"ADMIN\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.joinCode").value("joinCode is required"))
			.andExpect(jsonPath("$.errors.email").value("email must be valid"));
		verifyNoInteractions(joinService);
	}

	@Test
	void existingEmailConflicts() throws Exception {
		when(joinService.join(any())).thenThrow(new ConflictException("An account with this email already exists"));

		mockMvc.perform(post("/api/auth/join").contentType(MediaType.APPLICATION_JSON).content(JOIN))
			.andExpect(status().isConflict());
	}
}
