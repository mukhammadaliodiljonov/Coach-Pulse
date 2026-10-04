package com.coachpulse.checkin;

import java.time.OffsetDateTime;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AthleteController.class)
@Import({ JwtSecurityConfiguration.class, JwtTokenService.class, GlobalExceptionHandler.class })
@TestPropertySource(properties = "app.security.jwt.secret=test-secret-with-at-least-thirty-two-bytes")
class AthleteControllerTests {

	private static final String MORNING = "{\"sleepQuality\":2,\"fatigue\":4,\"muscleSoreness\":3,\"overallWellness\":2,"
			+ "\"symptoms\":[\"NAUSEA\",\"CONFUSION\"]}";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtTokenService jwtTokenService;

	@MockitoBean
	private CheckinService checkins;

	private final UUID athleteId = UUID.randomUUID();

	@Test
	void athleteSubmitsMorningCheckinWithSymptoms() throws Exception {
		UUID userId = UUID.randomUUID();
		when(checkins.submitMorning(eq(athleteId), eq(userId), any())).thenReturn(new MorningCheckin(UUID.randomUUID(),
				OffsetDateTime.now(), 2, 4, 3, 2, List.of(SymptomCode.NAUSEA, SymptomCode.CONFUSION), null));

		mockMvc.perform(post("/api/athletes/" + athleteId + "/morning-checkins")
				.header(HttpHeaders.AUTHORIZATION, bearer(userId, UserRole.ATHLETE))
				.contentType(MediaType.APPLICATION_JSON).content(MORNING))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.symptoms[0]").value("NAUSEA"));
		verify(checkins).submitMorning(athleteId, userId,
				new MorningCheckinRequest(2, 4, 3, 2, List.of(SymptomCode.NAUSEA, SymptomCode.CONFUSION)));
	}

	@Test
	void coachesCannotSubmitCheckins() throws Exception {
		mockMvc.perform(post("/api/athletes/" + athleteId + "/morning-checkins")
				.header(HttpHeaders.AUTHORIZATION, bearer(UUID.randomUUID(), UserRole.COACH))
				.contentType(MediaType.APPLICATION_JSON).content(MORNING))
			.andExpect(status().isForbidden());
		verifyNoInteractions(checkins);
	}

	@Test
	void missingSymptomsAreRejectedNotTreatedAsNone() throws Exception {
		mockMvc.perform(post("/api/athletes/" + athleteId + "/morning-checkins")
				.header(HttpHeaders.AUTHORIZATION, bearer(UUID.randomUUID(), UserRole.ATHLETE))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"sleepQuality\":6,\"fatigue\":4,\"muscleSoreness\":3,\"overallWellness\":2}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.symptoms").value("symptoms is required"))
			.andExpect(jsonPath("$.errors.sleepQuality").value("sleepQuality must be 1–5"));
		verifyNoInteractions(checkins);
	}

	@Test
	void workoutScoresAreValidated() throws Exception {
		mockMvc.perform(post("/api/athletes/" + athleteId + "/workout-checkins")
				.header(HttpHeaders.AUTHORIZATION, bearer(UUID.randomUUID(), UserRole.ATHLETE))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"rpe\":11,\"durationMinutes\":60,\"tiredness\":4,\"muscleSoreness\":3,\"symptoms\":[]}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.rpe").value("rpe must be 1–10"));
	}

	@Test
	void someoneElsesAthleteIsNotFound() throws Exception {
		UUID userId = UUID.randomUUID();
		when(checkins.today(athleteId, userId)).thenThrow(new ResourceNotFoundException("Athlete", athleteId));

		mockMvc.perform(get("/api/athletes/" + athleteId + "/today").header(HttpHeaders.AUTHORIZATION, bearer(userId, UserRole.ATHLETE)))
			.andExpect(status().isNotFound());
	}

	@Test
	void requiresAuthentication() throws Exception {
		mockMvc.perform(get("/api/athletes/" + athleteId + "/checkins")).andExpect(status().isUnauthorized());
	}

	private String bearer(UUID userId, UserRole role) {
		return "Bearer " + jwtTokenService.createToken(userId.toString(), role);
	}
}
