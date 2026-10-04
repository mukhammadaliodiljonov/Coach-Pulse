package com.coachpulse.checkin;

import java.util.UUID;

import com.coachpulse.exception.ResourceNotFoundException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * An athlete's check-ins belong to the athlete; coaches of a team the athlete is on may read them.
 * Anyone else gets the same 404 as for an athlete that doesn't exist.
 */
@Component
public class AthleteAccess {

    private final JdbcClient jdbc;

    public AthleteAccess(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Only the athlete themself, e.g. to submit a check-in. */
    public void requireSelf(UUID athleteId, UUID userId) {
        boolean self = jdbc.sql("SELECT EXISTS (SELECT 1 FROM athlete_profiles WHERE id = :athleteId AND user_id = :userId)")
                .param("athleteId", athleteId).param("userId", userId)
                .query(Boolean.class).single();
        if (!self) {
            throw new ResourceNotFoundException("Athlete", athleteId);
        }
    }

    /** The athlete, or a coach of one of their teams. */
    public void requireSelfOrCoach(UUID athleteId, UUID userId) {
        boolean allowed = jdbc.sql("""
                        SELECT EXISTS (
                            SELECT 1 FROM athlete_profiles ap
                            WHERE ap.id = :athleteId AND (
                                ap.user_id = :userId
                                OR EXISTS (
                                    SELECT 1 FROM team_members athlete_tm
                                    JOIN team_members coach_tm ON coach_tm.team_id = athlete_tm.team_id
                                    WHERE athlete_tm.user_id = ap.user_id AND athlete_tm.member_role = 'ATHLETE'
                                      AND coach_tm.user_id = :userId AND coach_tm.member_role IN ('HEAD_COACH', 'ASSISTANT_COACH'))))
                        """)
                .param("athleteId", athleteId).param("userId", userId)
                .query(Boolean.class).single();
        if (!allowed) {
            throw new ResourceNotFoundException("Athlete", athleteId);
        }
    }
}
