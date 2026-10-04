package com.coachpulse.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;

import com.coachpulse.HealthController;
import com.coachpulse.user.AuthenticationController;
import com.coachpulse.user.AuthenticationService;
import com.coachpulse.user.LoginResponse;
import com.coachpulse.user.UserRole;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({ ProtectedEndpointTests.TestController.class, AuthenticationController.class, HealthController.class })
@Import({ ProtectedEndpointTests.TestController.class, JwtSecurityConfiguration.class, JwtTokenService.class })
@TestPropertySource(properties = "app.security.jwt.secret=" + ProtectedEndpointTests.SECRET)
class ProtectedEndpointTests {

	static final String SECRET = "test-secret-with-at-least-thirty-two-bytes";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtTokenService jwtTokenService;

	@Autowired
	private JwtEncoder jwtEncoder;

	@MockitoBean
	private AuthenticationService authenticationService;

	@Test
	void missingTokenIsRejected() throws Exception {
		mockMvc.perform(get("/api/test/me"))
			.andExpect(status().isUnauthorized())
			.andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE, startsWith("Bearer")));
	}

	@Test
	void validTokenAttachesVerifiedUserIdentity() throws Exception {
		String userId = UUID.randomUUID().toString();

		mockMvc.perform(get("/api/test/me").header(HttpHeaders.AUTHORIZATION, bearer(jwtTokenService.createToken(userId, UserRole.ATHLETE))))
			.andExpect(status().isOk())
			.andExpect(content().string(userId));
	}

	@Test
	void expiredTokenIsRejected() throws Exception {
		Instant issuedAt = Instant.now().minusSeconds(600);
		String token = sign(jwtEncoder, issuedAt, issuedAt.plusSeconds(300));

		mockMvc.perform(get("/api/test/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void tokenSignedWithAnotherKeyIsRejected() throws Exception {
		JwtEncoder otherEncoder = new NimbusJwtEncoder(new ImmutableSecret<>(new SecretKeySpec(
				"another-secret-with-at-least-thirty-two-bytes".getBytes(StandardCharsets.UTF_8), "HmacSHA256")));
		String token = sign(otherEncoder, Instant.now(), Instant.now().plusSeconds(300));

		mockMvc.perform(get("/api/test/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void tamperedClaimsAreRejected() throws Exception {
		String[] parts = jwtTokenService.createToken(UUID.randomUUID().toString(), UserRole.ATHLETE).split("\\.");
		String forgedPayload = base64Url("{\"sub\":\"" + UUID.randomUUID() + "\",\"role\":\"ADMIN\",\"exp\":"
				+ Instant.now().plusSeconds(300).getEpochSecond() + "}");

		mockMvc.perform(get("/api/test/me").header(HttpHeaders.AUTHORIZATION, bearer(parts[0] + "." + forgedPayload + "." + parts[2])))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void unsignedTokenIsRejected() throws Exception {
		String token = base64Url("{\"alg\":\"none\"}") + "." + base64Url("{\"sub\":\"" + UUID.randomUUID()
				+ "\",\"role\":\"ADMIN\",\"exp\":" + Instant.now().plusSeconds(300).getEpochSecond() + "}") + ".";

		mockMvc.perform(get("/api/test/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void malformedTokenIsRejected() throws Exception {
		mockMvc.perform(get("/api/test/me").header(HttpHeaders.AUTHORIZATION, bearer("not-a-jwt")))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void tokenInQueryParameterIsNotAccepted() throws Exception {
		String token = jwtTokenService.createToken(UUID.randomUUID().toString(), UserRole.COACH);

		mockMvc.perform(get("/api/test/me").param("access_token", token))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void loginIsPublicEvenWithStaleToken() throws Exception {
		when(authenticationService.login(any())).thenReturn(new LoginResponse("token", "Bearer", 900));

		mockMvc.perform(post("/api/auth/login")
				.header(HttpHeaders.AUTHORIZATION, bearer("expired-or-garbage"))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"sam@club.org\",\"password\":\"correct-horse\"}"))
			.andExpect(status().isOk());
	}

	@Test
	void healthCheckIsPublic() throws Exception {
		mockMvc.perform(get("/api/health"))
			.andExpect(status().isOk())
			.andExpect(content().json("{\"status\":\"UP\"}"));
	}

	@Test
	void logoutIsPublic() throws Exception {
		mockMvc.perform(post("/api/auth/logout"))
			.andExpect(status().isNoContent());
	}

	private static String sign(JwtEncoder encoder, Instant issuedAt, Instant expiresAt) {
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.subject(UUID.randomUUID().toString())
			.issuedAt(issuedAt)
			.expiresAt(expiresAt)
			.claim(JwtTokenService.ROLE_CLAIM, UserRole.COACH.name())
			.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

	private static String base64Url(String json) {
		return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
	}

	private static String bearer(String token) {
		return "Bearer " + token;
	}

	@RestController
	static class TestController {

		@GetMapping("/api/test/me")
		String me(@AuthenticationPrincipal Jwt jwt) {
			return jwt.getSubject();
		}
	}
}
