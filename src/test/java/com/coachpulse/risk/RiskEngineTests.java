package com.coachpulse.risk;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import com.coachpulse.baseline.Baseline;
import com.coachpulse.baseline.Baseline.LoadBaseline;
import com.coachpulse.baseline.Reason;
import com.coachpulse.checkin.MorningCheckin;
import com.coachpulse.checkin.SymptomCode;
import com.coachpulse.checkin.WorkoutCheckin;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import static com.coachpulse.checkin.SymptomCode.CONFUSION;
import static com.coachpulse.checkin.SymptomCode.DIZZINESS;
import static com.coachpulse.checkin.SymptomCode.HEADACHE;
import static com.coachpulse.checkin.SymptomCode.NAUSEA;
import static org.assertj.core.api.Assertions.assertThat;

class RiskEngineTests {

	private static final LocalDate TODAY = LocalDate.of(2026, 10, 5);
	private static final OffsetDateTime NOW = TODAY.atTime(9, 0).atOffset(ZoneOffset.UTC);
	private static final Baseline USUAL = new Baseline(21, 4.0, 2.0, 2.0, 4.0, null);
	private static final LoadBaseline USUAL_LOAD = new LoadBaseline(500, 450, 550);

	private static MorningCheckin morning(int sleep, int fatigue, int soreness, int wellness, SymptomCode... symptoms) {
		return new MorningCheckin(UUID.randomUUID(), NOW.minusHours(1), sleep, fatigue, soreness, wellness, List.of(symptoms), null);
	}

	private static WorkoutCheckin session(int loadAu) {
		return new WorkoutCheckin(UUID.randomUUID(), NOW.minusHours(2), 10, loadAu / 10, 3, 3, null, null, List.of());
	}

	private static Assessment assess(MorningCheckin morning, WorkoutCheckin workout) {
		return RiskEngine.assess(morning, workout, USUAL, USUAL_LOAD, TODAY, ZoneOffset.UTC, NOW);
	}

	private static Reason recovery(String metric, int value, double baseline) {
		return Reason.recovery(metric, value, baseline);
	}

	private static Reason load(double changePct) {
		return Reason.trainingLoad(0, 0, 0, changePct);
	}

	// --- Score ---------------------------------------------------------------

	@Test
	void nothingUnusualScoresZero() {
		assertThat(RiskEngine.score(List.of())).isZero();
	}

	@Test
	void safetySymptomsScoreSeventyPlusFivePerExtraDistinctSymptom() {
		assertThat(RiskEngine.score(List.of(Reason.safetySymptom(List.of(NAUSEA), "MORNING_CHECKIN")))).isEqualTo(70);
		assertThat(RiskEngine.score(List.of(Reason.safetySymptom(List.of(HEADACHE, DIZZINESS), "WORKOUT_CHECKIN")))).isEqualTo(75);
		// The same symptom in both check-ins counts once.
		assertThat(RiskEngine.score(List.of(Reason.safetySymptom(List.of(HEADACHE), "MORNING_CHECKIN"),
				Reason.safetySymptom(List.of(HEADACHE, NAUSEA), "WORKOUT_CHECKIN")))).isEqualTo(75);
	}

	@Test
	void recoveryScoresFifteenAtTwoPointsAndTwentyFiveFromThree() {
		assertThat(RiskEngine.score(List.of(recovery("FATIGUE", 4, 2.0)))).isEqualTo(15);
		assertThat(RiskEngine.score(List.of(recovery("FATIGUE", 5, 2.0)))).isEqualTo(25);
		assertThat(RiskEngine.score(List.of(recovery("SORENESS", 5, 2.1)))).isEqualTo(15);
		assertThat(RiskEngine.score(List.of(recovery("WELLNESS", 2, 4.0)))).isEqualTo(15);
		assertThat(RiskEngine.score(List.of(recovery("WELLNESS", 1, 4.0)))).isEqualTo(25);
	}

	@Test
	void sleepAddsFivePoints() {
		assertThat(RiskEngine.score(List.of(recovery("SLEEP", 1, 4.0)))).isEqualTo(5);
	}

