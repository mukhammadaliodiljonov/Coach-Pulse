package com.coachpulse.team;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamMemberRepository extends JpaRepository<TeamMember, UUID> {

    List<TeamMember> findByUserIdOrderByJoinedAtAsc(UUID userId);

    Optional<TeamMember> findByTeamIdAndUserId(UUID teamId, UUID userId);
}
