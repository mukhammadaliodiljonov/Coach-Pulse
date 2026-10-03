package com.coachpulse.user;

import java.time.OffsetDateTime;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserAccountTests {

	@Test
	void newAccountsReceiveDistinctUuids() {
		UserAccount first = new UserAccount("a@club.org", "Sam", "Rivera", "hash", UserRole.COACH);
		UserAccount second = new UserAccount("b@club.org", "Priya", "Shah", "hash", UserRole.COACH);

		assertThat(first.getId()).isNotNull().isNotEqualTo(second.getId());
	}

	@Test
	void persistingRecordsCreatedAndUpdatedTimestamps() {
		UserAccount user = new UserAccount("a@club.org", "Sam", "Rivera", "hash", UserRole.COACH);

		user.setCreationTimestamps();

		assertThat(user.getCreatedAt()).isNotNull();
		assertThat(user.getUpdatedAt()).isEqualTo(user.getCreatedAt());
	}

	@Test
	void updatingRefreshesOnlyUpdatedTimestamp() throws InterruptedException {
		UserAccount user = new UserAccount("a@club.org", "Sam", "Rivera", "hash", UserRole.COACH);
		user.setCreationTimestamps();
		OffsetDateTime createdAt = user.getCreatedAt();

		Thread.sleep(5);
		user.setUpdateTimestamp();

		assertThat(user.getCreatedAt()).isEqualTo(createdAt);
		assertThat(user.getUpdatedAt()).isAfter(createdAt);
	}
}
