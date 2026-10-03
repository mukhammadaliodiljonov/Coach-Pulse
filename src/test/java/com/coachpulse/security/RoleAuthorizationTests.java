package com.coachpulse.security;

import java.util.UUID;

import com.coachpulse.exception.GlobalExceptionHandler;
import com.coachpulse.user.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RoleAuthorizationTests.TestController.class)
@Import({ RoleAuthorizationTests.TestController.class, JwtSecurityConfiguration.class, JwtTokenService.class,
		GlobalExceptionHandler.class })
@TestPropertySource(properties = "app.security.jwt.secret=test-secret-with-at-least-thirty-two-bytes")
class RoleAuthorizationTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtTokenService jwtTokenService;

	@Test
	void eachRoleCanReachItsOwnEndpoint() throws Exception {
		request("/api/test/athlete", UserRole.ATHLETE).andExpect(status().isOk());
		request("/api/test/coach", UserRole.COACH).andExpect(status().isOk());
		request("/api/test/admin", UserRole.ADMIN).andExpect(status().isOk());
	}

	@Test
	void otherRolesAreForbidden() throws Exception {
		request("/api/test/coach", UserRole.ATHLETE)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.status").value(403))
			.andExpect(jsonPath("$.detail").value("You do not have permission to perform this action"));
		request("/api/test/admin", UserRole.COACH).andExpect(status().isForbidden());
		request("/api/test/athlete", UserRole.ADMIN).andExpect(status().isForbidden());
	}

	@Test
	void anyOfSeveralRolesCanBeAllowed() throws Exception {
		request("/api/test/staff", UserRole.COACH).andExpect(status().isOk());
		request("/api/test/staff", UserRole.ADMIN).andExpect(status().isOk());
		request("/api/test/staff", UserRole.ATHLETE).andExpect(status().isForbidden());
	}

	@Test
	void clientSuppliedRoleHintsAreIgnored() throws Exception {
		String athleteToken = jwtTokenService.createToken(UUID.randomUUID().toString(), UserRole.ATHLETE);

		mockMvc.perform(get("/api/test/admin")
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + athleteToken)
				.header("X-User-Role", "ADMIN")
				.param("role", "ADMIN"))
			.andExpect(status().isForbidden());
	}

	@Test
	void unauthenticatedRequestsGet401NotForbidden() throws Exception {
		mockMvc.perform(get("/api/test/coach")).andExpect(status().isUnauthorized());
	}

	private ResultActions request(String path, UserRole role) throws Exception {
		String token = jwtTokenService.createToken(UUID.randomUUID().toString(), role);
		return mockMvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	@RestController
	static class TestController {

		@GetMapping("/api/test/athlete")
		@PreAuthorize("hasRole('ATHLETE')")
		String athlete() {
			return "athlete";
		}

		@GetMapping("/api/test/coach")
		@PreAuthorize("hasRole('COACH')")
		String coach() {
			return "coach";
		}

		@GetMapping("/api/test/admin")
		@PreAuthorize("hasRole('ADMIN')")
		String admin() {
			return "admin";
		}

		@GetMapping("/api/test/staff")
		@PreAuthorize("hasAnyRole('COACH', 'ADMIN')")
		String staff() {
			return "staff";
		}
	}
}
