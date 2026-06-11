package com.company.effort.standardeffort.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.company.effort.audit.AuditCommand;
import com.company.effort.audit.AuditEventType;
import com.company.effort.audit.AuditService;
import com.company.effort.audit.AuditUnavailableException;
import com.company.effort.project.service.ProjectContextService;
import com.company.effort.security.ProjectAccessAction;
import com.company.effort.security.ProjectAccessContext;
import com.company.effort.security.ProjectAccessDecision;
import com.company.effort.security.ProjectAccessDeniedException;
import com.company.effort.security.ProjectScopeService;
import com.company.effort.security.PermissionCodes;
import com.company.effort.standardeffort.dto.BaseEffortRowDto;
import com.company.effort.standardeffort.dto.CoefficientRowDto;
import com.company.effort.standardeffort.dto.ProjectItemSelectionDto;
import com.company.effort.standardeffort.dto.ProjectItemSelectionRequest;
import com.company.effort.standardeffort.dto.ProjectItemSelectionsResponse;
import com.company.effort.standardeffort.dto.ProjectSolutionSelectionDto;
import com.company.effort.standardeffort.dto.ProjectSolutionSelectionRequest;
import com.company.effort.standardeffort.dto.ProjectSolutionSelectionResponse;
import com.company.effort.standardeffort.dto.ProjectSolutionSelectionsResponse;
import com.company.effort.standardeffort.dto.SaveProjectItemSelectionsRequest;
import com.company.effort.standardeffort.dto.SaveProjectSolutionSelectionsRequest;
import com.company.effort.standardeffort.dto.SolutionDto;
import com.company.effort.standardeffort.dto.SolutionVariantDto;
import com.company.effort.standardeffort.dto.StandardEffortMetaResponse;
import com.company.effort.standardeffort.dto.StandardEffortProjectInputResponse;
import com.company.effort.standardeffort.dto.StandardItemRowDto;
import com.company.effort.standardeffort.dto.UpdateProjectActualEffortRequest;
import com.company.effort.standardeffort.repository.ProjectItemSelectionKey;
import com.company.effort.standardeffort.repository.StandardEffortRepository;
import com.company.effort.web.exception.NotFoundException;
import com.company.effort.web.exception.ServiceUnavailableException;
import com.company.effort.web.exception.ValidationException;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.PlatformTransactionManager;

class StandardEffortServiceTest {

  private AuditService auditService;

  @BeforeEach
  void setUp() {
    auditService = mock(AuditService.class);
  }

  @Test
  void getActiveMetaReturnsAllFiveArrays() {
    StandardEffortRepository repository = mock(StandardEffortRepository.class);
    when(repository.findActiveSolutions())
        .thenReturn(List.of(new SolutionDto("PBX", "PBX", 10, true)));
    when(repository.findActiveSolutionVariants())
        .thenReturn(List.of(new SolutionVariantDto(
            "variant-1", "PBX", "avaya", "Avaya", "PBX Avaya", 10, true
        )));
    when(repository.findActiveBaseEffortRows())
        .thenReturn(List.of(new BaseEffortRowDto(
            "base-1", "variant-1", "analysis", "Analysis",
            new BigDecimal("1.25"), 10, true
        )));
    when(repository.findActiveItemRows())
        .thenReturn(List.of(new StandardItemRowDto(
            "item-1", 100, "Channel", "Voice", "IVR", "Basic", 10, true
        )));
    when(repository.findActiveCoefficientRows())
        .thenReturn(List.of(new CoefficientRowDto(
            "item-1", "variant-1", new BigDecimal("1.75"), true
        )));
    StandardEffortService service = service(repository);

    StandardEffortMetaResponse response = service.getActiveMeta();

    assertThat(response.solutions()).hasSize(1);
    assertThat(response.solutionVariants()).hasSize(1);
    assertThat(response.baseEffortRows()).hasSize(1);
    assertThat(response.itemRows()).hasSize(1);
    assertThat(response.coefficientRows()).hasSize(1);
    verify(repository).findActiveSolutions();
    verify(repository).findActiveSolutionVariants();
    verify(repository).findActiveBaseEffortRows();
    verify(repository).findActiveItemRows();
    verify(repository).findActiveCoefficientRows();
  }

  @Test
  void getActiveMetaReturnsEmptyArrays() {
    StandardEffortRepository repository = mock(StandardEffortRepository.class);
    when(repository.findActiveSolutions()).thenReturn(List.of());
    when(repository.findActiveSolutionVariants()).thenReturn(List.of());
    when(repository.findActiveBaseEffortRows()).thenReturn(List.of());
    when(repository.findActiveItemRows()).thenReturn(List.of());
    when(repository.findActiveCoefficientRows()).thenReturn(List.of());
    StandardEffortService service = service(repository);

    StandardEffortMetaResponse response = service.getActiveMeta();

    assertThat(response.solutions()).isEmpty();
    assertThat(response.solutionVariants()).isEmpty();
    assertThat(response.baseEffortRows()).isEmpty();
    assertThat(response.itemRows()).isEmpty();
    assertThat(response.coefficientRows()).isEmpty();
  }

