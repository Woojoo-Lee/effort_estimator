package com.company.effort.audit;

import org.springframework.util.StringUtils;

public record AuditCommand(
    String eventType,
    String eventResult,
    String targetType,
    String targetId,
    String projectId,
    Object beforeJson,
    Object afterJson,
    Object metadataJson,
    String requestId,
    String ip,
    String userAgent
) {

  public AuditCommand {
    eventType = trimToNull(eventType);
    eventResult = AuditEventResult.normalize(eventResult);
    targetType = trimToNull(targetType);
    targetId = trimToNull(targetId);
    projectId = trimToNull(projectId);
    requestId = trimToNull(requestId);
    ip = trimToNull(ip);
    userAgent = trimToNull(userAgent);
  }

  public static Builder builder() {
    return new Builder();
  }

  public AuditCommand withEventResult(String nextEventResult) {
    return new AuditCommand(
        eventType,
        nextEventResult,
        targetType,
        targetId,
        projectId,
        beforeJson,
        afterJson,
        metadataJson,
        requestId,
        ip,
        userAgent
    );
  }

  private static String trimToNull(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }

    return value.trim();
  }

  public static final class Builder {

    private String eventType;
    private String eventResult;
    private String targetType;
    private String targetId;
    private String projectId;
    private Object beforeJson;
    private Object afterJson;
    private Object metadataJson;
    private String requestId;
    private String ip;
    private String userAgent;

    public Builder eventType(String eventType) {
      this.eventType = eventType;
      return this;
    }

    public Builder eventResult(String eventResult) {
      this.eventResult = eventResult;
      return this;
    }

    public Builder targetType(String targetType) {
      this.targetType = targetType;
      return this;
    }

    public Builder targetId(String targetId) {
      this.targetId = targetId;
      return this;
    }

    public Builder projectId(String projectId) {
      this.projectId = projectId;
      return this;
    }

    public Builder beforeJson(Object beforeJson) {
      this.beforeJson = beforeJson;
      return this;
    }

    public Builder afterJson(Object afterJson) {
      this.afterJson = afterJson;
      return this;
    }

    public Builder metadataJson(Object metadataJson) {
      this.metadataJson = metadataJson;
      return this;
    }

    public Builder requestId(String requestId) {
      this.requestId = requestId;
      return this;
    }

    public Builder ip(String ip) {
      this.ip = ip;
      return this;
    }

    public Builder userAgent(String userAgent) {
      this.userAgent = userAgent;
      return this;
    }

    public AuditCommand build() {
      return new AuditCommand(
          eventType,
          eventResult,
          targetType,
          targetId,
          projectId,
          beforeJson,
          afterJson,
          metadataJson,
          requestId,
          ip,
          userAgent
      );
    }
  }
}
