package com.coachpulse.baseline;

import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

import com.coachpulse.baseline.Baseline.LoadBaseline;
import com.coachpulse.checkin.MorningCheckin;
import com.coachpulse.checkin.WorkoutCheckin;
import org.junit.jupiter.api.Test;

import static com.coachpulse.baseline.Checkins.TODAY;
import static com.coachpulse.baseline.Checkins.at;
import static com.coachpulse.baseline.Checkins.morning;
import static com.coachpulse.baseline.Checkins.morningAt;
import static com.coachpulse.baseline.Checkins.session;
import static com.coachpulse.baseline.Checkins.usualMornings;
import static org.assertj.core.api.Assertions.assertThat;

class BaselineCalculatorTests {

	private static final ZoneOffset UTC = ZoneOffset.UTC;

	// --- Wellness baseline ---------------------------------------------------

	@Test
	void noCheckinsMeansNoBaseline() {
		assertThat(BaselineCalculator.wellness(List.of(), TODAY, UTC)).isEmpty();
	}

	@Test
	void needsSevenDaysOfMorningCheckins() {
		assertThat(BaselineCalculator.wellness(usualMornings(6, 4, 2, 2, 4), TODAY, UTC)).isEmpty();
		assertThat(BaselineCalculator.wellness(usualMornings(7, 4, 2, 2, 4), TODAY, UTC)).isPresent();
	}

	@Test
	void averagesEachScoreToOneDecimal() {
		List<MorningCheckin> checkins = new ArrayList<>(usualMornings(6, 4, 2, 2, 4));
		checkins.add(morning(TODAY.minusDays(7), 3, 3, 4, 3));

		Baseline baseline = BaselineCalculator.wellness(checkins, TODAY, UTC).orElseThrow();

		// (6×4 + 3) / 7 = 3.857…, (6×2 + 3) / 7 = 2.142…, (6×2 + 4) / 7 = 2.285…, (6×4 + 3) / 7 = 3.857…
		assertThat(baseline.sleepQuality()).isEqualTo(3.9);
		assertThat(baseline.fatigue()).isEqualTo(2.1);
		assertThat(baseline.muscleSoreness()).isEqualTo(2.3);
		assertThat(baseline.overallWellness()).isEqualTo(3.9);
		assertThat(baseline.windowDays()).isEqualTo(21);
		assertThat(baseline.trainingLoad()).isNull();
	}

	@Test
	void todaysCheckinIsNotPartOfItsOwnBaseline() {
		List<MorningCheckin> checkins = new ArrayList<>(usualMornings(6, 4, 2, 2, 4));
		checkins.add(morning(TODAY, 1, 5, 5, 1));

		assertThat(BaselineCalculator.wellness(checkins, TODAY, UTC)).isEmpty();
	}

	@Test
	void ignoresCheckinsOlderThanTheWindow() {
		List<MorningCheckin> checkins = new ArrayList<>(usualMornings(6, 4, 2, 2, 4));
		checkins.add(morning(TODAY.minusDays(22), 1, 5, 5, 1));
		assertThat(BaselineCalculator.wellness(checkins, TODAY, UTC)).isEmpty();

		checkins.add(morning(TODAY.minusDays(21), 4, 2, 2, 4));
		assertThat(BaselineCalculator.wellness(checkins, TODAY, UTC)).isPresent();
	}

	@Test
	void countsOnlyTheLatestCheckinOfEachDay() {
		List<MorningCheckin> checkins = new ArrayList<>(usualMornings(7, 4, 2, 2, 4));
		// An earlier check-in the same day as another one doesn't count.
		checkins.add(morningAt(at(TODAY.minusDays(1), 6), 1, 5, 5, 1));
		Baseline baseline = BaselineCalculator.wellness(checkins, TODAY, UTC).orElseThrow();
		assertThat(baseline.fatigue()).isEqualTo(2.0);

		// …and a second check-in on a day doesn't make up for a missing day.
		List<MorningCheckin> sixDays = new ArrayList<>(usualMornings(6, 4, 2, 2, 4));
		sixDays.add(morningAt(at(TODAY.minusDays(1), 20), 4, 2, 2, 4));
		assertThat(BaselineCalculator.wellness(sixDays, TODAY, UTC)).isEmpty();
	}

