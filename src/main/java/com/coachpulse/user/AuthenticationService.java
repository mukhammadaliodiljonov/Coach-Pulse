package com.coachpulse.user;

import java.util.Locale;
import java.util.UUID;

import com.coachpulse.exception.AuthenticationFailedException;
import com.coachpulse.security.JwtTokenService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthenticationService {

    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final String dummyPasswordHash;

    public AuthenticationService(
            UserAccountRepository users,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        UserAccount user = users.findByEmailIgnoreCase(email).orElse(null);
        String passwordHash = user == null || user.getPasswordHash() == null
                ? dummyPasswordHash
                : user.getPasswordHash();
        boolean passwordMatches = passwordEncoder.matches(request.password(), passwordHash);

        if (user == null || user.getPasswordHash() == null || !passwordMatches) {
            throw new AuthenticationFailedException();
        }

        String token = jwtTokenService.createToken(user.getId().toString());
        return new LoginResponse(token, "Bearer", jwtTokenService.expiresInSeconds());
    }
}
