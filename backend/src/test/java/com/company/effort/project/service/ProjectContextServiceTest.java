package com.company.effort.project.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.company.effort.project.dto.ProjectSummaryDto;
import com.company.effort.project.repository.ProjectContextRepository;
import com.company.effort.security.ProjectAccessContext;
import com.company.effort.web.exception.NotFoundException;
import com.company.effort.web.exception.ServiceUnavailableException;
import com.company.effort.web.exception.ValidationException;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

class ProjectContextServiceTest {

  @Test
  void loadProjectAccessContextPreservesProjectIdAndMapsSummary() {
    ProjectContextRepository repository = repository(
        new ProjectSummaryDto(
            "42", "Project A", "owner-1", "dept-1", "active", null, List.of()
        ),
        List.of("user-1", "user-2")
    );
    ProjectContextService service = new ProjectContextService(provider(repository));

    ProjectAccessContext context = service.loadProjectAccessContext("42");

    assertThat(context.projectId()).isEqualTo("42");
    assertThat(context.ownerUserId()).isEqualTo("owner-1");
    assertThat(context.departmentId()).isEqualTo("dept-1");
    assertThat(context.assignedUserIds()).containsExactly("user-1", "user-2");
    assertThat(context.status()).isEqualTo("active");
    assertThat(context.archivedAt()).isNull();
  }

  @Test
  void loadProjectSummaryKeepsNumericStringAsString() {
    ProjectContextRepository repository = repository(
        new ProjectSummaryDto(
            "00042", "Project A", null, null, "active", null, List.of()
        ),
        List.of()
    );
    ProjectContextService service = new ProjectContextService(provider(repository));

    ProjectSummaryDto summary = service.loadProjectSummary("00042");

    assertThat(summary.projectId()).isEqualTo("00042");
    verify(repository).findProjectSummary("00042");
    verify(repository).findAssignedUserIds("00042");
  }

  @Test
  void loadProjectSummaryAttachesAssignedUserIds() {
    ProjectContextRepository repository = repository(
        new ProjectSummaryDto(
            "42", "Project A", null, null, "active", null, List.of()
        ),
        List.of("assigned-1")
    );
    ProjectContextService service = new ProjectContextService(provider(repository));

    ProjectSummaryDto summary = service.loadProjectSummary("42");

    assertThat(summary.assignedUserIds()).containsExactly("assigned-1");
  }

  @Test
  void nullProjectIdThrowsValidationException() {
    ProjectContextService service = new ProjectContextService(provider(mockRepository()));

    assertThatThrownBy(() -> service.loadProjectAccessContext(null))
        .isInstanceOf(ValidationException.class);
  }

  @Test
  void blankProjectIdThrowsValidationException() {
    ProjectContextService service = new ProjectContextService(provider(mockRepository()));

    assertThatThrownBy(() -> service.loadProjectAccessContext(" "))
        .isInstanceOf(ValidationException.class);
  }

  @Test
  void nonNumericProjectIdThrowsValidationException() {
    ProjectContextService service = new ProjectContextService(provider(mockRepository()));

    assertThatThrownBy(() -> service.loadProjectAccessContext("project-42"))
        .isInstanceOf(ValidationException.class);
  }

  @Test
  void repositoryMissingThrowsServiceUnavailableException() {
    ProjectContextService service = new ProjectContextService(provider(null));

    assertThatThrownBy(() -> service.loadProjectAccessContext("42"))
        .isInstanceOf(ServiceUnavailableException.class);
  }

  @Test
  void projectNotFoundThrowsNotFoundException() {
    ProjectContextRepository repository = mockRepository();
    when(repository.findProjectSummary("42")).thenReturn(Optional.empty());
    ProjectContextService service = new ProjectContextService(provider(repository));

    assertThatThrownBy(() -> service.loadProjectAccessContext("42"))
        .isInstanceOf(NotFoundException.class);
  }

  @Test
  void archivedStatusIsPassedThrough() {
    ProjectContextRepository repository = repository(
        new ProjectSummaryDto(
            "42", "Project A", "owner-1", "dept-1", "archived", null, List.of()
        ),
        List.of()
    );
    ProjectContextService service = new ProjectContextService(provider(repository));

    ProjectAccessContext context = service.loadProjectAccessContext("42");

    assertThat(context.status()).isEqualTo("archived");
    assertThat(context.isArchived()).isTrue();
  }

  @Test
  void archivedAtIsPassedThrough() {
    ProjectContextRepository repository = repository(
        new ProjectSummaryDto(
            "42", "Project A", "owner-1", "dept-1",
            "active", "2026-06-07T00:00:00Z", List.of()
        ),
        List.of()
    );
    ProjectContextService service = new ProjectContextService(provider(repository));

    ProjectAccessContext context = service.loadProjectAccessContext("42");

    assertThat(context.archivedAt()).isEqualTo("2026-06-07T00:00:00Z");
    assertThat(context.isArchived()).isTrue();
  }

  private static ProjectContextRepository repository(
      ProjectSummaryDto summary,
      List<String> assignedUserIds
  ) {
    ProjectContextRepository repository = mockRepository();
    when(repository.findProjectSummary(summary.projectId())).thenReturn(Optional.of(summary));
    when(repository.findAssignedUserIds(summary.projectId())).thenReturn(assignedUserIds);
    return repository;
  }

  private static ProjectContextRepository mockRepository() {
    return mock(ProjectContextRepository.class);
  }

  @SuppressWarnings("unchecked")
  private static ObjectProvider<ProjectContextRepository> provider(
      ProjectContextRepository repository
  ) {
    ObjectProvider<ProjectContextRepository> provider = mock(ObjectProvider.class);
    when(provider.getIfAvailable()).thenReturn(repository);
    return provider;
  }
}
