package com.company.effort.db;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class DbHealthService {

  private static final Pattern PASSWORD_PATTERN =
      Pattern.compile("(?i)(password\\s*[=:]\\s*)[^\\s;]+");

  private final boolean dbEnabled;
  private final String validationQuery;
  private final JdbcTemplate jdbcTemplate;

  @Autowired
  public DbHealthService(
      @Value("${app.db.enabled:false}") boolean dbEnabled,
      @Value("${app.db.validation-query:SELECT 1}") String validationQuery,
      ObjectProvider<JdbcTemplate> jdbcTemplateProvider
  ) {
    this(dbEnabled, validationQuery, jdbcTemplateProvider.getIfAvailable());
  }

  DbHealthService(boolean dbEnabled, String validationQuery, JdbcTemplate jdbcTemplate) {
    this.dbEnabled = dbEnabled;
    this.validationQuery = StringUtils.hasText(validationQuery)
        ? validationQuery
        : "SELECT 1";
    this.jdbcTemplate = jdbcTemplate;
  }

  public Map<String, String> check() {
    if (!dbEnabled || jdbcTemplate == null) {
      return Map.of("status", "DISABLED");
    }

    try {
      jdbcTemplate.queryForObject(validationQuery, Integer.class);
      return Map.of("status", "UP");
    } catch (Exception error) {
      Map<String, String> result = new LinkedHashMap<>();
      result.put("status", "DOWN");
      result.put("error", sanitizeErrorMessage(error.getMessage()));
      return result;
    }
  }

  private String sanitizeErrorMessage(String message) {
    if (!StringUtils.hasText(message)) {
      return "Database health check failed.";
    }

    return PASSWORD_PATTERN.matcher(message).replaceAll("$1[REDACTED]");
  }
}