  @Test
  void getActiveMetaThrowsServiceUnavailableWhenRepositoryIsMissing() {
    StandardEffortService service = service(null);

    assertThatThrownBy(service::getActiveMeta)
        .isInstanceOf(ServiceUnavailableException.class);
  }

  @Test
  void getProjectInputCallsProjectContextAndScopeThenReturnsFullInput() {
    StandardEffortRepository repository = repositoryWithSampleData();
    ProjectContextService projectContextService = mock(ProjectContextService.class);
    ProjectScopeService projectScopeService = mock(ProjectScopeService.class);
    ProjectAccessContext context = context("42");
    when(projectContextService.loadProjectAccessContext("42")).thenReturn(context);
    StandardEffortService service =
        new StandardEffortService(
            provider(repository),
            projectContextService,
            projectScopeService,
            auditProvider(auditService),
            transactionProvider(null)
        );

    StandardEffortProjectInputResponse response = service.getProjectInput("42");

    verify(projectContextService).loadProjectAccessContext("42");
    verify(projectScopeService).requireRead(context);
    verify(repository).findActiveSolutions();
    verify(repository).findActiveSolutionVariants();
    verify(repository).findActiveBaseEffortRows();
    verify(repository).findActiveItemRows();
    verify(repository).findActiveCoefficientRows();
    verify(repository).findProjectSolutionSelections("42");
    verify(repository).findProjectItemSelections("42");
    assertThat(response.solutions()).hasSize(1);
    assertThat(response.solutionVariants()).hasSize(1);
    assertThat(response.baseEffortRows()).hasSize(1);
    assertThat(response.itemRows()).hasSize(1);
    assertThat(response.coefficientRows()).hasSize(1);
    assertThat(response.projectSolutionSelections()).hasSize(1);
    assertThat(response.projectSolutionSelections().get(0).actualEffortMm())
        .isEqualByComparingTo("3.50");
    assertThat(response.projectItemSelections()).hasSize(1);
    assertThat(response.projectItemSelections().get(0).checked()).isTrue();
  }

  @Test
  void getProjectInputReturnsEmptyProjectSelections() {
    StandardEffortRepository repository = repositoryWithSampleData();
    when(repository.findProjectSolutionSelections("42")).thenReturn(List.of());
    when(repository.findProjectItemSelections("42")).thenReturn(List.of());
    ProjectContextService projectContextService = mock(ProjectContextService.class);
    ProjectScopeService projectScopeService = mock(ProjectScopeService.class);
    when(projectContextService.loadProjectAccessContext("42")).thenReturn(context("42"));
    StandardEffortService service =
        new StandardEffortService(
            provider(repository),
            projectContextService,
            projectScopeService,
            auditProvider(auditService),
            transactionProvider(null)
        );

    StandardEffortProjectInputResponse response = service.getProjectInput("42");

    assertThat(response.projectSolutionSelections()).isEmpty();
    assertThat(response.projectItemSelections()).isEmpty();
  }

  @Test
  void getProjectInputPreservesNumericStringProjectIdFromContext() {
    StandardEffortRepository repository = repositoryWithSampleData();
    ProjectContextService projectContextService = mock(ProjectContextService.class);
    ProjectScopeService projectScopeService = mock(ProjectScopeService.class);
    ProjectAccessContext context = context("00042");
    when(projectContextService.loadProjectAccessContext("00042")).thenReturn(context);
    StandardEffortService service =
        new StandardEffortService(
            provider(repository),
            projectContextService,
            projectScopeService,
            auditProvider(auditService),
            transactionProvider(null)
        );

    service.getProjectInput("00042");

    verify(repository).findProjectSolutionSelections("00042");
    verify(repository).findProjectItemSelections("00042");
  }

  @Test
  void getProjectInputThrowsServiceUnavailableWhenRepositoryIsMissing() {
    ProjectContextService projectContextService = mock(ProjectContextService.class);
    ProjectScopeService projectScopeService = mock(ProjectScopeService.class);
    ProjectAccessContext context = context("42");
    when(projectContextService.loadProjectAccessContext("42")).thenReturn(context);
    StandardEffortService service =
        new StandardEffortService(
            provider(null),
            projectContextService,
            projectScopeService,
            auditProvider(auditService),
            transactionProvider(null)
        );

    assertThatThrownBy(() -> service.getProjectInput("42"))
        .isInstanceOf(ServiceUnavailableException.class);

    verify(projectScopeService).requireRead(context);
  }

  @Test
  void getProjectInputPropagatesProjectNotFoundAndDoesNotReadRepository() {
    StandardEffortRepository repository = mock(StandardEffortRepository.class);
    ProjectContextService projectContextService = mock(ProjectContextService.class);
    ProjectScopeService projectScopeService = mock(ProjectScopeService.class);
    when(projectContextService.loadProjectAccessContext("404"))
        .thenThrow(new NotFoundException("Project not found."));
    StandardEffortService service =
        new StandardEffortService(
            provider(repository),
            projectContextService,
            projectScopeService,
            auditProvider(auditService),
            transactionProvider(null)
        );

    assertThatThrownBy(() -> service.getProjectInput("404"))
        .isInstanceOf(NotFoundException.class);

    verifyNoInteractions(projectScopeService);
    verifyNoInteractions(repository);
  }

