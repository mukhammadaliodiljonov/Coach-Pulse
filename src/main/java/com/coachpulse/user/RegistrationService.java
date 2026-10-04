package com.coachpulse.user;

import java.util.Locale;

import com.coachpulse.exception.ConflictException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationService {

    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;

    public RegistrationService(UserAccountRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    /** Self-registration creates coaches; athletes are created by joining a team (TeamJoinService). */
    @Transactional
    public RegistrationResponse register(RegistrationRequest request) {
        return RegistrationResponse.from(createAccount(request, UserRole.COACH));
    }

    /** Creates an account with a normalized email and a hashed password. */
    @Transactional
    public UserAccount createAccount(RegistrationRequest request, UserRole role) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("An account with this email already exists");
        }

        UserAccount user = new UserAccount(
                email,
                request.firstName().trim(),
                request.lastName().trim(),
                passwordEncoder.encode(request.password()),
                role);
        return users.save(user);
    }
}
