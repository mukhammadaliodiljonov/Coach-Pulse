package com.coachpulse.baseline;

import java.time.OffsetDateTime;
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
	private static final OffsetDateTime NOW = Checkins.at(TODAY, 9);
	private static final Baseline USUAL = new Baseline(21, 4.0, 2.0, 2.0, 4.0, null);
	private static final LoadBaseline USUAL_LOAD = new LoadBaseline(500, 450, 550);

	private static Assessment assess(MorningCheckin morning, WorkoutCheckin workout, Baseline baseline, LoadBaseline load) {
		return DeviationDetector.assess(morning, workout, baseline, load, TODAY, UTC, NOW);
	}

	@Test
	void usualDayIsNormal() {
		Assessment assessment = assess(morning(TODAY, 4, 3, 3, 3), session(TODAY.minusDays(1), 60, 8), USUAL, USUAL_LOAD);

		assertThat(assessment.riskStatus()).isEqualTo("GREEN");
		assertThat(assessment.reasons()).isEmpty();
		assertThat(assessment.engineVersion()).isEqualTo("baseline-v1");
		assertThat(assessment.createdAt()).isEqualTo(NOW);
	}

	@Test
	void anySymptomIsHighPriorityEvenWithoutABaseline() {
		Assessment assessment = assess(morning(TODAY, 4, 2, 2, 4, SymptomCode.NAUSEA), null, null, null);

		assertThat(assessment.riskStatus()).isEqualTo("RED");
		assertThat(assessment.reasons()).containsExactly(
				Reason.safetySymptom(List.of(SymptomCode.NAUSEA), "MORNING_CHECKIN"));
	}

	@Test
	void symptomsAfterYesterdaysTrainingStillCountButOlderOnesDont() {
		WorkoutCheckin yesterday = session(TODAY.minusDays(1), 60, 5, SymptomCode.HEADACHE, SymptomCode.DIZZINESS);
		assertThat(assess(null, yesterday, null, null).reasons()).containsExactly(
				Reason.safetySymptom(List.of(SymptomCode.HEADACHE, SymptomCode.DIZZINESS), "WORKOUT_CHECKIN"));

		WorkoutCheckin twoDaysAgo = session(TODAY.minusDays(2), 60, 5, SymptomCode.HEADACHE);
		assertThat(assess(null, twoDaysAgo, null, null).riskStatus()).isEqualTo("GREEN");
	}

	@Test
	void recoveryNeedsATwoPointMoveInTheWorseDirection() {
		assertThat(assess(morning(TODAY, 4, 4, 2, 4), null, USUAL, null).reasons())
			.containsExactly(Reason.recovery("FATIGUE", 4, 2.0));
		assertThat(assess(morning(TODAY, 4, 2, 2, 2), null, USUAL, null).reasons())
			.containsExactly(Reason.recovery("WELLNESS", 2, 4.0));
		assertThat(assess(morning(TODAY, 4, 2, 4, 4), null, USUAL, null).reasons())
			.containsExactly(Reason.recovery("SORENESS", 4, 2.0));

		// One point, or a move in the better direction, is not a signal.
		assertThat(assess(morning(TODAY, 4, 3, 3, 3), null, USUAL, null).reasons()).isEmpty();
		assertThat(assess(morning(TODAY, 4, 1, 1, 5), null, new Baseline(21, 4, 4, 4, 2, null), null).reasons()).isEmpty();
	}

	@Test
	void fractionalBaselinesNeedTheFullTwoPoints() {
		Baseline baseline = new Baseline(21, 4.0, 2.1, 2.0, 4.0, null);

		assertThat(assess(morning(TODAY, 4, 4, 2, 4), null, baseline, null).reasons()).isEmpty();
		assertThat(assess(morning(TODAY, 4, 5, 2, 4), null, baseline, null).reasons())
			.containsExactly(Reason.recovery("FATIGUE", 5, 2.1));
	}

	@Test
	void sleepIsNeverFlaggedOnItsOwn() {
		assertThat(assess(morning(TODAY, 1, 2, 2, 4), null, USUAL, null).riskStatus()).isEqualTo("GREEN");
	}

	@Test
	void noRecoveryChecksWhileTodaysCheckinIsPendingOrTheBaselineForms() {
		assertThat(assess(null, null, USUAL, null).reasons()).isEmpty();
		assertThat(assess(morning(TODAY, 1, 5, 5, 1), null, null, null).reasons()).isEmpty();
	}

	@Test
	void trainingSignalAtFifteenPercentAboveTheUsualMean() {
		// 575 AU is exactly +15% on a 500 AU mean; 570 AU is +14%.
		assertThat(assess(null, session(TODAY, 115, 5), null, USUAL_LOAD).reasons())
			.containsExactly(Reason.trainingLoad(575, 450, 550, 15.0));
		assertThat(assess(null, session(TODAY, 114, 5), null, USUAL_LOAD).reasons()).isEmpty();
		assertThat(assess(null, session(TODAY, 115, 5), null, null).reasons()).isEmpty();
	}

	@Test
	void symptomsOutrankOtherSignalsButAllAreListed() {
		Assessment assessment = assess(morning(TODAY, 4, 5, 5, 1, SymptomCode.CONFUSION), session(TODAY, 78, 10),
				USUAL, USUAL_LOAD);

		assertThat(assessment.riskStatus()).isEqualTo("RED");
		assertThat(assessment.reasons()).extracting(Reason::kind)
			.containsExactly("SAFETY_SYMPTOM", "RECOVERY", "RECOVERY", "RECOVERY", "TRAINING_LOAD");
		assertThat(assessment.reasons()).extracting(Reason::metric).containsSubsequence("FATIGUE", "WELLNESS", "SORENESS");
	}

	@Test
	void otherSignalsAloneNeedReview() {
		assertThat(assess(morning(TODAY, 4, 5, 2, 4), null, USUAL, null).riskStatus()).isEqualTo("YELLOW");
	}
}
