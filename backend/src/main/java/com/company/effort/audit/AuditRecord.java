package com.company.effort.audit;

public record AuditRecord(
    String auditLogId,
    String createdAt,
    String actorUserId,
    String actorEmail,
    String eventType,
    String eventResult,
    String targetType,
    String targetId,
    String projectId,
    String beforeJsonString,
    String afterJsonString,
    String metadataJsonString,
    String requestId,
    String ip,
    String userAgent
) {

  public AuditRecord withDatabaseFields(String nextAuditLogId, String nextCreatedAt) {
    return new AuditRecord(
        nextAuditLogId,
        nextCreatedAt,
        actorUserId,
        actorEmail,
        eventType,
        eventResult,
        targetType,
        targetId,
        projectId,
        beforeJsonString,
        afterJsonString,
        metadataJsonString,
        requestId,
        ip,
        userAgent
    );
  }
}
