package com.coachpulse.exception;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GlobalExceptionHandlerTests.TestController.class)
@Import({ GlobalExceptionHandlerTests.TestController.class, GlobalExceptionHandler.class })
class GlobalExceptionHandlerTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void notFoundReturns404() throws Exception {
		mockMvc.perform(get("/test/missing/42"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.status").value(404))
			.andExpect(jsonPath("$.detail").value("Coach with id 42 was not found"))
			.andExpect(jsonPath("$.timestamp").exists());
	}

	@Test
	void invalidBodyReturns400WithFieldErrors() throws Exception {
		mockMvc.perform(post("/test/coaches").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value("Validation failed"))
			.andExpect(jsonPath("$.errors.name").value("name is required"));
	}

	@Test
	void malformedJsonReturns400() throws Exception {
		mockMvc.perform(post("/test/coaches").contentType(MediaType.APPLICATION_JSON).content("{not json"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.status").value(400))
			.andExpect(jsonPath("$.timestamp").exists());
	}

	@Test
	void unexpectedErrorReturns500WithoutLeakingDetails() throws Exception {
		mockMvc.perform(get("/test/boom"))
			.andExpect(status().isInternalServerError())
			.andExpect(jsonPath("$.detail").value("An unexpected error occurred"));
	}

	record CoachRequest(@NotBlank(message = "name is required") String name) {
	}

	@RestController
	static class TestController {

		@GetMapping("/test/missing/{id}")
		String missing(@PathVariable Long id) {
			throw new ResourceNotFoundException("Coach", id);
		}

		@PostMapping("/test/coaches")
		String create(@Valid @RequestBody CoachRequest request) {
			return request.name();
		}

		@GetMapping("/test/boom")
		String boom() {
			throw new IllegalStateException("secret internal detail");
		}

	}

}
