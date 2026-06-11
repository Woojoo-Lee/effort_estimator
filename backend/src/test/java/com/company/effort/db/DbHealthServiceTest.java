package com.company.effort.db;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class DbHealthServiceTest {

  @Test
  void returnsDisabledWhenDbIsDisabled() {
    DbHealthService service = new DbHealthService(false, "SELECT 1", (JdbcTemplate) null);

    Map<String, String> result = service.check();

    assertThat(result).containsEntry("status", "DISABLED");
  }

  @Test
  void returnsDisabledWhenJdbcTemplateIsMissing() {
    DbHealthService service = new DbHealthService(true, "SELECT 1", (JdbcTemplate) null);

    Map<String, String> result = service.check();

    assertThat(result).containsEntry("status", "DISABLED");
  }

  @Test
  void returnsUpWhenValidationQuerySucceeds() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).thenReturn(1);
    DbHealthService service = new DbHealthService(true, "SELECT 1", jdbcTemplate);

    Map<String, String> result = service.check();

    assertThat(result).containsEntry("status", "UP");
    verify(jdbcTemplate).queryForObject("SELECT 1", Integer.class);
  }

  @Test
  void returnsDownWhenValidationQueryFails() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.queryForObject("SELECT 1", Integer.class))
        .thenThrow(new IllegalStateException("password=secret failed"));
    DbHealthService service = new DbHealthService(true, "SELECT 1", jdbcTemplate);

    Map<String, String> result = service.check();

    assertThat(result).containsEntry("status", "DOWN");
    assertThat(result.get("error")).doesNotContain("secret");
    assertThat(result.get("error")).contains("password=[REDACTED]");
  }
}
