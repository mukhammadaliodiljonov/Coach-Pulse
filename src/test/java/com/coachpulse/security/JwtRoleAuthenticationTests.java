package com.coachpulse.security;

import java.time.Instant;
import java.util.UUID;

import com.coachpulse.user.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(JwtRoleAuthenticationTests.TestController.class)
@Import({ JwtRoleAuthenticationTests.TestController.class, JwtSecurityConfiguration.class, JwtTokenService.class })
@TestPropertySource(properties = "app.security.jwt.secret=test-secret-with-at-least-thirty-two-bytes")
class JwtRoleAuthenticationTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtTokenService jwtTokenService;

	@Autowired
	private JwtEncoder jwtEncoder;

	@Test
	void issuedTokenExposesRoleAsAuthority() throws Exception {
		String token = jwtTokenService.createToken(UUID.randomUUID().toString(), UserRole.COACH);

		mockMvc.perform(get("/test/authorities").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(content().string("ROLE_COACH"));
	}

	@Test
	void tokenWithUnknownRoleIsRejected() throws Exception {
		mockMvc.perform(get("/test/authorities").header("Authorization", "Bearer " + tokenWithRole("SUPERUSER")))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void tokenWithoutRoleIsRejected() throws Exception {
		mockMvc.perform(get("/test/authorities").header("Authorization", "Bearer " + tokenWithRole(null)))
			.andExpect(status().isUnauthorized());
	}

	private String tokenWithRole(String role) {
		Instant now = Instant.now();
		JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
			.subject(UUID.randomUUID().toString())
			.issuedAt(now)
			.expiresAt(now.plusSeconds(60));
		if (role != null) {
			claims.claim(JwtTokenService.ROLE_CLAIM, role);
		}
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return jwtEncoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
	}

	@RestController
	static class TestController {

		@GetMapping("/test/authorities")
		String authorities(Authentication authentication) {
			return authentication.getAuthorities().stream()
				.map(GrantedAuthority::getAuthority)
				.filter(authority -> authority.startsWith(UserRole.AUTHORITY_PREFIX))
				.reduce((a, b) -> a + "," + b)
				.orElse("");
		}
	}
}
