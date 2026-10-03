package com.coachpulse.team;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "teams")
public class Team {

    @Id
    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "sport", nullable = false, length = 100)
    private String sport;

    @Column(name = "age_group", length = 20)
    private String ageGroup;

    @Column(name = "training_frequency", length = 30)
    private String trainingFrequency;

    @Column(name = "join_code", length = 12)
    private String joinCode;

    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Team() {
    }

    public Team(String name, String sport, String ageGroup, String trainingFrequency, String joinCode, UUID createdBy) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.sport = sport;
        this.ageGroup = ageGroup;
        this.trainingFrequency = trainingFrequency;
        this.joinCode = joinCode;
        this.createdBy = createdBy;
    }

    @PrePersist
    void setCreationTimestamps() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void setUpdateTimestamp() {
        updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getSport() {
        return sport;
    }

    public String getAgeGroup() {
        return ageGroup;
    }

    public String getTrainingFrequency() {
        return trainingFrequency;
    }

    public String getJoinCode() {
        return joinCode;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }
}
