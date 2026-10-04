package com.coachpulse.checkin;

import java.util.Locale;

/** The safety symptoms both check-ins ask about; each is a boolean column of the same name. */
public enum SymptomCode {
    HEADACHE,
    DIZZINESS,
    NAUSEA,
    LIGHT_SENSITIVITY,
    BALANCE_PROBLEMS,
    CONFUSION;

    public String column() {
        return name().toLowerCase(Locale.ROOT);
    }
}