  @Test
  void getProjectInputPropagatesProjectScopeDeniedAndDoesNotReadRepository() {
    StandardEffortRepository repository = mock(StandardEffortRepository.class);
    ProjectContextService projectContextService = mock(ProjectContextService.class);
    ProjectScopeService projectScopeService = mock(ProjectScopeService.class);
    ProjectAccessContext context = context("42");
    when(projectContextService.loadProjectAccessContext("42")).thenReturn(context);
    org.mockito.Mockito.doThrow(new ProjectAccessDeniedException(ProjectAccessDecision.denied(
        ProjectAccessAction.READ,
        context,
        ProjectAccessDecision.DENIED_MISSING_PERMISSION,
        List.of(PermissionCodes.PROJECT_READ_ALL)
    ))).when(projectScopeService).requireRead(context);
    StandardEffortService service =
        new StandardEffortService(
            provider(repository),
            projectContextService,
            projectScopeService,
            auditProvider(auditService),
            transactionProvider(null)
        );

    assertThatThrownBy(() -> service.getProjectInput("42"))
        .isInstanceOf(ProjectAccessDeniedException.class);

    verifyNoInteractions(repository);
  }

  @Test
  void saveProjectSolutionSelectionsCallsProjectContextAndRequireWrite() {
    StandardEffortRepository repository = writeRepository();
    ProjectContextService projectContextService = mock(ProjectContextService.class);
    ProjectScopeService projectScopeService = mock(ProjectScopeService.class);
    ProjectAccessContext context = context("42");
    when(projectContextService.loadProjectAccessContext("42")).thenReturn(context);
    StandardEffortService service = service(
        repository,
        projectContextService,
        projectScopeService,
        auditService
    );

    service.saveProjectSolutionSelections("42", request("42", row("variant-1")), "req-1");

    verify(projectContextService).loadProjectAccessContext("42");
    verify(projectScopeService).requireWrite(context);
  }

  @Test
  void saveProjectSolutionSelectionsValidatesBodyPathProjectIdMismatch() {
    StandardEffortService service = service(writeRepository());

    assertThatThrownBy(() ->
        service.saveProjectSolutionSelections("42", request("43", row("variant-1")), "req-1")
    )
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("project_id");
  }

  @Test
  void saveProjectSolutionSelectionsNormalizesActualEffortAndEnabledDefaults() {
    StandardEffortRepository repository = writeRepository();
    StandardEffortService service = service(repository);
    ProjectSolutionSelectionRequest row = row("variant-1");
    row.setEnabled(null);
    row.setActualEffortMm("");

    ProjectSolutionSelectionsResponse response =
        service.saveProjectSolutionSelections("42", request("42", row), "req-1");

    ArgumentCaptor<List<ProjectSolutionSelectionDto>> rowsCaptor =
        ArgumentCaptor.forClass(List.class);
    verify(repository).upsertProjectSolutionSelections(
        org.mockito.ArgumentMatchers.eq("42"),
        rowsCaptor.capture()
    );
    ProjectSolutionSelectionDto normalizedRow = rowsCaptor.getValue().get(0);
    assertThat(normalizedRow.enabled()).isTrue();
    assertThat(normalizedRow.actualEffortMm()).isEqualByComparingTo("0");
    assertThat(response.projectSolutionSelections()).hasSize(1);
  }

  @Test
  void saveProjectSolutionSelectionsRejectsNegativeActualEffortMm() {
    ProjectSolutionSelectionRequest row = row("variant-1");
    row.setActualEffortMm("-0.1");
    StandardEffortService service = service(writeRepository());

    assertThatThrownBy(() ->
        service.saveProjectSolutionSelections("42", request("42", row), "req-1")
    )
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("actual_effort_mm");
  }

  @Test
  void saveProjectSolutionSelectionsRejectsActualEffortMd() {
    ProjectSolutionSelectionRequest row = row("variant-1");
    row.setUnknownField("actual_effort_md", 1);
    StandardEffortService service = service(writeRepository());

    assertThatThrownBy(() ->
        service.saveProjectSolutionSelections("42", request("42", row), "req-1")
    )
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("actual_effort_md");
  }

  @Test
  void saveProjectSolutionSelectionsRejectsDuplicateVariantIds() {
    StandardEffortService service = service(writeRepository());

    assertThatThrownBy(() -> service.saveProjectSolutionSelections(
        "42",
        request("42", row("variant-1"), row("variant-1")),
        "req-1"
    ))
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("duplicate");
  }

  @Test
  void saveProjectSolutionSelectionsRejectsInactiveOrUnknownVariant() {
    StandardEffortRepository repository = writeRepository();
    when(repository.activeSolutionVariantExists("variant-1")).thenReturn(false);
    StandardEffortService service = service(repository);

    assertThatThrownBy(() ->
        service.saveProjectSolutionSelections("42", request("42", row("variant-1")), "req-1")
    )
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("active solution variant");
  }

