package com.company.effort.standardeffort.service;

import com.company.effort.audit.AuditCommand;
import com.company.effort.audit.AuditEventType;
import com.company.effort.audit.AuditService;
import com.company.effort.audit.AuditTargetType;
import com.company.effort.audit.AuditUnavailableException;
import com.company.effort.project.service.ProjectContextService;
import com.company.effort.security.ProjectAccessContext;
import com.company.effort.security.ProjectScopeService;
import com.company.effort.standardeffort.dto.ProjectItemSelectionDto;
import com.company.effort.standardeffort.dto.ProjectItemSelectionRequest;
import com.company.effort.standardeffort.dto.ProjectItemSelectionsResponse;
import com.company.effort.standardeffort.dto.ProjectSolutionSelectionDto;
import com.company.effort.standardeffort.dto.ProjectSolutionSelectionRequest;
import com.company.effort.standardeffort.dto.ProjectSolutionSelectionResponse;
import com.company.effort.standardeffort.dto.ProjectSolutionSelectionsResponse;
import com.company.effort.standardeffort.dto.SaveProjectItemSelectionsRequest;
import com.company.effort.standardeffort.dto.SaveProjectSolutionSelectionsRequest;
import com.company.effort.standardeffort.dto.StandardEffortMetaResponse;
import com.company.effort.standardeffort.dto.StandardEffortProjectInputResponse;
import com.company.effort.standardeffort.dto.UpdateProjectActualEffortRequest;
import com.company.effort.standardeffort.repository.ProjectItemSelectionKey;
import com.company.effort.standardeffort.repository.StandardEffortRepository;
import com.company.effort.web.exception.ServiceUnavailableException;
import com.company.effort.web.exception.ValidationException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

@Service
public class StandardEffortService {

  private static final String DB_DISABLED_MESSAGE =
      "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0\uC774 "
          + "\uBE44\uD65C\uC131\uD654\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.";

  private final ObjectProvider<StandardEffortRepository> repositoryProvider;
  private final ProjectContextService projectContextService;
  private final ProjectScopeService projectScopeService;
  private final ObjectProvider<AuditService> auditServiceProvider;
  private final ObjectProvider<PlatformTransactionManager> transactionManagerProvider;

  public StandardEffortService(
      ObjectProvider<StandardEffortRepository> repositoryProvider,
      ProjectContextService projectContextService,
      ProjectScopeService projectScopeService,
      ObjectProvider<AuditService> auditServiceProvider,
      ObjectProvider<PlatformTransactionManager> transactionManagerProvider
  ) {
    this.repositoryProvider = repositoryProvider;
    this.projectContextService = projectContextService;
    this.projectScopeService = projectScopeService;
    this.auditServiceProvider = auditServiceProvider;
    this.transactionManagerProvider = transactionManagerProvider;
  }

  public StandardEffortMetaResponse getActiveMeta() {
    StandardEffortRepository repository = repositoryOrThrow();

    return new StandardEffortMetaResponse(
        repository.findActiveSolutions(),
        repository.findActiveSolutionVariants(),
        repository.findActiveBaseEffortRows(),
        repository.findActiveItemRows(),
        repository.findActiveCoefficientRows()
    );
  }

  public StandardEffortProjectInputResponse getProjectInput(String projectId) {
    ProjectAccessContext context = projectContextService.loadProjectAccessContext(projectId);
    projectScopeService.requireRead(context);
    StandardEffortRepository repository = repositoryOrThrow();

    return new StandardEffortProjectInputResponse(
        repository.findActiveSolutions(),
        repository.findActiveSolutionVariants(),
        repository.findActiveBaseEffortRows(),
        repository.findActiveItemRows(),
        repository.findActiveCoefficientRows(),
        repository.findProjectSolutionSelections(context.projectId()),
        repository.findProjectItemSelections(context.projectId())
    );
  }

