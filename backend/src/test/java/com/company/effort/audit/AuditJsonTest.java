package com.company.effort.audit;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AuditJsonTest {

  private final AuditJson auditJson = new AuditJson(new ObjectMapper());

  @Test
  void mapSerializesToJson() {
    String json = auditJson.toJsonString(new LinkedHashMap<>(Map.of("event", "saved")));

    assertThat(json).contains("\"event\":\"saved\"");
  }

  @Test
  void nullReturnsNull() {
    assertThat(auditJson.toJsonString(null)).isNull();
  }

  @Test
  void secretFieldsAreRedacted() {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("password", "p1");
    value.put("token", "t1");
    value.put("secret", "s1");
    value.put("authorization", "Bearer abc");
    value.put("access_token", "a1");
    value.put("refresh_token", "r1");
    value.put("api_key", "k1");

    String json = auditJson.toJsonString(value);

    assertThat(json).contains("\"password\":\"[REDACTED]\"");
    assertThat(json).contains("\"token\":\"[REDACTED]\"");
    assertThat(json).contains("\"secret\":\"[REDACTED]\"");
    assertThat(json).contains("\"authorization\":\"[REDACTED]\"");
    assertThat(json).contains("\"access_token\":\"[REDACTED]\"");
    assertThat(json).contains("\"refresh_token\":\"[REDACTED]\"");
    assertThat(json).contains("\"api_key\":\"[REDACTED]\"");
    assertThat(json).doesNotContain("Bearer abc");
  }

  @Test
  void nestedSecretIsRedacted() {
    Map<String, Object> nested = new LinkedHashMap<>();
    nested.put("client_secret", "hidden");
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("nested", nested);

    String json = auditJson.toJsonString(value);

    assertThat(json).contains("\"client_secret\":\"[REDACTED]\"");
    assertThat(json).doesNotContain("hidden");
  }

  @Test
  void scalarValuesArePreserved() {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("count", 3);
    value.put("unit", "M/M");
    value.put("enabled", true);
    value.put("items", List.of("a", "b"));

    String json = auditJson.toJsonString(value);

    assertThat(json).contains("\"count\":3");
    assertThat(json).contains("\"unit\":\"M/M\"");
    assertThat(json).contains("\"enabled\":true");
    assertThat(json).contains("\"items\":[\"a\",\"b\"]");
  }

  @Test
  void circularReferenceIsHandledPredictably() {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("self", value);

    String json = auditJson.toJsonString(value);

    assertThat(json).contains("\"self\":\"[Circular]\"");
  }
}