	@Test
	void toleratesGapsAsLongAsThereAreSevenDays() {
		List<MorningCheckin> everyThirdDay = IntStream.of(1, 4, 7, 10, 13, 16, 19)
			.mapToObj(i -> morning(TODAY.minusDays(i), 4, 2, 2, 4))
			.toList();

		assertThat(BaselineCalculator.wellness(everyThirdDay, TODAY, UTC)).isPresent();
	}

	// --- Load baseline -------------------------------------------------------

	@Test
	void needsFourSessionsBesidesTheOneBeingJudged() {
		WorkoutCheckin judged = session(TODAY, 60, 8);
		List<WorkoutCheckin> three = List.of(session(TODAY.minusDays(1), 60, 5), session(TODAY.minusDays(3), 60, 5),
				session(TODAY.minusDays(5), 60, 5), judged);
		assertThat(BaselineCalculator.load(three, judged.id(), TODAY, UTC)).isEmpty();

		List<WorkoutCheckin> four = new ArrayList<>(three);
		four.add(session(TODAY.minusDays(7), 60, 5));
		assertThat(BaselineCalculator.load(four, judged.id(), TODAY, UTC)).isPresent();
	}

	@Test
	void usesTheMeanAndTheMiddleHalfOfSessionLoads() {
		List<WorkoutCheckin> sessions = List.of(session(TODAY.minusDays(1), 20, 5), session(TODAY.minusDays(2), 40, 5),
				session(TODAY.minusDays(3), 60, 5), session(TODAY.minusDays(4), 80, 5));

		LoadBaseline load = BaselineCalculator.load(sessions, UUID.randomUUID(), TODAY, UTC).orElseThrow();

		// Loads 100, 200, 300, 400 AU: mean 250, 25th percentile 175, 75th percentile 325.
		assertThat(load).isEqualTo(new LoadBaseline(250, 175, 325));
	}

	@Test
	void theJudgedSessionIsLeftOut() {
		WorkoutCheckin judged = session(TODAY, 120, 10);
		List<WorkoutCheckin> sessions = List.of(judged, session(TODAY.minusDays(1), 60, 5), session(TODAY.minusDays(2), 60, 5),
				session(TODAY.minusDays(3), 60, 5), session(TODAY.minusDays(4), 60, 5));

		assertThat(BaselineCalculator.load(sessions, judged.id(), TODAY, UTC).orElseThrow())
			.isEqualTo(new LoadBaseline(300, 300, 300));
	}

	@Test
	void ignoresSessionsOlderThanTheWindowButIncludesTodays() {
		List<WorkoutCheckin> sessions = List.of(session(TODAY.minusDays(22), 600, 10), session(TODAY.minusDays(21), 60, 5),
				session(TODAY.minusDays(10), 60, 5), session(TODAY.minusDays(1), 60, 5), session(TODAY, 60, 5));

		assertThat(BaselineCalculator.load(sessions, UUID.randomUUID(), TODAY, UTC).orElseThrow())
			.isEqualTo(new LoadBaseline(300, 300, 300));
	}

	@Test
	void oneHugeSessionMovesTheMeanButNotTheUsualRange() {
		List<WorkoutCheckin> sessions = List.of(session(TODAY.minusDays(1), 60, 5), session(TODAY.minusDays(2), 60, 5),
				session(TODAY.minusDays(3), 60, 5), session(TODAY.minusDays(4), 60, 5), session(TODAY.minusDays(5), 300, 10));

		LoadBaseline load = BaselineCalculator.load(sessions, UUID.randomUUID(), TODAY, UTC).orElseThrow();

		assertThat(load.meanAu()).isEqualTo(840);
		assertThat(load.lowAu()).isEqualTo(300);
		assertThat(load.highAu()).isEqualTo(300);
	}

	@Test
	void percentileInterpolatesBetweenRanks() {
		assertThat(BaselineCalculator.percentile(List.of(100L, 200L, 300L, 400L, 500L), 0.25)).isEqualTo(200.0);
		assertThat(BaselineCalculator.percentile(List.of(100L, 200L), 0.75)).isEqualTo(175.0);
		assertThat(BaselineCalculator.percentile(List.of(480L), 0.25)).isEqualTo(480.0);
	}
}
