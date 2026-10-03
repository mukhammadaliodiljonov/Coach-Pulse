package com.coachpulse.team;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "team_members")
public class TeamMember {

    @Id
    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "team_id", nullable = false, updatable = false)
    private UUID teamId;

    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "member_role", nullable = false, length = 20)
    private MemberRole memberRole;

    @Column(name = "joined_at", nullable = false)
    private OffsetDateTime joinedAt;

    protected TeamMember() {
    }

    public TeamMember(UUID teamId, UUID userId, MemberRole memberRole) {
        this.id = UUID.randomUUID();
        this.teamId = teamId;
        this.userId = userId;
        this.memberRole = memberRole;
    }

    @PrePersist
    void setJoinedAt() {
        if (joinedAt == null) {
            joinedAt = OffsetDateTime.now();
        }
    }

    public UUID getTeamId() {
        return teamId;
    }

    public UUID getUserId() {
        return userId;
    }

    public MemberRole getMemberRole() {
        return memberRole;
    }
}
