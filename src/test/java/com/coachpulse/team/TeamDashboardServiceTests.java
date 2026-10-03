package com.coachpulse.team;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import com.coachpulse.team.TeamDayResponse.DailyLoad;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TeamDashboardServiceTests {

	@Test
	void loadHistoryHasFourteenDaysOldestFirstWithZerosForRestDays() {
		LocalDate start = LocalDate.of(2026, 9, 21);

		List<DailyLoad> history = TeamDashboardService.loadHistory(
				Map.of(LocalDate.of(2026, 9, 22), 520L, LocalDate.of(2026, 10, 4), 780L, LocalDate.of(2026, 9, 1), 999L),
				start);

		assertThat(history).hasSize(14);
		assertThat(history.get(0)).isEqualTo(new DailyLoad(start, 0));
		assertThat(history.get(1)).isEqualTo(new DailyLoad(LocalDate.of(2026, 9, 22), 520));
		assertThat(history.get(13)).isEqualTo(new DailyLoad(LocalDate.of(2026, 10, 4), 780));
		assertThat(history).extracting(DailyLoad::loadAu).containsOnly(0L, 520L, 780L);
	}
}