  @Test
  void saveProjectSolutionSelectionsReadsBeforeStateBeforeUpsert() {
    StandardEffortRepository repository = writeRepository();
    StandardEffortService service = service(repository);

    service.saveProjectSolutionSelections("42", request("42", row("variant-1")), "req-1");

    org.mockito.InOrder inOrder = org.mockito.Mockito.inOrder(repository);
    inOrder.verify(repository).activeSolutionVariantExists("variant-1");
    inOrder.verify(repository).findProjectSolutionSelectionsByVariantIds(
        org.mockito.ArgumentMatchers.eq("42"),
        org.mockito.ArgumentMatchers.eq(List.of("variant-1"))
    );
    inOrder.verify(repository).upsertProjectSolutionSelections(
        org.mockito.ArgumentMatchers.eq("42"),
        any()
    );
  }

  @Test
  void saveProjectSolutionSelectionsCallsAuditServiceRecordSuccess() {
    StandardEffortRepository repository = writeRepository();
    StandardEffortService service = service(repository);

    service.saveProjectSolutionSelections("42", request("42", row("variant-1")), "req-123");

    ArgumentCaptor<AuditCommand> commandCaptor = ArgumentCaptor.forClass(AuditCommand.class);
    verify(auditService).recordSuccess(commandCaptor.capture());
    AuditCommand command = commandCaptor.getValue();
    assertThat(command.eventType()).isEqualTo(AuditEventType.STANDARD_EFFORT_SOLUTION_TOGGLE);
    assertThat(command.projectId()).isEqualTo("42");
    assertThat(command.requestId()).isEqualTo("req-123");
    assertThat(command.metadataJson().toString()).contains("M/M");
    assertThat(command.beforeJson().toString()).contains("project_solution_selections");
    assertThat(command.afterJson().toString()).contains("project_solution_selections");
  }

  @Test
  void saveProjectSolutionSelectionsPropagatesAuditFailure() {
    doThrow(new AuditUnavailableException("audit unavailable"))
        .when(auditService).recordSuccess(any(AuditCommand.class));
    StandardEffortService service = service(writeRepository());

    assertThatThrownBy(() ->
        service.saveProjectSolutionSelections("42", request("42", row("variant-1")), "req-1")
    )
        .isInstanceOf(AuditUnavailableException.class);
  }

  @Test
  void saveProjectSolutionSelectionsPropagatesArchivedProjectDeniedFromRequireWrite() {
    StandardEffortRepository repository = writeRepository();
    ProjectContextService projectContextService = mock(ProjectContextService.class);
    ProjectScopeService projectScopeService = mock(ProjectScopeService.class);
    ProjectAccessContext context = new ProjectAccessContext(
        "42", "owner-user", "dept-1", List.of(), "archived", "2026-06-07T00:00:00Z"
    );
    when(projectContextService.loadProjectAccessContext("42")).thenReturn(context);
    doThrow(new ProjectAccessDeniedException(ProjectAccessDecision.denied(
        ProjectAccessAction.WRITE,
        context,
        ProjectAccessDecision.DENIED_ARCHIVED_PROJECT,
        List.of(PermissionCodes.PROJECT_WRITE_ALL)
    ))).when(projectScopeService).requireWrite(context);
    StandardEffortService service = service(
        repository,
        projectContextService,
        projectScopeService,
        auditService
    );

    assertThatThrownBy(() ->
        service.saveProjectSolutionSelections("42", request("42", row("variant-1")), "req-1")
    )
        .isInstanceOf(ProjectAccessDeniedException.class);

    verifyNoInteractions(repository);
  }

  @Test
  void saveProjectItemSelectionsCallsProjectContextAndRequireWrite() {
    StandardEffortRepository repository = writeRepository();
    ProjectContextService projectContextService = mock(ProjectContextService.class);
    ProjectScopeService projectScopeService = mock(ProjectScopeService.class);
    ProjectAccessContext context = context("42");
    when(projectContextService.loadProjectAccessContext("42")).thenReturn(context);
    StandardEffortService service = service(
        repository,
        projectContextService,
        projectScopeService,
        auditService
    );

    service.saveProjectItemSelections("42", itemRequest("42", itemRow("variant-1", "item-1")),
        "req-1");

    verify(projectContextService).loadProjectAccessContext("42");
    verify(projectScopeService).requireWrite(context);
  }

  @Test
  void saveProjectItemSelectionsNormalizesCheckedValues() {
    StandardEffortRepository repository = writeRepository();
    StandardEffortService service = service(repository);
    ProjectItemSelectionRequest trueRow = itemRow("variant-1", "item-1");
    trueRow.setChecked("Y");
    ProjectItemSelectionRequest falseRow = itemRow("variant-2", "item-2");
    falseRow.setChecked("");
    when(repository.activeSolutionVariantExists("variant-2")).thenReturn(true);
    when(repository.activeItemExists("item-2")).thenReturn(true);
    when(repository.activeCoefficientExists("item-2", "variant-2")).thenReturn(true);
    when(repository.upsertProjectItemSelections(
        org.mockito.ArgumentMatchers.eq("42"),
        any()
    )).thenReturn(List.of(
        new ProjectItemSelectionDto(
            "42", "variant-1", "item-1", true,
            "2026-06-07T00:00:00Z", "2026-06-07T01:00:00Z"
        ),
        new ProjectItemSelectionDto(
            "42", "variant-2", "item-2", false,
            "2026-06-07T00:00:00Z", "2026-06-07T01:00:00Z"
        )
    ));

    ProjectItemSelectionsResponse response =
        service.saveProjectItemSelections("42", itemRequest("42", trueRow, falseRow), "req-1");

    ArgumentCaptor<List<ProjectItemSelectionDto>> rowsCaptor =
        ArgumentCaptor.forClass(List.class);
    verify(repository).upsertProjectItemSelections(
        org.mockito.ArgumentMatchers.eq("42"),
        rowsCaptor.capture()
    );
    assertThat(rowsCaptor.getValue().get(0).checked()).isTrue();
    assertThat(rowsCaptor.getValue().get(1).checked()).isFalse();
    assertThat(response.projectItemSelections()).hasSize(2);
  }

