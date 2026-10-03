package com.coachpulse.user;

import com.coachpulse.exception.ConflictException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RegistrationServiceTests {

	private final UserAccountRepository users = mock(UserAccountRepository.class);
	private final PasswordEncoder passwordEncoder = Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8();
	private final RegistrationService registrationService = new RegistrationService(users, passwordEncoder);

	@Test
	void storesNormalizedProfileAndHashedPassword() {
		when(users.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

		registrationService.register(new RegistrationRequest(" Sam.Rivera@Club.org ", "correct-horse", " Sam ", " Rivera "));

		ArgumentCaptor<UserAccount> saved = ArgumentCaptor.forClass(UserAccount.class);
		verify(users).save(saved.capture());
		UserAccount user = saved.getValue();
		assertThat(user.getId()).isNotNull();
		assertThat(user.getEmail()).isEqualTo("sam.rivera@club.org");
		assertThat(user.getFirstName()).isEqualTo("Sam");
		assertThat(user.getLastName()).isEqualTo("Rivera");
		assertThat(user.getRole()).isEqualTo(UserRole.COACH);
		assertThat(user.getPasswordHash()).isNotEqualTo("correct-horse").doesNotContain("correct-horse");
		assertThat(passwordEncoder.matches("correct-horse", user.getPasswordHash())).isTrue();
	}

	@Test
	void rejectsDuplicateEmail() {
		when(users.existsByEmailIgnoreCase("sam.rivera@club.org")).thenReturn(true);

		assertThatThrownBy(() -> registrationService.register(
				new RegistrationRequest("Sam.Rivera@club.org", "correct-horse", "Sam", "Rivera")))
			.isInstanceOf(ConflictException.class);
		verify(users, never()).save(any());
	}
}
