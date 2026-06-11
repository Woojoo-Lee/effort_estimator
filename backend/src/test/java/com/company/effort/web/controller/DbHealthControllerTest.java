package com.company.effort.web.controller;

import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.company.effort.db.DbHealthService;
import com.company.effort.web.exception.GlobalExceptionHandler;
import com.company.effort.web.filter.RequestIdFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(DbHealthController.class)
@Import({RequestIdFilter.class, GlobalExceptionHandler.class, DbHealthService.class})
class DbHealthControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void dbHealthReturnsDisabledByDefault() throws Exception {
    mockMvc.perform(get("/api/internal/db-health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ok").value(true))
        .andExpect(jsonPath("$.data.status").value("DISABLED"))
        .andExpect(jsonPath("$.meta.request_id").value(not(blankOrNullString())));
  }

  @Test
  void dbHealthPassesThroughRequestIdHeader() throws Exception {
    mockMvc.perform(
            get("/api/internal/db-health").header("X-Request-Id", "db-request-123")
        )
        .andExpect(status().isOk())
        .andExpect(header().string("X-Request-Id", "db-request-123"))
        .andExpect(jsonPath("$.meta.request_id").value("db-request-123"));
  }

  @Test
  void dbHealthGeneratesRequestIdHeader() throws Exception {
    mockMvc.perform(get("/api/internal/db-health"))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Request-Id", not(blankOrNullString())))
        .andExpect(jsonPath("$.meta.request_id").value(not(blankOrNullString())));
  }
}