  @Test
  void saveProjectItemSelectionsRejectsUnknownCheckedString() {
    ProjectItemSelectionRequest row = itemRow("variant-1", "item-1");
    row.setChecked("maybe");
    StandardEffortService service = service(writeRepository());

    assertThatThrownBy(() ->
        service.saveProjectItemSelections("42", itemRequest("42", row), "req-1")
    )
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("checked");
  }

  @Test
  void saveProjectItemSelectionsRejectsDuplicateCompositeKey() {
    StandardEffortService service = service(writeRepository());

    assertThatThrownBy(() -> service.saveProjectItemSelections(
        "42",
        itemRequest("42", itemRow("variant-1", "item-1"), itemRow("variant-1", "item-1")),
        "req-1"
    ))
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("duplicate");
  }

  @Test
  void saveProjectItemSelectionsRejectsEffortFields() {
    ProjectItemSelectionRequest row = itemRow("variant-1", "item-1");
    row.setUnknownField("actual_effort_mm", 1);
    StandardEffortService service = service(writeRepository());

    assertThatThrownBy(() ->
        service.saveProjectItemSelections("42", itemRequest("42", row), "req-1")
    )
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("actual_effort_mm");
  }

  @Test
  void saveProjectItemSelectionsRejectsInactiveOrUnknownItem() {
    StandardEffortRepository repository = writeRepository();
    when(repository.activeItemExists("item-1")).thenReturn(false);
    StandardEffortService service = service(repository);

    assertThatThrownBy(() ->
        service.saveProjectItemSelections(
            "42",
            itemRequest("42", itemRow("variant-1", "item-1")),
            "req-1"
        )
    )
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("active standard item");
  }

  @Test
  void saveProjectItemSelectionsRejectsMissingActiveCoefficient() {
    StandardEffortRepository repository = writeRepository();
    when(repository.activeCoefficientExists("item-1", "variant-1")).thenReturn(false);
    StandardEffortService service = service(repository);

    assertThatThrownBy(() ->
        service.saveProjectItemSelections(
            "42",
            itemRequest("42", itemRow("variant-1", "item-1")),
            "req-1"
        )
    )
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("active coefficient");
  }

  @Test
  void saveProjectItemSelectionsReadsBeforeStateBeforeUpsert() {
    StandardEffortRepository repository = writeRepository();
    StandardEffortService service = service(repository);

    service.saveProjectItemSelections(
        "42",
        itemRequest("42", itemRow("variant-1", "item-1")),
        "req-1"
    );

    org.mockito.InOrder inOrder = org.mockito.Mockito.inOrder(repository);
    inOrder.verify(repository).activeSolutionVariantExists("variant-1");
    inOrder.verify(repository).activeItemExists("item-1");
    inOrder.verify(repository).activeCoefficientExists("item-1", "variant-1");
    inOrder.verify(repository).findProjectItemSelectionsByKeys(
        org.mockito.ArgumentMatchers.eq("42"),
        org.mockito.ArgumentMatchers.eq(List.of(new ProjectItemSelectionKey("variant-1", "item-1")))
    );
    inOrder.verify(repository).upsertProjectItemSelections(
        org.mockito.ArgumentMatchers.eq("42"),
        any()
    );
  }

  @Test
  void saveProjectItemSelectionsCallsAuditServiceRecordSuccess() {
    StandardEffortRepository repository = writeRepository();
    StandardEffortService service = service(repository);

    service.saveProjectItemSelections(
        "42",
        itemRequest("42", itemRow("variant-1", "item-1")),
        "req-123"
    );

    ArgumentCaptor<AuditCommand> commandCaptor = ArgumentCaptor.forClass(AuditCommand.class);
    verify(auditService).recordSuccess(commandCaptor.capture());
    AuditCommand command = commandCaptor.getValue();
    assertThat(command.eventType()).isEqualTo(AuditEventType.STANDARD_EFFORT_ITEM_CHECK);
    assertThat(command.targetId()).isEqualTo("42:items");
    assertThat(command.projectId()).isEqualTo("42");
    assertThat(command.requestId()).isEqualTo("req-123");
    assertThat(command.metadataJson().toString()).contains("item_selection");
    assertThat(command.beforeJson().toString()).contains("project_item_selections");
    assertThat(command.afterJson().toString()).contains("project_item_selections");
  }

