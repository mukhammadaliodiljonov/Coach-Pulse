package com.coachpulse.user;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserRoleTests {

	@Test
	void definesTheCoachPulseRoles() {
		assertThat(UserRole.values()).containsExactly(UserRole.ATHLETE, UserRole.COACH, UserRole.ADMIN);
	}

	@Test
	void parsesExactRoleNames() {
		assertThat(UserRole.fromName("ATHLETE")).contains(UserRole.ATHLETE);
		assertThat(UserRole.fromName("COACH")).contains(UserRole.COACH);
		assertThat(UserRole.fromName("ADMIN")).contains(UserRole.ADMIN);
	}

	@Test
	void rejectsUnknownMissingOrMiscasedRoles() {
		assertThat(UserRole.fromName("SUPERUSER")).isEmpty();
		assertThat(UserRole.fromName("coach")).isEmpty();
		assertThat(UserRole.fromName("")).isEmpty();
		assertThat(UserRole.fromName(null)).isEmpty();
	}

	@Test
	void mapsToSpringSecurityAuthority() {
		assertThat(UserRole.COACH.authority()).isEqualTo("ROLE_COACH");
	}
}
