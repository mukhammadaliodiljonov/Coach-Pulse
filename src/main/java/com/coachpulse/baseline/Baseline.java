package com.coachpulse.baseline;

/** An athlete's usual levels, as returned in {@code baseline} by the team dashboard. */
public record Baseline(
        int windowDays,
        double sleepQuality,
        double fatigue,
        double muscleSoreness,
        double overallWellness,
        LoadBaseline trainingLoad) {

    /** Usual session load: the mean and the middle half (25th–75th percentile), in AU. */
    public record LoadBaseline(long meanAu, long lowAu, long highAu) {
    }
}
