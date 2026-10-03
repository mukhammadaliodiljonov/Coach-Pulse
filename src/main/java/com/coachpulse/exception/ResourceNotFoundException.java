package com.coachpulse.exception;

public class ResourceNotFoundException extends RuntimeException {

	public ResourceNotFoundException(String message) {
		super(message);
	}

	public ResourceNotFoundException(String resource, Object id) {
		super(resource + " with id " + id + " was not found");
	}

}
