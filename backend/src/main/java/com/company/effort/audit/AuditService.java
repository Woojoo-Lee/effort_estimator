package com.company.effort.audit;

import com.company.effort.security.CurrentUser;
import com.company.effort.security.CurrentUserProvider;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AuditService {

  private static final String REPOSITORY_UNAVAILABLE_MESSAGE =
      "Audit repository is not available. Enable app.db.enabled=true and configure JdbcTemplate.";

  private final ObjectProvider<AuditRepository> auditRepositoryProvider;
  private final CurrentUserProvider currentUserProvider;
  private final AuditJson auditJson;

  public AuditService(
      ObjectProvider<AuditRepository> auditRepositoryProvider,
      CurrentUserProvider currentUserProvider,
      AuditJson auditJson
  ) {
    this.auditRepositoryProvider = auditRepositoryProvider;
    this.currentUserProvider = currentUserProvider;
    this.auditJson = auditJson;
  }

  public AuditWriteResult record(AuditCommand command) {
    AuditRecord record = buildRecord(validateCommand(command));
    AuditRepository repository = auditRepositoryProvider.getIfAvailable();

    if (repository == null) {
      throw new AuditUnavailableException(REPOSITORY_UNAVAILABLE_MESSAGE);
    }

    return AuditWriteResult.ok(repository.insert(record));
  }

  public AuditWriteResult recordSuccess(AuditCommand command) {
    return record(validateCommand(command).withEventResult(AuditEventResult.SUCCESS));
  }

  public AuditWriteResult recordFailure(AuditCommand command) {
    return record(validateCommand(command).withEventResult(AuditEventResult.FAILURE));
  }

  public AuditWriteResult recordBestEffort(AuditCommand command) {
    try {
      return record(command);
    } catch (Exception error) {
      return AuditWriteResult.failure(error);
    }
  }

  private AuditRecord buildRecord(AuditCommand command) {
    CurrentUser currentUser = currentUserProvider.getCurrentUser();
    String actorUserId = currentUser == null ? null : currentUser.userId();
    String actorEmail = currentUser == null ? null : currentUser.email();

    return new AuditRecord(
        null,
        null,
        actorUserId,
        actorEmail,
        command.eventType(),
        command.eventResult(),
        command.targetType(),
        command.targetId(),
        command.projectId(),
        auditJson.toJsonString(command.beforeJson()),
        auditJson.toJsonString(command.afterJson()),
        auditJson.toJsonString(command.metadataJson()),
        command.requestId(),
        command.ip(),
        command.userAgent()
    );
  }

  private AuditCommand validateCommand(AuditCommand command) {
    if (command == null) {
      throw new IllegalArgumentException("AuditCommand is required.");
    }

    if (!StringUtils.hasText(command.eventType())) {
      throw new IllegalArgumentException("event_type is required.");
    }

    if (!StringUtils.hasText(command.targetType())) {
      throw new IllegalArgumentException("target_type is required.");
    }

    return command;
  }
}