  @Test
  void saveProjectItemSelectionsPropagatesAuditFailure() {
    doThrow(new AuditUnavailableException("audit unavailable"))
        .when(auditService).recordSuccess(any(AuditCommand.class));
    StandardEffortService service = service(writeRepository());

    assertThatThrownBy(() ->
        service.saveProjectItemSelections(
            "42",
            itemRequest("42", itemRow("variant-1", "item-1")),
            "req-1"
        )
    )
        .isInstanceOf(AuditUnavailableException.class);
  }

  @Test
  void updateProjectActualEffortCallsProjectContextAndRequireWrite() {
    StandardEffortRepository repository = writeRepository();
    ProjectContextService projectContextService = mock(ProjectContextService.class);
    ProjectScopeService projectScopeService = mock(ProjectScopeService.class);
    ProjectAccessContext context = context("42");
    when(projectContextService.loadProjectAccessContext("42")).thenReturn(context);
    StandardEffortService service = service(
        repository,
        projectContextService,
        projectScopeService,
        auditService
    );

    service.updateProjectActualEffort("42", actualRequest("42", "variant-1", "2.50"), "req-1");

    verify(projectContextService).loadProjectAccessContext("42");
    verify(projectScopeService).requireWrite(context);
  }

  @Test
  void updateProjectActualEffortValidatesBodyPathProjectIdMismatch() {
    StandardEffortService service = service(writeRepository());

    assertThatThrownBy(() ->
        service.updateProjectActualEffort("42", actualRequest("43", "variant-1", "1"), "req-1")
    )
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("project_id");
  }

  @Test
  void updateProjectActualEffortNormalizesBlankActualEffortMmToZero() {
    StandardEffortRepository repository = writeRepository();
    StandardEffortService service = service(repository);

    ProjectSolutionSelectionResponse response =
        service.updateProjectActualEffort(
            "42",
            actualRequest("42", "variant-1", ""),
            "req-1"
        );

    verify(repository).updateProjectActualEffort(
        org.mockito.ArgumentMatchers.eq("42"),
        org.mockito.ArgumentMatchers.eq("variant-1"),
        org.mockito.ArgumentMatchers.eq(BigDecimal.ZERO)
    );
    assertThat(response.projectSolutionSelection().actualEffortMm()).isEqualByComparingTo("2.50");
  }

  @Test
  void updateProjectActualEffortRejectsNegativeActualEffortMm() {
    StandardEffortService service = service(writeRepository());

    assertThatThrownBy(() ->
        service.updateProjectActualEffort(
            "42",
            actualRequest("42", "variant-1", "-0.1"),
            "req-1"
        )
    )
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("actual_effort_mm");
  }

  @Test
  void updateProjectActualEffortRejectsForbiddenFields() {
    StandardEffortService service = service(writeRepository());
    List<String> fields = List.of(
        "actual_effort_md",
        "enabled",
        "effort_mm",
        "standard_effort_mm",
        "gap_mm"
    );

    for (String field : fields) {
      UpdateProjectActualEffortRequest request = actualRequest("42", "variant-1", "1");
      request.setUnknownField(field, 1);

      assertThatThrownBy(() ->
          service.updateProjectActualEffort("42", request, "req-1")
      )
          .isInstanceOf(ValidationException.class)
          .hasMessageContaining(field);
    }
  }

  @Test
  void updateProjectActualEffortRejectsInactiveOrUnknownVariant() {
    StandardEffortRepository repository = writeRepository();
    when(repository.activeSolutionVariantExists("variant-1")).thenReturn(false);
    StandardEffortService service = service(repository);

    assertThatThrownBy(() ->
        service.updateProjectActualEffort(
            "42",
            actualRequest("42", "variant-1", "1"),
            "req-1"
        )
    )
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("active solution variant");
  }

  @Test
  void updateProjectActualEffortReadsBeforeStateBeforeUpdate() {
    StandardEffortRepository repository = writeRepository();
    StandardEffortService service = service(repository);

    service.updateProjectActualEffort("42", actualRequest("42", "variant-1", "2.50"), "req-1");

    org.mockito.InOrder inOrder = org.mockito.Mockito.inOrder(repository);
    inOrder.verify(repository).activeSolutionVariantExists("variant-1");
    inOrder.verify(repository).findProjectSolutionSelectionsByVariantIds(
        org.mockito.ArgumentMatchers.eq("42"),
        org.mockito.ArgumentMatchers.eq(List.of("variant-1"))
    );
    inOrder.verify(repository).updateProjectActualEffort(
        org.mockito.ArgumentMatchers.eq("42"),
        org.mockito.ArgumentMatchers.eq("variant-1"),
        org.mockito.ArgumentMatchers.eq(new BigDecimal("2.50"))
    );
  }

  @Test
  void updateProjectActualEffortCallsAuditServiceRecordSuccess() {
    StandardEffortRepository repository = writeRepository();
    StandardEffortService service = service(repository);

    service.updateProjectActualEffort("42", actualRequest("42", "variant-1", "2.50"), "req-123");

    ArgumentCaptor<AuditCommand> commandCaptor = ArgumentCaptor.forClass(AuditCommand.class);
    verify(auditService).recordSuccess(commandCaptor.capture());
    AuditCommand command = commandCaptor.getValue();
    assertThat(command.eventType())
        .isEqualTo(AuditEventType.STANDARD_EFFORT_ACTUAL_EFFORT_UPDATE);
    assertThat(command.targetId()).isEqualTo("42:variant-1");
    assertThat(command.projectId()).isEqualTo("42");
    assertThat(command.requestId()).isEqualTo("req-123");
    assertThat(command.metadataJson().toString()).contains("actual_effort", "M/M");
    assertThat(command.beforeJson().toString()).contains("actual_effort_mm");
    assertThat(command.afterJson().toString()).contains("actual_effort_mm");
  }

