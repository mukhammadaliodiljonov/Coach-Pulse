package com.coachpulse.team;

/** What an athlete sees before joining with a code: no ids, members or join code. */
public record TeamPreview(String name, String sport, Coach headCoach) {

    public record Coach(String firstName, String lastName) {
    }
}
