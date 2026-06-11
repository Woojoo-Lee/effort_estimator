package com.company.effort.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class AuditJson {

  private static final String REDACTED = "[REDACTED]";
  private static final String CIRCULAR = "[Circular]";

  private final ObjectMapper objectMapper;

  public AuditJson(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public String toJsonString(Object value) {
    if (value == null) {
      return null;
    }

    try {
      return objectMapper.writeValueAsString(sanitize(value, new IdentityHashMap<>()));
    } catch (JsonProcessingException | IllegalArgumentException error) {
      return fallbackJson(error);
    }
  }

  private Object sanitize(Object value, IdentityHashMap<Object, Boolean> seen) {
    if (value == null
        || value instanceof String
        || value instanceof Number
        || value instanceof Boolean) {
      return value;
    }

    if (value instanceof Throwable throwable) {
      Map<String, Object> sanitized = new LinkedHashMap<>();
      sanitized.put("error_class", throwable.getClass().getName());
      sanitized.put("message", throwable.getMessage());
      return sanitized;
    }

    if (seen.containsKey(value)) {
      return CIRCULAR;
    }

    if (value instanceof Map<?, ?> map) {
      seen.put(value, Boolean.TRUE);
      Map<String, Object> sanitized = new LinkedHashMap<>();
      for (Map.Entry<?, ?> entry : map.entrySet()) {
        String key = String.valueOf(entry.getKey());
        sanitized.put(
            key,
            shouldRedact(key) ? REDACTED : sanitize(entry.getValue(), seen)
        );
      }
      seen.remove(value);
      return sanitized;
    }

    if (value instanceof Iterable<?> iterable) {
      seen.put(value, Boolean.TRUE);
      List<Object> sanitized = new ArrayList<>();
      for (Object item : iterable) {
        sanitized.add(sanitize(item, seen));
      }
      seen.remove(value);
      return sanitized;
    }

    if (value.getClass().isArray()) {
      seen.put(value, Boolean.TRUE);
      int length = Array.getLength(value);
      List<Object> sanitized = new ArrayList<>(length);
      for (int index = 0; index < length; index += 1) {
        sanitized.add(sanitize(Array.get(value, index), seen));
      }
      seen.remove(value);
      return sanitized;
    }

    return value;
  }

  private boolean shouldRedact(String key) {
    String normalized = key == null
        ? ""
        : key.trim().toLowerCase().replace('-', '_');

    return normalized.contains("password")
        || normalized.contains("token")
        || normalized.contains("secret")
        || normalized.equals("authorization")
        || normalized.equals("key")
        || normalized.endsWith("_key")
        || normalized.equals("access_token")
        || normalized.equals("refresh_token");
  }

  private String fallbackJson(Exception error) {
    Map<String, Object> fallback = new LinkedHashMap<>();
    fallback.put("serialization_error", true);
    fallback.put("error_class", error.getClass().getName());
    fallback.put("message", error.getMessage());

    try {
      return objectMapper.writeValueAsString(fallback);
    } catch (JsonProcessingException ignored) {
      return "{\"serialization_error\":true}";
    }
  }
}
