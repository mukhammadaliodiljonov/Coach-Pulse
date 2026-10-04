package com.coachpulse.security;

import java.util.UUID;

import com.coachpulse.user.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CorsTests.TestController.class)
@Import({ CorsTests.TestController.class, JwtSecurityConfiguration.class, JwtTokenService.class })
@TestPropertySource(properties = {
		"app.security.jwt.secret=test-secret-with-at-least-thirty-two-bytes",
		"app.cors.allowed-origins=https://app.example.com, https://staging.example.com" })
class CorsTests {

	private static final String APP = "https://app.example.com";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtTokenService jwtTokenService;

	@Test
	void preflightFromAnAllowedOriginSucceedsWithoutAToken() throws Exception {
		mockMvc.perform(options("/api/test/me")
				.header(HttpHeaders.ORIGIN, APP)
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization"))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, APP))
			.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, containsStringIgnoringCase("authorization")))
			.andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS));
	}

	@Test
	void everyListedOriginIsAllowed() throws Exception {
		mockMvc.perform(options("/api/test/me")
				.header(HttpHeaders.ORIGIN, "https://staging.example.com")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://staging.example.com"));
	}

	@Test
	void otherOriginsAreRejected() throws Exception {
		mockMvc.perform(options("/api/test/me")
				.header(HttpHeaders.ORIGIN, "https://evil.example.org")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
			.andExpect(status().isForbidden())
			.andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
	}

	@Test
	void authenticatedCrossOriginRequestsGetTheCorsHeader() throws Exception {
		String token = jwtTokenService.createToken(UUID.randomUUID().toString(), UserRole.COACH);

		mockMvc.perform(get("/api/test/me").header(HttpHeaders.ORIGIN, APP).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, APP));
	}

	@Test
	void corsDoesNotBypassAuthentication() throws Exception {
		mockMvc.perform(get("/api/test/me").header(HttpHeaders.ORIGIN, APP)).andExpect(status().isUnauthorized());
	}

	@RestController
	static class TestController {

		@GetMapping("/api/test/me")
		String me() {
			return "ok";
		}
	}
}