  public ProjectSolutionSelectionsResponse saveProjectSolutionSelections(
      String projectId,
      SaveProjectSolutionSelectionsRequest request,
      String requestId
  ) {
    String normalizedProjectId = normalizeProjectId(projectId);
    validateBodyProjectId(normalizedProjectId, request);
    List<ProjectSolutionSelectionDto> rows =
        normalizeSolutionSelectionRows(normalizedProjectId, request);

    ProjectAccessContext context =
        projectContextService.loadProjectAccessContext(normalizedProjectId);
    projectScopeService.requireWrite(context);
    StandardEffortRepository repository = repositoryOrThrow();
    AuditService auditService = auditServiceOrThrow();

    if (rows.isEmpty()) {
      return new ProjectSolutionSelectionsResponse(List.of());
    }

    return executeInTransaction(() -> {
      for (ProjectSolutionSelectionDto row : rows) {
        if (!repository.activeSolutionVariantExists(row.solutionVariantId())) {
          throw new ValidationException(
              "solution_variant_id must reference an active solution variant."
          );
        }
      }

      List<String> solutionVariantIds = rows.stream()
          .map(ProjectSolutionSelectionDto::solutionVariantId)
          .toList();
      List<ProjectSolutionSelectionDto> beforeRows =
          repository.findProjectSolutionSelectionsByVariantIds(
              context.projectId(),
              solutionVariantIds
          );
      List<ProjectSolutionSelectionDto> savedRows =
          repository.upsertProjectSolutionSelections(context.projectId(), rows);

      auditService.recordSuccess(AuditCommand.builder()
          .eventType(AuditEventType.STANDARD_EFFORT_SOLUTION_TOGGLE)
          .targetType(AuditTargetType.STANDARD_EFFORT)
          .targetId(context.projectId() + ":solutions")
          .projectId(context.projectId())
          .beforeJson(Map.of("project_solution_selections", beforeRows))
          .afterJson(Map.of("project_solution_selections", savedRows))
          .metadataJson(Map.of(
              "section", "solution_selection",
              "unit", "M/M",
              "row_count", savedRows.size()
          ))
          .requestId(requestId)
          .build());

      return new ProjectSolutionSelectionsResponse(savedRows);
    });
  }

  public ProjectItemSelectionsResponse saveProjectItemSelections(
      String projectId,
      SaveProjectItemSelectionsRequest request,
      String requestId
  ) {
    String normalizedProjectId = normalizeProjectId(projectId);
    validateBodyProjectId(normalizedProjectId, request);
    List<ProjectItemSelectionDto> rows =
        normalizeItemSelectionRows(normalizedProjectId, request);

    ProjectAccessContext context =
        projectContextService.loadProjectAccessContext(normalizedProjectId);
    projectScopeService.requireWrite(context);
    StandardEffortRepository repository = repositoryOrThrow();
    AuditService auditService = auditServiceOrThrow();

    if (rows.isEmpty()) {
      return new ProjectItemSelectionsResponse(List.of());
    }

    return executeInTransaction(() -> {
      for (ProjectItemSelectionDto row : rows) {
        if (!repository.activeSolutionVariantExists(row.solutionVariantId())) {
          throw new ValidationException(
              "solution_variant_id must reference an active solution variant."
          );
        }
        if (!repository.activeItemExists(row.itemId())) {
          throw new ValidationException("item_id must reference an active standard item.");
        }
        if (!repository.activeCoefficientExists(row.itemId(), row.solutionVariantId())) {
          throw new ValidationException(
              "item_id and solution_variant_id must reference an active coefficient row."
          );
        }
      }

      List<ProjectItemSelectionKey> keys = rows.stream()
          .map(row -> new ProjectItemSelectionKey(row.solutionVariantId(), row.itemId()))
          .toList();
      List<ProjectItemSelectionDto> beforeRows =
          repository.findProjectItemSelectionsByKeys(context.projectId(), keys);
      List<ProjectItemSelectionDto> savedRows =
          repository.upsertProjectItemSelections(context.projectId(), rows);

      auditService.recordSuccess(AuditCommand.builder()
          .eventType(AuditEventType.STANDARD_EFFORT_ITEM_CHECK)
          .targetType(AuditTargetType.STANDARD_EFFORT)
          .targetId(context.projectId() + ":items")
          .projectId(context.projectId())
          .beforeJson(Map.of("project_item_selections", beforeRows))
          .afterJson(Map.of("project_item_selections", savedRows))
          .metadataJson(Map.of(
              "section", "item_selection",
              "row_count", savedRows.size()
          ))
          .requestId(requestId)
          .build());

      return new ProjectItemSelectionsResponse(savedRows);
    });
  }

