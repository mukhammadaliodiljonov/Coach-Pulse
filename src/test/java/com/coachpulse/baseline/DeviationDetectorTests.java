package com.coachpulse.baseline;

import java.time.ZoneOffset;
import java.util.List;

import com.coachpulse.baseline.Baseline.LoadBaseline;
import com.coachpulse.checkin.MorningCheckin;
import com.coachpulse.checkin.SymptomCode;
import com.coachpulse.checkin.WorkoutCheckin;
import org.junit.jupiter.api.Test;

import static com.coachpulse.baseline.Checkins.TODAY;
import static com.coachpulse.baseline.Checkins.morning;
import static com.coachpulse.baseline.Checkins.session;
import static org.assertj.core.api.Assertions.assertThat;

class DeviationDetectorTests {

	private static final ZoneOffset UTC = ZoneOffset.UTC;
	private static final Baseline USUAL = new Baseline(21, 4.0, 2.0, 2.0, 4.0, null);
	private static final LoadBaseline USUAL_LOAD = new LoadBaseline(500, 450, 550);

	private static List<Reason> reasons(MorningCheckin morning, WorkoutCheckin workout, Baseline baseline, LoadBaseline load) {
		return DeviationDetector.reasons(morning, workout, baseline, load, TODAY, UTC);
	}

	@Test
	void usualDayHasNoReasons() {
		assertThat(reasons(morning(TODAY, 4, 3, 3, 3), session(TODAY.minusDays(1), 60, 8), USUAL, USUAL_LOAD)).isEmpty();
	}

	@Test
	void anySymptomIsAReasonEvenWithoutABaseline() {
		assertThat(reasons(morning(TODAY, 4, 2, 2, 4, SymptomCode.NAUSEA), null, null, null))
			.containsExactly(Reason.safetySymptom(List.of(SymptomCode.NAUSEA), "MORNING_CHECKIN"));
	}

	@Test
	void symptomsAfterYesterdaysTrainingStillCountButOlderOnesDont() {
		WorkoutCheckin yesterday = session(TODAY.minusDays(1), 60, 5, SymptomCode.HEADACHE, SymptomCode.DIZZINESS);
		assertThat(reasons(null, yesterday, null, null)).containsExactly(
				Reason.safetySymptom(List.of(SymptomCode.HEADACHE, SymptomCode.DIZZINESS), "WORKOUT_CHECKIN"));

		assertThat(reasons(null, session(TODAY.minusDays(2), 60, 5, SymptomCode.HEADACHE), null, null)).isEmpty();
	}

	@Test
	void recoveryNeedsATwoPointMoveInTheWorseDirection() {
		assertThat(reasons(morning(TODAY, 4, 4, 2, 4), null, USUAL, null)).containsExactly(Reason.recovery("FATIGUE", 4, 2.0));
		assertThat(reasons(morning(TODAY, 4, 2, 2, 2), null, USUAL, null)).containsExactly(Reason.recovery("WELLNESS", 2, 4.0));
		assertThat(reasons(morning(TODAY, 4, 2, 4, 4), null, USUAL, null)).containsExactly(Reason.recovery("SORENESS", 4, 2.0));
		assertThat(reasons(morning(TODAY, 2, 2, 2, 4), null, USUAL, null)).containsExactly(Reason.recovery("SLEEP", 2, 4.0));

		// One point, or a move in the better direction, is not a reason.
		assertThat(reasons(morning(TODAY, 3, 3, 3, 3), null, USUAL, null)).isEmpty();
		assertThat(reasons(morning(TODAY, 5, 1, 1, 5), null, new Baseline(21, 2, 4, 4, 2, null), null)).isEmpty();
	}

	@Test
	void fractionalBaselinesNeedTheFullTwoPoints() {
		Baseline baseline = new Baseline(21, 4.0, 2.1, 2.0, 4.0, null);

		assertThat(reasons(morning(TODAY, 4, 4, 2, 4), null, baseline, null)).isEmpty();
		assertThat(reasons(morning(TODAY, 4, 5, 2, 4), null, baseline, null)).containsExactly(Reason.recovery("FATIGUE", 5, 2.1));
	}

	@Test
	void noRecoveryChecksWhileTodaysCheckinIsPendingOrTheBaselineForms() {
		assertThat(reasons(null, null, USUAL, null)).isEmpty();
		assertThat(reasons(morning(TODAY, 1, 5, 5, 1), null, null, null)).isEmpty();
	}

	@Test
	void trainingLoadAtFifteenPercentAboveTheUsualMean() {
		// 575 AU is exactly +15% on a 500 AU mean; 570 AU is +14%.
		assertThat(reasons(null, session(TODAY, 115, 5), null, USUAL_LOAD))
			.containsExactly(Reason.trainingLoad(575, 450, 550, 15.0));
		assertThat(reasons(null, session(TODAY, 114, 5), null, USUAL_LOAD)).isEmpty();
		assertThat(reasons(null, session(TODAY, 115, 5), null, null)).isEmpty();
	}

	@Test
	void listsSymptomsFirstThenRecoveryThenLoad() {
		List<Reason> all = reasons(morning(TODAY, 1, 5, 5, 1, SymptomCode.CONFUSION), session(TODAY, 78, 10), USUAL, USUAL_LOAD);

		assertThat(all).extracting(Reason::kind)
			.containsExactly("SAFETY_SYMPTOM", "RECOVERY", "RECOVERY", "RECOVERY", "RECOVERY", "TRAINING_LOAD");
		assertThat(all).extracting(Reason::metric).containsSubsequence("FATIGUE", "WELLNESS", "SORENESS", "SLEEP");
	}
}