	@Test
	void loadScoresByHowFarAboveTheUsualMeanItIs() {
		assertThat(RiskEngine.score(List.of(load(15.0)))).isEqualTo(15);
		assertThat(RiskEngine.score(List.of(load(29.9)))).isEqualTo(15);
		assertThat(RiskEngine.score(List.of(load(30.0)))).isEqualTo(20);
		assertThat(RiskEngine.score(List.of(load(49.9)))).isEqualTo(20);
		assertThat(RiskEngine.score(List.of(load(50.0)))).isEqualTo(25);
	}

	@Test
	void withoutASymptomTheScoreStaysBelowRed() {
		List<Reason> everything = List.of(recovery("FATIGUE", 5, 2.0), recovery("WELLNESS", 1, 4.0),
				recovery("SORENESS", 5, 2.0), recovery("SLEEP", 1, 4.0), load(80.0));

		assertThat(RiskEngine.score(everything)).isEqualTo(69);
		assertThat(RiskEngine.status(69)).isEqualTo("YELLOW");
	}

	@Test
	void withASymptomOtherReasonsAddUpToOneHundred() {
		assertThat(RiskEngine.score(List.of(Reason.safetySymptom(List.of(NAUSEA), "MORNING_CHECKIN"), recovery("FATIGUE", 4, 2.0))))
			.isEqualTo(85);
		assertThat(RiskEngine.score(List.of(Reason.safetySymptom(List.of(HEADACHE, DIZZINESS, NAUSEA, CONFUSION), "MORNING_CHECKIN"),
				recovery("FATIGUE", 5, 2.0), load(60.0)))).isEqualTo(100);
	}

	// --- Status --------------------------------------------------------------

	@Test
	void statusBandsAreGreenYellowRed() {
		assertThat(RiskEngine.status(0)).isEqualTo("GREEN");
		assertThat(RiskEngine.status(14)).isEqualTo("GREEN");
		assertThat(RiskEngine.status(15)).isEqualTo("YELLOW");
		assertThat(RiskEngine.status(69)).isEqualTo("YELLOW");
		assertThat(RiskEngine.status(70)).isEqualTo("RED");
		assertThat(RiskEngine.status(100)).isEqualTo("RED");
	}

	// --- Whole assessments ---------------------------------------------------

	@Test
	void usualDayIsGreen() {
		Assessment assessment = assess(morning(4, 3, 3, 3), session(500));

		assertThat(assessment).extracting(Assessment::riskStatus, Assessment::riskScore).containsExactly("GREEN", 0);
		assertThat(assessment.reasons()).isEmpty();
		assertThat(assessment.engineVersion()).isEqualTo("risk-v1/baseline-v1");
		assertThat(assessment.id()).isNull();
		assertThat(assessment.createdAt()).isEqualTo(NOW);
	}

	@Test
	void poorSleepAloneStaysGreenButIsExplained() {
		Assessment assessment = assess(morning(1, 2, 2, 4), null);

		assertThat(assessment).extracting(Assessment::riskStatus, Assessment::riskScore).containsExactly("GREEN", 5);
		assertThat(assessment.reasons()).containsExactly(recovery("SLEEP", 1, 4.0));
	}

	@Test
	void poorSleepPlusOneRecoveryReasonIsYellow() {
		assertThat(assess(morning(1, 4, 2, 4), null)).extracting(Assessment::riskStatus, Assessment::riskScore)
			.containsExactly("YELLOW", 20);
	}

	@Test
	void highLoadAloneIsYellow() {
		// 650 AU is +30% on the usual 500 AU mean; 780 AU is +56%.
		assertThat(assess(null, session(650))).extracting(Assessment::riskStatus, Assessment::riskScore)
			.containsExactly("YELLOW", 20);
		assertThat(assess(null, session(780))).extracting(Assessment::riskStatus, Assessment::riskScore)
			.containsExactly("YELLOW", 25);
	}

	@Test
	void anySymptomIsRedWithoutABaseline() {
		Assessment assessment = RiskEngine.assess(morning(4, 2, 2, 4, NAUSEA), null, null, null, TODAY, ZoneOffset.UTC, NOW);

		assertThat(assessment).extracting(Assessment::riskStatus, Assessment::riskScore).containsExactly("RED", 70);
	}

	@Test
	void theScoreIsNeverSentToClients() throws Exception {
		String json = JsonMapper.builder().build().writeValueAsString(assess(morning(4, 5, 2, 4), null));

		assertThat(json).contains("\"riskStatus\":\"YELLOW\"").doesNotContain("riskScore").doesNotContain("25");
	}
}