  @Test
  void updateProjectActualEffortPropagatesAuditFailure() {
    doThrow(new AuditUnavailableException("audit unavailable"))
        .when(auditService).recordSuccess(any(AuditCommand.class));
    StandardEffortService service = service(writeRepository());

    assertThatThrownBy(() ->
        service.updateProjectActualEffort(
            "42",
            actualRequest("42", "variant-1", "2.50"),
            "req-1"
        )
    )
        .isInstanceOf(AuditUnavailableException.class);
  }

  @Test
  void updateProjectActualEffortPropagatesArchivedProjectDeniedFromRequireWrite() {
    StandardEffortRepository repository = writeRepository();
    ProjectContextService projectContextService = mock(ProjectContextService.class);
    ProjectScopeService projectScopeService = mock(ProjectScopeService.class);
    ProjectAccessContext context = new ProjectAccessContext(
        "42", "owner-user", "dept-1", List.of(), "archived", "2026-06-07T00:00:00Z"
    );
    when(projectContextService.loadProjectAccessContext("42")).thenReturn(context);
    doThrow(new ProjectAccessDeniedException(ProjectAccessDecision.denied(
        ProjectAccessAction.WRITE,
        context,
        ProjectAccessDecision.DENIED_ARCHIVED_PROJECT,
        List.of(PermissionCodes.PROJECT_WRITE_ALL)
    ))).when(projectScopeService).requireWrite(context);
    StandardEffortService service = service(
        repository,
        projectContextService,
        projectScopeService,
        auditService
    );

    assertThatThrownBy(() ->
        service.updateProjectActualEffort(
            "42",
            actualRequest("42", "variant-1", "2.50"),
            "req-1"
        )
    )
        .isInstanceOf(ProjectAccessDeniedException.class);

    verifyNoInteractions(repository);
  }

  @SuppressWarnings("unchecked")
  private static ObjectProvider<StandardEffortRepository> provider(
      StandardEffortRepository repository
  ) {
    ObjectProvider<StandardEffortRepository> provider = mock(ObjectProvider.class);
    when(provider.getIfAvailable()).thenReturn(repository);
    return provider;
  }

  private static StandardEffortService service(
      StandardEffortRepository repository,
      ProjectContextService projectContextService,
      ProjectScopeService projectScopeService,
      AuditService auditService
  ) {
    return new StandardEffortService(
        provider(repository),
        projectContextService,
        projectScopeService,
        auditProvider(auditService),
        transactionProvider(null)
    );
  }

  private StandardEffortService service(StandardEffortRepository repository) {
    ProjectContextService projectContextService = mock(ProjectContextService.class);
    ProjectScopeService projectScopeService = mock(ProjectScopeService.class);
    when(projectContextService.loadProjectAccessContext("42")).thenReturn(context("42"));
    return service(repository, projectContextService, projectScopeService, auditService);
  }

  private static ProjectAccessContext context(String projectId) {
    return new ProjectAccessContext(
        projectId,
        "owner-user",
        "dept-1",
        List.of("assigned-user"),
        "active",
        null
    );
  }

  private static StandardEffortRepository repositoryWithSampleData() {
    StandardEffortRepository repository = mock(StandardEffortRepository.class);
    when(repository.findActiveSolutions())
        .thenReturn(List.of(new SolutionDto("PBX", "PBX", 10, true)));
    when(repository.findActiveSolutionVariants())
        .thenReturn(List.of(new SolutionVariantDto(
            "variant-1", "PBX", "avaya", "Avaya", "PBX Avaya", 10, true
        )));
    when(repository.findActiveBaseEffortRows())
        .thenReturn(List.of(new BaseEffortRowDto(
            "base-1", "variant-1", "analysis", "Analysis",
            new BigDecimal("1.25"), 10, true
        )));
    when(repository.findActiveItemRows())
        .thenReturn(List.of(new StandardItemRowDto(
            "item-1", 100, "Channel", "Voice", "IVR", "Basic", 10, true
        )));
    when(repository.findActiveCoefficientRows())
        .thenReturn(List.of(new CoefficientRowDto(
            "item-1", "variant-1", new BigDecimal("1.75"), true
        )));
    when(repository.findProjectSolutionSelections("42"))
        .thenReturn(List.of(new ProjectSolutionSelectionDto(
            "42", "variant-1", true, new BigDecimal("3.50"),
            "2026-06-07T00:00:00Z", "2026-06-07T01:00:00Z"
        )));
    when(repository.findProjectSolutionSelections("00042"))
        .thenReturn(List.of(new ProjectSolutionSelectionDto(
            "00042", "variant-1", true, new BigDecimal("3.50"),
            "2026-06-07T00:00:00Z", "2026-06-07T01:00:00Z"
        )));
    when(repository.findProjectItemSelections("42"))
        .thenReturn(List.of(new ProjectItemSelectionDto(
            "42", "variant-1", "item-1", true,
            "2026-06-07T00:00:00Z", "2026-06-07T01:00:00Z"
        )));
    when(repository.findProjectItemSelections("00042"))
        .thenReturn(List.of(new ProjectItemSelectionDto(
            "00042", "variant-1", "item-1", true,
            "2026-06-07T00:00:00Z", "2026-06-07T01:00:00Z"
        )));
    return repository;
  }