  public ProjectSolutionSelectionResponse updateProjectActualEffort(
      String projectId,
      UpdateProjectActualEffortRequest request,
      String requestId
  ) {
    String normalizedProjectId = normalizeProjectId(projectId);
    validateBodyProjectId(normalizedProjectId, request);
    String solutionVariantId = normalizeRequiredText(
        request.getSolutionVariantId(),
        "solution_variant_id is required."
    );
    BigDecimal actualEffortMm = normalizeActualEffortMm(request.getActualEffortMm());

    ProjectAccessContext context =
        projectContextService.loadProjectAccessContext(normalizedProjectId);
    projectScopeService.requireWrite(context);
    StandardEffortRepository repository = repositoryOrThrow();
    AuditService auditService = auditServiceOrThrow();

    return executeInTransaction(() -> {
      if (!repository.activeSolutionVariantExists(solutionVariantId)) {
        throw new ValidationException(
            "solution_variant_id must reference an active solution variant."
        );
      }

      List<ProjectSolutionSelectionDto> beforeRows =
          repository.findProjectSolutionSelectionsByVariantIds(
              context.projectId(),
              List.of(solutionVariantId)
          );
      ProjectSolutionSelectionDto beforeRow = beforeRows.isEmpty() ? null : beforeRows.get(0);
      ProjectSolutionSelectionDto savedRow =
          repository.updateProjectActualEffort(
              context.projectId(),
              solutionVariantId,
              actualEffortMm
          );

      auditService.recordSuccess(AuditCommand.builder()
          .eventType(AuditEventType.STANDARD_EFFORT_ACTUAL_EFFORT_UPDATE)
          .targetType(AuditTargetType.STANDARD_EFFORT)
          .targetId(context.projectId() + ":" + solutionVariantId)
          .projectId(context.projectId())
          .beforeJson(actualEffortAuditPayload(beforeRow))
          .afterJson(actualEffortAuditPayload(savedRow))
          .metadataJson(Map.of(
              "section", "actual_effort",
              "unit", "M/M"
          ))
          .requestId(requestId)
          .build());

      return new ProjectSolutionSelectionResponse(savedRow);
    });
  }

  private StandardEffortRepository repositoryOrThrow() {
    StandardEffortRepository repository = repositoryProvider.getIfAvailable();

    if (repository == null) {
      throw new ServiceUnavailableException(DB_DISABLED_MESSAGE);
    }

    return repository;
  }

  private AuditService auditServiceOrThrow() {
    AuditService auditService = auditServiceProvider.getIfAvailable();

    if (auditService == null) {
      throw new AuditUnavailableException(
          "Audit service is not available for standard effort writes."
      );
    }

    return auditService;
  }

  private <T> T executeInTransaction(Supplier<T> callback) {
    PlatformTransactionManager transactionManager =
        transactionManagerProvider.getIfAvailable();

    if (transactionManager == null) {
      return callback.get();
    }

    return new TransactionTemplate(transactionManager).execute(status -> callback.get());
  }

  private String normalizeProjectId(String projectId) {
    if (!StringUtils.hasText(projectId)) {
      throw new ValidationException("project_id must be a numeric string.");
    }

    String normalizedProjectId = projectId.trim();
    if (!normalizedProjectId.matches("\\d+")) {
      throw new ValidationException("project_id must be a numeric string.");
    }

    return normalizedProjectId;
  }

