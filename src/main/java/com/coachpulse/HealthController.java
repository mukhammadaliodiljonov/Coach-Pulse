package com.coachpulse;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public liveness check for the load balancer (Elastic Beanstalk health check path {@code /api/health}).
 * Every other route needs a sign-in, so a check against {@code /} would get 401 and mark the app unhealthy.
 */
@RestController
public class HealthController {

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
