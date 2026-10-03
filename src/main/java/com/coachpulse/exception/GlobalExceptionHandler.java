package com.coachpulse.exception;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Turns exceptions thrown from controllers into RFC 9457 "problem detail" JSON responses.
 * Standard Spring MVC errors (bad JSON, wrong HTTP method, missing parameters, ...) are
 * handled by {@link ResponseEntityExceptionHandler}; the methods below cover the rest.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(ResourceNotFoundException.class)
	public ProblemDetail handleNotFound(ResourceNotFoundException ex) {
		return problem(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler(BadRequestException.class)
	public ProblemDetail handleBadRequest(BadRequestException ex) {
		return problem(HttpStatus.BAD_REQUEST, ex.getMessage());
	}

	@ExceptionHandler(ConflictException.class)
	public ProblemDetail handleConflict(ConflictException ex) {
		return problem(HttpStatus.CONFLICT, ex.getMessage());
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex) {
		log.warn("Data integrity violation: {}", ex.getMostSpecificCause().getMessage());
		return problem(HttpStatus.CONFLICT, "The request conflicts with existing data");
	}

	@ExceptionHandler(ConstraintViolationException.class)
	public ProblemDetail handleConstraintViolation(ConstraintViolationException ex) {
		Map<String, String> errors = new LinkedHashMap<>();
		ex.getConstraintViolations().forEach(v -> errors.put(v.getPropertyPath().toString(), v.getMessage()));
		ProblemDetail body = problem(HttpStatus.BAD_REQUEST, "Validation failed");
		body.setProperty("errors", errors);
		return body;
	}

	@ExceptionHandler(Exception.class)
	public ProblemDetail handleUnexpected(Exception ex) {
		log.error("Unhandled exception", ex);
		return problem(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
	}

	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		Map<String, String> errors = new LinkedHashMap<>();
		for (FieldError error : ex.getBindingResult().getFieldErrors()) {
			errors.putIfAbsent(error.getField(), error.getDefaultMessage());
		}
		ProblemDetail body = problem(HttpStatus.BAD_REQUEST, "Validation failed");
		body.setProperty("errors", errors);
		return ResponseEntity.badRequest().body(body);
	}

	@Override
	protected ResponseEntity<Object> createResponseEntity(Object body, HttpHeaders headers,
			HttpStatusCode statusCode, WebRequest request) {
		// Give Spring's built-in error responses the same timestamp as ours
		if (body instanceof ProblemDetail problemDetail
				&& (problemDetail.getProperties() == null || !problemDetail.getProperties().containsKey("timestamp"))) {
			problemDetail.setProperty("timestamp", Instant.now());
		}
		return super.createResponseEntity(body, headers, statusCode, request);
	}

	private static ProblemDetail problem(HttpStatus status, String detail) {
		ProblemDetail body = ProblemDetail.forStatusAndDetail(status, detail);
		body.setProperty("timestamp", Instant.now());
		return body;
	}

}
