package com.coachpulse.team;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamRepository extends JpaRepository<Team, UUID> {

    boolean existsByJoinCode(String joinCode);
}
