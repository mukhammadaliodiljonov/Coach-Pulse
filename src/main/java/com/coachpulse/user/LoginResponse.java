package com.coachpulse.user;

public record LoginResponse(String accessToken, String tokenType, long expiresIn) {
}
