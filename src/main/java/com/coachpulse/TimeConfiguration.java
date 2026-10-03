package com.coachpulse;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TimeConfiguration {

    /** The server's clock and time zone; "today" for check-ins and alerts is the day in this zone. */
    @Bean
    Clock clock() {
        return Clock.systemDefaultZone();
    }
}
