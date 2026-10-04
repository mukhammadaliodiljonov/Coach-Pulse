package com.coachpulse.baseline;

import java.util.List;

import com.coachpulse.checkin.SymptomCode;
import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Why an athlete was flagged, in the {@code reason_codes} shapes of docs/api-contract.md. Fields that don't
 * apply to the reason's {@code kind} are left out.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record Reason(
        String kind,
        List<SymptomCode> symptoms,
        String source,
        String metric,
        Integer value,
        Double baseline,
        Long loadAu,
        Long baselineLowAu,
        Long baselineHighAu,
        Double changePct) {

    public static Reason safetySymptom(List<SymptomCode> symptoms, String source) {
        return new Reason("SAFETY_SYMPTOM", symptoms, source, null, null, null, null, null, null, null);
    }

    /** {@code metric} is FATIGUE, WELLNESS, SORENESS or SLEEP (which only adds to the risk score). */
    public static Reason recovery(String metric, int value, double baseline) {
        return new Reason("RECOVERY", null, null, metric, value, baseline, null, null, null, null);
    }

    public static Reason trainingLoad(long loadAu, long lowAu, long highAu, double changePct) {
        return new Reason("TRAINING_LOAD", null, null, null, null, null, loadAu, lowAu, highAu, changePct);
    }
}