  @SuppressWarnings("unchecked")
  private static ObjectProvider<AuditService> auditProvider(AuditService auditService) {
    ObjectProvider<AuditService> provider = mock(ObjectProvider.class);
    when(provider.getIfAvailable()).thenReturn(auditService);
    return provider;
  }

  @SuppressWarnings("unchecked")
  private static ObjectProvider<PlatformTransactionManager> transactionProvider(
      PlatformTransactionManager transactionManager
  ) {
    ObjectProvider<PlatformTransactionManager> provider = mock(ObjectProvider.class);
    when(provider.getIfAvailable()).thenReturn(transactionManager);
    return provider;
  }

  private static SaveProjectSolutionSelectionsRequest request(
      String projectId,
      ProjectSolutionSelectionRequest... rows
  ) {
    SaveProjectSolutionSelectionsRequest request = new SaveProjectSolutionSelectionsRequest();
    request.setProjectId(projectId);
    request.setSelections(List.of(rows));
    return request;
  }

  private static ProjectSolutionSelectionRequest row(String solutionVariantId) {
    ProjectSolutionSelectionRequest row = new ProjectSolutionSelectionRequest();
    row.setProjectId("42");
    row.setSolutionVariantId(solutionVariantId);
    row.setEnabled(true);
    row.setActualEffortMm(new BigDecimal("1.25"));
    return row;
  }

  private static SaveProjectItemSelectionsRequest itemRequest(
      String projectId,
      ProjectItemSelectionRequest... rows
  ) {
    SaveProjectItemSelectionsRequest request = new SaveProjectItemSelectionsRequest();
    request.setProjectId(projectId);
    request.setSelections(List.of(rows));
    return request;
  }

  private static ProjectItemSelectionRequest itemRow(String solutionVariantId, String itemId) {
    ProjectItemSelectionRequest row = new ProjectItemSelectionRequest();
    row.setProjectId("42");
    row.setSolutionVariantId(solutionVariantId);
    row.setItemId(itemId);
    row.setChecked(true);
    return row;
  }

  private static UpdateProjectActualEffortRequest actualRequest(
      String projectId,
      String solutionVariantId,
      Object actualEffortMm
  ) {
    UpdateProjectActualEffortRequest request = new UpdateProjectActualEffortRequest();
    request.setProjectId(projectId);
    request.setSolutionVariantId(solutionVariantId);
    request.setActualEffortMm(actualEffortMm);
    return request;
  }

  private static StandardEffortRepository writeRepository() {
    StandardEffortRepository repository = mock(StandardEffortRepository.class);
    when(repository.activeSolutionVariantExists("variant-1")).thenReturn(true);
    when(repository.activeItemExists("item-1")).thenReturn(true);
    when(repository.activeCoefficientExists("item-1", "variant-1")).thenReturn(true);
    when(repository.findProjectSolutionSelectionsByVariantIds("42", List.of("variant-1")))
        .thenReturn(List.of(new ProjectSolutionSelectionDto(
            "42", "variant-1", false, BigDecimal.ZERO,
            "2026-06-07T00:00:00Z", "2026-06-07T00:00:00Z"
        )));
    when(repository.findProjectItemSelectionsByKeys(
        "42",
        List.of(new ProjectItemSelectionKey("variant-1", "item-1"))
    )).thenReturn(List.of(new ProjectItemSelectionDto(
        "42", "variant-1", "item-1", false,
        "2026-06-07T00:00:00Z", "2026-06-07T00:00:00Z"
    )));
    when(repository.upsertProjectSolutionSelections(
        org.mockito.ArgumentMatchers.eq("42"),
        any()
    ))
        .thenReturn(List.of(new ProjectSolutionSelectionDto(
            "42", "variant-1", true, new BigDecimal("1.25"),
            "2026-06-07T00:00:00Z", "2026-06-07T01:00:00Z"
        )));
    when(repository.updateProjectActualEffort(
        org.mockito.ArgumentMatchers.eq("42"),
        org.mockito.ArgumentMatchers.eq("variant-1"),
        any(BigDecimal.class)
    ))
        .thenReturn(new ProjectSolutionSelectionDto(
            "42", "variant-1", false, new BigDecimal("2.50"),
            "2026-06-07T00:00:00Z", "2026-06-07T01:00:00Z"
        ));
    when(repository.upsertProjectItemSelections(
        org.mockito.ArgumentMatchers.eq("42"),
        any()
    ))
        .thenReturn(List.of(new ProjectItemSelectionDto(
            "42", "variant-1", "item-1", true,
            "2026-06-07T00:00:00Z", "2026-06-07T01:00:00Z"
        )));
    return repository;
  }
}
