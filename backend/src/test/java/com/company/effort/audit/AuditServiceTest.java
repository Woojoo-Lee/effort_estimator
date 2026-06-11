package com.company.effort.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.company.effort.security.CurrentUser;
import com.company.effort.security.CurrentUserProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;

class AuditServiceTest {

  @Test
  void recordSuccessSetsEventResultSuccess() {
    AuditRepository repository = returningRepository();
    AuditService service = auditService(repository, currentUser("user-1", "user@example.com"));

    AuditWriteResult result = service.recordSuccess(baseCommand().eventResult("failure").build());

    assertThat(result.ok()).isTrue();
    assertThat(result.record().eventResult()).isEqualTo(AuditEventResult.SUCCESS);
  }

  @Test
  void recordFailureSetsEventResultFailure() {
    AuditRepository repository = returningRepository();
    AuditService service = auditService(repository, currentUser("user-1", "user@example.com"));

    AuditWriteResult result = service.recordFailure(baseCommand().build());

    assertThat(result.ok()).isTrue();
    assertThat(result.record().eventResult()).isEqualTo(AuditEventResult.FAILURE);
  }

  @Test
  void actorInfoComesFromCurrentUserProvider() {
    AuditRepository repository = returningRepository();
    AuditService service = auditService(repository, currentUser("actor-1", "actor@example.com"));

    AuditWriteResult result = service.recordSuccess(baseCommand().build());

    assertThat(result.record().actorUserId()).isEqualTo("actor-1");
    assertThat(result.record().actorEmail()).isEqualTo("actor@example.com");
  }

  @Test
  void missingEventTypeCausesValidationError() {
    AuditService service = auditService(returningRepository(), currentUser("user-1", "u@example.com"));

    assertThatThrownBy(() -> service.recordSuccess(
        AuditCommand.builder()
            .targetType(AuditTargetType.STANDARD_EFFORT)
            .build()
    ))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("event_type");
  }

  @Test
  void missingTargetTypeCausesValidationError() {
    AuditService service = auditService(returningRepository(), currentUser("user-1", "u@example.com"));

    assertThatThrownBy(() -> service.recordSuccess(
        AuditCommand.builder()
            .eventType(AuditEventType.STANDARD_EFFORT_SOLUTION_TOGGLE)
            .build()
    ))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("target_type");
  }

  @Test
  void repositoryMissingCausesAuditUnavailableForStrictRecord() {
    AuditService service = auditService(null, currentUser("user-1", "u@example.com"));

    assertThatThrownBy(() -> service.recordSuccess(baseCommand().build()))
        .isInstanceOf(AuditUnavailableException.class)
        .hasMessageContaining("Audit repository is not available");
  }

  @Test
  void recordBestEffortCatchesRepositoryFailure() {
    AuditRepository repository = mock(AuditRepository.class);
    when(repository.insert(any())).thenThrow(new IllegalStateException("db down"));
    AuditService service = auditService(repository, currentUser("user-1", "u@example.com"));

    AuditWriteResult result = service.recordBestEffort(baseCommand().build());

    assertThat(result.ok()).isFalse();
    assertThat(result.errorMessage()).isEqualTo("db down");
    assertThat(result.exceptionClass()).isEqualTo(IllegalStateException.class.getName());
  }

  @Test
  void projectIdNumericStringIsPreserved() {
    AuditRepository repository = returningRepository();
    AuditService service = auditService(repository, currentUser("user-1", "u@example.com"));

    AuditWriteResult result = service.recordSuccess(
        baseCommand().projectId("9007199254740993").build()
    );

    assertThat(result.record().projectId()).isEqualTo("9007199254740993");
  }

  @Test
  void metadataUnitIsNotConverted() {
    AuditRepository repository = returningRepository();
    AuditService service = auditService(repository, currentUser("user-1", "u@example.com"));

    AuditWriteResult result = service.recordSuccess(
        baseCommand()
            .metadataJson(Map.of("unit", "M/M", "actual_effort_mm", 1.5))
            .build()
    );

    assertThat(result.record().metadataJsonString()).contains("\"unit\":\"M/M\"");
    assertThat(result.record().metadataJsonString()).contains("\"actual_effort_mm\":1.5");
  }

  @Test
  void roleOnlyLogicIsUnrelatedAndNoPermissionCheckRunsInsideAuditService() {
    CurrentUser roleOnlyUser = new CurrentUser(
        "system-admin-1",
        "admin@example.com",
        "Admin",
        null,
        List.of("system_admin"),
        List.of(),
        true,
        true
    );
    AuditRepository repository = returningRepository();
    AuditService service = auditService(repository, roleOnlyUser);

    AuditWriteResult result = service.recordSuccess(baseCommand().build());

    assertThat(result.ok()).isTrue();
    assertThat(result.record().actorUserId()).isEqualTo("system-admin-1");
  }

  private static AuditCommand.Builder baseCommand() {
    return AuditCommand.builder()
        .eventType(AuditEventType.STANDARD_EFFORT_SOLUTION_TOGGLE)
        .targetType(AuditTargetType.STANDARD_EFFORT)
        .targetId("target-1")
        .projectId("42")
        .requestId("req-1");
  }

  private static CurrentUser currentUser(String userId, String email) {
    return new CurrentUser(
        userId,
        email,
        "User",
        null,
        List.of("viewer"),
        List.of("route.estimator.read"),
        true,
        true
    );
  }

  private static AuditRepository returningRepository() {
    AuditRepository repository = mock(AuditRepository.class);
    when(repository.insert(any())).thenAnswer(invocation -> invocation.getArgument(0));
    return repository;
  }

  @SuppressWarnings("unchecked")
  private static AuditService auditService(AuditRepository repository, CurrentUser currentUser) {
    ObjectProvider<AuditRepository> provider = mock(ObjectProvider.class);
    when(provider.getIfAvailable()).thenReturn(repository);
    CurrentUserProvider currentUserProvider = mock(CurrentUserProvider.class);
    when(currentUserProvider.getCurrentUser()).thenReturn(currentUser);
    return new AuditService(
        provider,
        currentUserProvider,
        new AuditJson(new ObjectMapper())
    );
  }
}
