package com.coachpulse.security;

import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import com.coachpulse.user.UserRole;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

/**
 * Authentication and authorization for the API. Role checks are enforced server-side with
 * {@code @PreAuthorize("hasRole('COACH')")} (or {@code hasAnyRole(...)}) on controller methods,
 * using the {@code ROLE_*} authorities derived from the verified JWT.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class JwtSecurityConfiguration {

    /** Endpoints reachable without a bearer token. Every other route requires a verified JWT. */
    static final RequestMatcher PUBLIC_ENDPOINTS = new OrRequestMatcher(
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/auth/register"),
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/auth/login"),
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/auth/logout"),
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/api/auth/join/*"),
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/auth/join"));

    @Bean
    SecretKey jwtSecretKey(@Value("${app.security.jwt.secret}") String secret) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalArgumentException("JWT_SECRET must contain at least 32 bytes");
        }
        return new SecretKeySpec(keyBytes, "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSecretKey));
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey jwtSecretKey) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtSecretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                roleClaimValidator()));
        return decoder;
    }

    /** Rejects tokens whose role claim is missing or is not a defined {@link UserRole}. */
    static OAuth2TokenValidator<Jwt> roleClaimValidator() {
        OAuth2Error invalidRole = new OAuth2Error(
                OAuth2ErrorCodes.INVALID_TOKEN, "The token role is missing or invalid", null);
        return jwt -> UserRole.fromName(jwt.getClaimAsString(JwtTokenService.ROLE_CLAIM)).isPresent()
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(invalidRole);
    }

    /** Exposes the verified role claim as a {@code ROLE_*} authority on the authentication. */
    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName(JwtTokenService.ROLE_CLAIM);
        authorities.setAuthorityPrefix(UserRole.AUTHORITY_PREFIX);

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        // Spring Boot's error dispatch must stay reachable so errors keep their status.
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(resourceServer -> resourceServer
                        .bearerTokenResolver(bearerTokenResolver())
                        .jwt(Customizer.withDefaults()))
                .build();
    }

    /**
     * Reads the token from the {@code Authorization: Bearer} header only (never query parameters or
     * form bodies), and ignores it on public endpoints so a stale token cannot block login or logout.
     */
    static BearerTokenResolver bearerTokenResolver() {
        DefaultBearerTokenResolver headerResolver = new DefaultBearerTokenResolver();
        return request -> PUBLIC_ENDPOINTS.matches(request) ? null : headerResolver.resolve(request);
    }
}
