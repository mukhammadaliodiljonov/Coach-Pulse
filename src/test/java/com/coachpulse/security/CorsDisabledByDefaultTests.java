package com.coachpulse.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

/** Without CORS_ALLOWED_ORIGINS, no other origin may call the API. */
@WebMvcTest(CorsTests.TestController.class)
@Import({ CorsTests.TestController.class, JwtSecurityConfiguration.class, JwtTokenService.class })
@TestPropertySource(properties = "app.security.jwt.secret=test-secret-with-at-least-thirty-two-bytes")
class CorsDisabledByDefaultTests {

	@Autowired
	private MockMvc mockMvc;

	// The preflight itself may answer 200, but without Access-Control-Allow-Origin the browser blocks the call.
	@Test
	void crossOriginRequestsAreNotAllowed() throws Exception {
		mockMvc.perform(options("/api/test/me")
				.header(HttpHeaders.ORIGIN, "https://app.example.com")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
			.andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
	}
}
