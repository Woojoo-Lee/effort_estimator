package com.company.effort.web.controller;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import com.company.effort.web.exception.GlobalExceptionHandler;
import com.company.effort.web.filter.RequestIdFilter;

@WebMvcTest(HealthController.class)
@Import({RequestIdFilter.class, GlobalExceptionHandler.class})
class HealthControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void healthReturnsOkWrapper() throws Exception {
    mockMvc.perform(get("/api/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ok").value(true))
        .andExpect(jsonPath("$.data.status").value("UP"))
        .andExpect(jsonPath("$.meta.request_id").value(not(blankOrNullString())));
  }

  @Test
  void healthPassesThroughRequestIdHeader() throws Exception {
    mockMvc.perform(get("/api/health").header("X-Request-Id", "request-123"))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Request-Id", "request-123"))
        .andExpect(jsonPath("$.meta.request_id").value("request-123"));
  }

  @Test
  void healthGeneratesRequestIdHeader() throws Exception {
    mockMvc.perform(get("/api/health"))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Request-Id", not(blankOrNullString())))
        .andExpect(jsonPath("$.meta.request_id").value(not(blankOrNullString())));
  }
}
