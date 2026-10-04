package com.coachpulse;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Starts the whole application against the database configured in application.properties, so it only runs
 * where DB_PASSWORD (and JWT_SECRET) are set, e.g. the IntelliJ run configuration. Elsewhere, such as a plain
 * {@code mvn clean package}, it's skipped instead of failing the build. Note that starting the app runs the
 * Liquibase migrations against that database.
 */
@SpringBootTest
@EnabledIfEnvironmentVariable(named = "DB_PASSWORD", matches = ".+")
class CoachPulseApplicationTests {

	@Test
	void contextLoads() {
	}

}