  private void validateBodyProjectId(
      String pathProjectId,
      SaveProjectSolutionSelectionsRequest request
  ) {
    if (request == null) {
      throw new ValidationException("Request body is required.");
    }

    rejectActualEffortMd(request.getUnknownFields());

    if (StringUtils.hasText(request.getProjectId())
        && !pathProjectId.equals(request.getProjectId().trim())) {
      throw new ValidationException("body project_id must match path project_id.");
    }
  }

  private void validateBodyProjectId(
      String pathProjectId,
      SaveProjectItemSelectionsRequest request
  ) {
    if (request == null) {
      throw new ValidationException("Request body is required.");
    }

    rejectEffortFields(request.getUnknownFields());

    if (StringUtils.hasText(request.getProjectId())
        && !pathProjectId.equals(request.getProjectId().trim())) {
      throw new ValidationException("body project_id must match path project_id.");
    }
  }

  private void validateBodyProjectId(
      String pathProjectId,
      UpdateProjectActualEffortRequest request
  ) {
    if (request == null) {
      throw new ValidationException("Request body is required.");
    }

    rejectActualEffortWriteFields(request.getUnknownFields());

    if (StringUtils.hasText(request.getProjectId())
        && !pathProjectId.equals(request.getProjectId().trim())) {
      throw new ValidationException("body project_id must match path project_id.");
    }
  }

  private List<ProjectSolutionSelectionDto> normalizeSolutionSelectionRows(
      String pathProjectId,
      SaveProjectSolutionSelectionsRequest request
  ) {
    if (request.getSelections() == null) {
      throw new ValidationException("selections must be an array.");
    }

    Set<String> seenVariantIds = new LinkedHashSet<>();
    List<ProjectSolutionSelectionDto> rows = new ArrayList<>();

    for (ProjectSolutionSelectionRequest selection : request.getSelections()) {
      if (selection == null) {
        throw new ValidationException("selection row is required.");
      }

      rejectActualEffortMd(selection.getUnknownFields());

      if (StringUtils.hasText(selection.getProjectId())
          && !pathProjectId.equals(selection.getProjectId().trim())) {
        throw new ValidationException("selection project_id must match path project_id.");
      }

      String solutionVariantId = normalizeRequiredText(
          selection.getSolutionVariantId(),
          "solution_variant_id is required."
      );
      if (!seenVariantIds.add(solutionVariantId)) {
        throw new ValidationException("duplicate solution_variant_id is not allowed.");
      }

      rows.add(new ProjectSolutionSelectionDto(
          pathProjectId,
          solutionVariantId,
          selection.getEnabled() == null || selection.getEnabled(),
          normalizeActualEffortMm(selection.getActualEffortMm()),
          null,
          null
      ));
    }

    return List.copyOf(rows);
  }

  private List<ProjectItemSelectionDto> normalizeItemSelectionRows(
      String pathProjectId,
      SaveProjectItemSelectionsRequest request
  ) {
    if (request.getSelections() == null) {
      throw new ValidationException("selections must be an array.");
    }

    Set<ProjectItemSelectionKey> seenKeys = new LinkedHashSet<>();
    List<ProjectItemSelectionDto> rows = new ArrayList<>();

    for (ProjectItemSelectionRequest selection : request.getSelections()) {
      if (selection == null) {
        throw new ValidationException("selection row is required.");
      }

      rejectEffortFields(selection.getUnknownFields());

      if (StringUtils.hasText(selection.getProjectId())
          && !pathProjectId.equals(selection.getProjectId().trim())) {
        throw new ValidationException("selection project_id must match path project_id.");
      }

      String solutionVariantId = normalizeRequiredText(
          selection.getSolutionVariantId(),
          "solution_variant_id is required."
      );
      String itemId = normalizeRequiredText(selection.getItemId(), "item_id is required.");
      ProjectItemSelectionKey key = new ProjectItemSelectionKey(solutionVariantId, itemId);
      if (!seenKeys.add(key)) {
        throw new ValidationException(
            "duplicate solution_variant_id and item_id pair is not allowed."
        );
      }

      rows.add(new ProjectItemSelectionDto(
          pathProjectId,
          solutionVariantId,
          itemId,
          normalizeChecked(selection.getChecked()),
          null,
          null
      ));
    }

    return List.copyOf(rows);
  }

  private void rejectActualEffortMd(Map<String, Object> unknownFields) {
    if (unknownFields.containsKey("actual_effort_md")
        || unknownFields.containsKey("actualEffortMd")) {
      throw new ValidationException("actual_effort_md is not supported. Use actual_effort_mm.");
    }
  }

  private void rejectEffortFields(Map<String, Object> unknownFields) {
    Set<String> forbiddenFields = Set.of(
        "effort_mm",
        "effortMm",
        "actual_effort_mm",
        "actualEffortMm",
        "actual_effort_md",
        "actualEffortMd",
        "standard_effort_mm",
        "standardEffortMm",
        "gap_mm",
        "gapMm"
    );

    for (String field : forbiddenFields) {
      if (unknownFields.containsKey(field)) {
        throw new ValidationException(
            field + " is not supported for item selection writes. Use checked."
        );
      }
    }
  }

  private void rejectActualEffortWriteFields(Map<String, Object> unknownFields) {
    Set<String> forbiddenFields = Set.of(
        "enabled",
        "effort_mm",
        "effortMm",
        "actual_effort_md",
        "actualEffortMd",
        "standard_effort_mm",
        "standardEffortMm",
        "gap_mm",
        "gapMm"
    );

    for (String field : forbiddenFields) {
      if (unknownFields.containsKey(field)) {
        throw new ValidationException(
            field + " is not supported for actual effort writes. Use actual_effort_mm."
        );
      }
    }
  }

  private Map<String, Object> actualEffortAuditPayload(ProjectSolutionSelectionDto row) {
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("actual_effort_mm", row == null ? null : row.actualEffortMm());
    payload.put("project_solution_selection", row);
    return payload;
  }

  private String normalizeRequiredText(String value, String message) {
    if (!StringUtils.hasText(value)) {
      throw new ValidationException(message);
    }

    return value.trim();
  }

  private BigDecimal normalizeActualEffortMm(Object value) {
    if (value == null) {
      return BigDecimal.ZERO;
    }

    if (value instanceof String stringValue && !StringUtils.hasText(stringValue)) {
      return BigDecimal.ZERO;
    }

    try {
      BigDecimal normalized = new BigDecimal(value.toString());
      if (normalized.compareTo(BigDecimal.ZERO) < 0) {
        throw new ValidationException("actual_effort_mm must be greater than or equal to 0.");
      }
      return normalized;
    } catch (NumberFormatException error) {
      throw new ValidationException("actual_effort_mm must be a number.");
    }
  }

  private boolean normalizeChecked(Object value) {
    if (value == null) {
      return false;
    }

    if (value instanceof Boolean booleanValue) {
      return booleanValue;
    }

    if (value instanceof Number numberValue) {
      int intValue = numberValue.intValue();
      if (intValue == 1 && numberValue.doubleValue() == 1D) {
        return true;
      }
      if (intValue == 0 && numberValue.doubleValue() == 0D) {
        return false;
      }
      throw new ValidationException("checked must be a boolean-compatible value.");
    }

    if (value instanceof String stringValue) {
      String normalized = stringValue.trim();
      if (!StringUtils.hasText(normalized)) {
        return false;
      }

      String lowerValue = normalized.toLowerCase();
      if (Set.of("1", "y", "true").contains(lowerValue)) {
        return true;
      }
      if (Set.of("0", "n", "false").contains(lowerValue)) {
        return false;
      }
    }

    throw new ValidationException("checked must be a boolean-compatible value.");
  }
}
