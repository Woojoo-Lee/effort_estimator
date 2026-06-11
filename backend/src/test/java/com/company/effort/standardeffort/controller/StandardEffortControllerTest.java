package com.company.effort.standardeffort.controller;

import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.company.effort.config.WebConfig;
import com.company.effort.security.CurrentUser;
import com.company.effort.security.CurrentUserProvider;
import com.company.effort.security.PermissionCodes;
import com.company.effort.security.PermissionInterceptor;
import com.company.effort.security.PermissionService;
import com.company.effort.security.PermissionSnapshot;
import com.company.effort.security.ProjectAccessAction;
import com.company.effort.security.ProjectAccessContext;
import com.company.effort.security.ProjectAccessDecision;
import com.company.effort.security.ProjectAccessDeniedException;
import com.company.effort.security.RoleCodes;
import com.company.effort.standardeffort.dto.BaseEffortRowDto;
import com.company.effort.standardeffort.dto.CoefficientRowDto;
import com.company.effort.standardeffort.dto.ProjectItemSelectionDto;
import com.company.effort.standardeffort.dto.ProjectItemSelectionsResponse;
import com.company.effort.standardeffort.dto.ProjectSolutionSelectionDto;
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
import com.company.effort.standardeffort.service.StandardEffortService;
import com.company.effort.web.exception.NotFoundException;
import com.company.effort.web.exception.GlobalExceptionHandler;
import com.company.effort.web.exception.ServiceUnavailableException;
import com.company.effort.web.exception.ValidationException;
import com.company.effort.web.filter.RequestIdFilter;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(StandardEffortController.class)
@Import({
    RequestIdFilter.class,
    GlobalExceptionHandler.class,
    PermissionService.class,
    PermissionInterceptor.class,
    WebConfig.class,
    StandardEffortControllerTest.TestConfig.class
})
class StandardEffortControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private TestCurrentUserProvider currentUserProvider;

  @MockBean
  private StandardEffortService standardEffortService;

  @BeforeEach
  void setUp() {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.ROUTE_ESTIMATOR_READ)
    ));
  }

  @Test
  void getMetaReturnsActiveMetaWithSnakeCaseResponse() throws Exception {
    when(standardEffortService.getActiveMeta()).thenReturn(sampleResponse());

    mockMvc.perform(get("/api/standard-effort/meta").header("X-Request-Id", "meta-123"))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Request-Id", "meta-123"))
        .andExpect(jsonPath("$.ok").value(true))
        .andExpect(jsonPath("$.meta.request_id").value("meta-123"))
        .andExpect(jsonPath("$.data.solutions[0].solution_code").value("PBX"))
        .andExpect(jsonPath("$.data.solution_variants[0].solution_variant_id")
            .value("variant-1"))
        .andExpect(jsonPath("$.data.base_effort_rows[0].effort_mm").value(1.25))
        .andExpect(jsonPath("$.data.item_rows[0].item_id").value("item-1"))
        .andExpect(jsonPath("$.data.coefficient_rows[0].coefficient").value(1.75));
  }

  @Test
  void getMetaGeneratesRequestIdHeader() throws Exception {
    when(standardEffortService.getActiveMeta()).thenReturn(emptyResponse());

    mockMvc.perform(get("/api/standard-effort/meta"))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Request-Id", not(blankOrNullString())))
        .andExpect(jsonPath("$.meta.request_id").value(not(blankOrNullString())));
  }

  @Test
  void getMetaRequiresEstimatorReadPermission() throws Exception {
    currentUserProvider.setUser(user(List.of(RoleCodes.VIEWER), List.of()));

    mockMvc.perform(get("/api/standard-effort/meta").header("X-Request-Id", "deny-123"))
        .andExpect(status().isForbidden())
        .andExpect(header().string("X-Request-Id", "deny-123"))
        .andExpect(jsonPath("$.ok").value(false))
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
        .andExpect(jsonPath("$.error.request_id").value("deny-123"))
        .andExpect(jsonPath("$.error.details.required_permissions",
            hasItem(PermissionCodes.ROUTE_ESTIMATOR_READ)));
  }

  @Test
  void getMetaDeniesSystemAdminRoleOnly() throws Exception {
    currentUserProvider.setUser(user(List.of(RoleCodes.SYSTEM_ADMIN), List.of()));

    mockMvc.perform(get("/api/standard-effort/meta"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
  }

  @Test
  void getMetaReturnsServiceUnavailableWhenDbIsDisabled() throws Exception {
    when(standardEffortService.getActiveMeta())
        .thenThrow(new ServiceUnavailableException(
            "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0\uC774 "
                + "\uBE44\uD65C\uC131\uD654\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4."
        ));

    mockMvc.perform(get("/api/standard-effort/meta").header("X-Request-Id", "db-off-123"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.ok").value(false))
        .andExpect(jsonPath("$.error.code").value("SERVICE_UNAVAILABLE"))
        .andExpect(jsonPath("$.error.request_id").value("db-off-123"));
  }

  @Test
  void getProjectInputReturnsFullInputWithSnakeCaseResponse() throws Exception {
    when(standardEffortService.getProjectInput("42")).thenReturn(sampleProjectInputResponse());

    mockMvc.perform(get("/api/projects/42/standard-effort")
            .header("X-Request-Id", "project-input-123"))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Request-Id", "project-input-123"))
        .andExpect(jsonPath("$.ok").value(true))
        .andExpect(jsonPath("$.meta.request_id").value("project-input-123"))
        .andExpect(jsonPath("$.data.solutions[0].solution_code").value("PBX"))
        .andExpect(jsonPath("$.data.solution_variants[0].solution_variant_id")
            .value("variant-1"))
        .andExpect(jsonPath("$.data.base_effort_rows[0].effort_mm").value(1.25))
        .andExpect(jsonPath("$.data.item_rows[0].item_id").value("item-1"))
        .andExpect(jsonPath("$.data.coefficient_rows[0].coefficient").value(1.75))
        .andExpect(jsonPath("$.data.project_solution_selections[0].project_id")
            .value("42"))
        .andExpect(jsonPath("$.data.project_solution_selections[0].actual_effort_mm")
            .value(3.5))
        .andExpect(jsonPath("$.data.project_item_selections[0].item_id")
            .value("item-1"))
        .andExpect(jsonPath("$.data.project_item_selections[0].checked")
            .value(true));
  }

  @Test
  void getProjectInputRequiresEstimatorReadPermission() throws Exception {
    currentUserProvider.setUser(user(List.of(RoleCodes.VIEWER), List.of()));

    mockMvc.perform(get("/api/projects/42/standard-effort")
            .header("X-Request-Id", "deny-project-123"))
        .andExpect(status().isForbidden())
        .andExpect(header().string("X-Request-Id", "deny-project-123"))
        .andExpect(jsonPath("$.ok").value(false))
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
        .andExpect(jsonPath("$.error.request_id").value("deny-project-123"))
        .andExpect(jsonPath("$.error.details.required_permissions",
            hasItem(PermissionCodes.ROUTE_ESTIMATOR_READ)));
  }

  @Test
  void getProjectInputDeniesSystemAdminRoleOnly() throws Exception {
    currentUserProvider.setUser(user(List.of(RoleCodes.SYSTEM_ADMIN), List.of()));

    mockMvc.perform(get("/api/projects/42/standard-effort"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
  }

  @Test
  void getProjectInputReturnsNotFoundWrapper() throws Exception {
    when(standardEffortService.getProjectInput("404"))
        .thenThrow(new NotFoundException("Project not found."));

    mockMvc.perform(get("/api/projects/404/standard-effort")
            .header("X-Request-Id", "not-found-123"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.ok").value(false))
        .andExpect(jsonPath("$.error.code").value("NOT_FOUND"))
        .andExpect(jsonPath("$.error.request_id").value("not-found-123"));
  }

  @Test
  void getProjectInputReturnsValidationErrorWrapper() throws Exception {
    when(standardEffortService.getProjectInput("abc"))
        .thenThrow(new ValidationException("project_id must be a numeric string."));

    mockMvc.perform(get("/api/projects/abc/standard-effort")
            .header("X-Request-Id", "invalid-123"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.ok").value(false))
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
        .andExpect(jsonPath("$.error.request_id").value("invalid-123"));
  }

  @Test
  void getProjectInputReturnsServiceUnavailableWhenDbIsDisabled() throws Exception {
    when(standardEffortService.getProjectInput("42"))
        .thenThrow(new ServiceUnavailableException(
            "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0\uC774 "
                + "\uBE44\uD65C\uC131\uD654\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4."
        ));

    mockMvc.perform(get("/api/projects/42/standard-effort")
            .header("X-Request-Id", "db-off-project-123"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.ok").value(false))
        .andExpect(jsonPath("$.error.code").value("SERVICE_UNAVAILABLE"))
        .andExpect(jsonPath("$.error.request_id").value("db-off-project-123"));
  }

  @Test
  void getProjectInputReturnsForbiddenWhenProjectScopeDenied() throws Exception {
    ProjectAccessContext context = new ProjectAccessContext(
        "42", "owner-user", "dept-1", List.of(), "active", null
    );
    ProjectAccessDecision decision = ProjectAccessDecision.denied(
        ProjectAccessAction.READ,
        context,
        ProjectAccessDecision.DENIED_MISSING_PERMISSION,
        List.of(PermissionCodes.PROJECT_READ_ALL)
    );
    when(standardEffortService.getProjectInput("42"))
        .thenThrow(new ProjectAccessDeniedException(decision));

    mockMvc.perform(get("/api/projects/42/standard-effort")
            .header("X-Request-Id", "scope-denied-123"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.ok").value(false))
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
        .andExpect(jsonPath("$.error.request_id").value("scope-denied-123"))
        .andExpect(jsonPath("$.error.details.project_id").value("42"))
        .andExpect(jsonPath("$.error.details.reason")
            .value(ProjectAccessDecision.DENIED_MISSING_PERMISSION));
  }

  @Test
  void saveProjectSolutionSelectionsReturnsSavedRowsWithPermission() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.STANDARD_EFFORT_SELECTION_WRITE)
    ));
    when(standardEffortService.saveProjectSolutionSelections(
        eq("42"),
        any(SaveProjectSolutionSelectionsRequest.class),
        eq("solution-save-123")
    )).thenReturn(sampleSolutionSelectionsResponse());

    mockMvc.perform(put("/api/projects/42/standard-effort/solutions")
            .header("X-Request-Id", "solution-save-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "project_id": "42",
                  "selections": [
                    {
                      "project_id": "42",
                      "solution_variant_id": "variant-1",
                      "enabled": true,
                      "actual_effort_mm": 1.25
                    }
                  ]
                }
                """))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Request-Id", "solution-save-123"))
        .andExpect(jsonPath("$.ok").value(true))
        .andExpect(jsonPath("$.meta.request_id").value("solution-save-123"))
        .andExpect(jsonPath("$.data.project_solution_selections[0].project_id")
            .value("42"))
        .andExpect(jsonPath("$.data.project_solution_selections[0].solution_variant_id")
            .value("variant-1"))
        .andExpect(jsonPath("$.data.project_solution_selections[0].actual_effort_mm")
            .value(1.25));
  }

  @Test
  void saveProjectSolutionSelectionsRequiresSelectionWritePermission() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.ROUTE_ESTIMATOR_READ)
    ));

    mockMvc.perform(put("/api/projects/42/standard-effort/solutions")
            .header("X-Request-Id", "solution-deny-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"42","selections":[]}
                """))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
        .andExpect(jsonPath("$.error.details.required_permissions",
            hasItem(PermissionCodes.STANDARD_EFFORT_SELECTION_WRITE)));
  }

  @Test
  void saveProjectSolutionSelectionsDeniesSystemAdminRoleOnly() throws Exception {
    currentUserProvider.setUser(user(List.of(RoleCodes.SYSTEM_ADMIN), List.of()));

    mockMvc.perform(put("/api/projects/42/standard-effort/solutions")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"42","selections":[]}
                """))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
  }

  @Test
  void saveProjectSolutionSelectionsReturnsValidationErrorWrapper() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.STANDARD_EFFORT_SELECTION_WRITE)
    ));
    when(standardEffortService.saveProjectSolutionSelections(
        eq("abc"),
        any(SaveProjectSolutionSelectionsRequest.class),
        eq("solution-invalid-123")
    )).thenThrow(new ValidationException("project_id must be a numeric string."));

    mockMvc.perform(put("/api/projects/abc/standard-effort/solutions")
            .header("X-Request-Id", "solution-invalid-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"abc","selections":[]}
                """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
        .andExpect(jsonPath("$.error.request_id").value("solution-invalid-123"));
  }

  @Test
  void saveProjectSolutionSelectionsReturnsNotFoundWrapper() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.STANDARD_EFFORT_SELECTION_WRITE)
    ));
    when(standardEffortService.saveProjectSolutionSelections(
        eq("404"),
        any(SaveProjectSolutionSelectionsRequest.class),
        eq("solution-not-found-123")
    )).thenThrow(new NotFoundException("Project not found."));

    mockMvc.perform(put("/api/projects/404/standard-effort/solutions")
            .header("X-Request-Id", "solution-not-found-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"404","selections":[]}
                """))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.error.code").value("NOT_FOUND"))
        .andExpect(jsonPath("$.error.request_id").value("solution-not-found-123"));
  }

  @Test
  void saveProjectSolutionSelectionsReturnsForbiddenWhenProjectScopeDenied() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.STANDARD_EFFORT_SELECTION_WRITE)
    ));
    ProjectAccessContext context = new ProjectAccessContext(
        "42", "owner-user", "dept-1", List.of(), "archived", "2026-06-07T00:00:00Z"
    );
    ProjectAccessDecision decision = ProjectAccessDecision.denied(
        ProjectAccessAction.WRITE,
        context,
        ProjectAccessDecision.DENIED_ARCHIVED_PROJECT,
        List.of(PermissionCodes.PROJECT_WRITE_ALL)
    );
    when(standardEffortService.saveProjectSolutionSelections(
        eq("42"),
        any(SaveProjectSolutionSelectionsRequest.class),
        eq("solution-scope-denied-123")
    )).thenThrow(new ProjectAccessDeniedException(decision));

    mockMvc.perform(put("/api/projects/42/standard-effort/solutions")
            .header("X-Request-Id", "solution-scope-denied-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"42","selections":[]}
                """))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
        .andExpect(jsonPath("$.error.details.project_id").value("42"))
        .andExpect(jsonPath("$.error.details.reason")
            .value(ProjectAccessDecision.DENIED_ARCHIVED_PROJECT));
  }

  @Test
  void saveProjectSolutionSelectionsReturnsServiceUnavailableWrapper() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.STANDARD_EFFORT_SELECTION_WRITE)
    ));
    when(standardEffortService.saveProjectSolutionSelections(
        eq("42"),
        any(SaveProjectSolutionSelectionsRequest.class),
        eq("solution-db-off-123")
    )).thenThrow(new ServiceUnavailableException("Database is disabled."));

    mockMvc.perform(put("/api/projects/42/standard-effort/solutions")
            .header("X-Request-Id", "solution-db-off-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"42","selections":[]}
                """))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.error.code").value("SERVICE_UNAVAILABLE"))
        .andExpect(jsonPath("$.error.request_id").value("solution-db-off-123"));
  }

  @Test
  void saveProjectItemSelectionsReturnsSavedRowsWithPermission() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.STANDARD_EFFORT_SELECTION_WRITE)
    ));
    when(standardEffortService.saveProjectItemSelections(
        eq("42"),
        any(SaveProjectItemSelectionsRequest.class),
        eq("item-save-123")
    )).thenReturn(sampleItemSelectionsResponse());

    mockMvc.perform(put("/api/projects/42/standard-effort/items")
            .header("X-Request-Id", "item-save-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "project_id": "42",
                  "selections": [
                    {
                      "project_id": "42",
                      "solution_variant_id": "variant-1",
                      "item_id": "item-1",
                      "checked": true
                    }
                  ]
                }
                """))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Request-Id", "item-save-123"))
        .andExpect(jsonPath("$.ok").value(true))
        .andExpect(jsonPath("$.meta.request_id").value("item-save-123"))
        .andExpect(jsonPath("$.data.project_item_selections[0].project_id")
            .value("42"))
        .andExpect(jsonPath("$.data.project_item_selections[0].solution_variant_id")
            .value("variant-1"))
        .andExpect(jsonPath("$.data.project_item_selections[0].item_id")
            .value("item-1"))
        .andExpect(jsonPath("$.data.project_item_selections[0].checked")
            .value(true));
  }

  @Test
  void saveProjectItemSelectionsRequiresSelectionWritePermission() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.ROUTE_ESTIMATOR_READ)
    ));

    mockMvc.perform(put("/api/projects/42/standard-effort/items")
            .header("X-Request-Id", "item-deny-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"42","selections":[]}
                """))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
        .andExpect(jsonPath("$.error.details.required_permissions",
            hasItem(PermissionCodes.STANDARD_EFFORT_SELECTION_WRITE)));
  }

  @Test
  void saveProjectItemSelectionsDeniesSystemAdminRoleOnly() throws Exception {
    currentUserProvider.setUser(user(List.of(RoleCodes.SYSTEM_ADMIN), List.of()));

    mockMvc.perform(put("/api/projects/42/standard-effort/items")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"42","selections":[]}
                """))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
  }

  @Test
  void saveProjectItemSelectionsReturnsValidationErrorWrapper() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.STANDARD_EFFORT_SELECTION_WRITE)
    ));
    when(standardEffortService.saveProjectItemSelections(
        eq("abc"),
        any(SaveProjectItemSelectionsRequest.class),
        eq("item-invalid-123")
    )).thenThrow(new ValidationException("project_id must be a numeric string."));

    mockMvc.perform(put("/api/projects/abc/standard-effort/items")
            .header("X-Request-Id", "item-invalid-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"abc","selections":[]}
                """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
        .andExpect(jsonPath("$.error.request_id").value("item-invalid-123"));
  }

  @Test
  void saveProjectItemSelectionsReturnsForbiddenWhenProjectScopeDenied() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.STANDARD_EFFORT_SELECTION_WRITE)
    ));
    ProjectAccessContext context = new ProjectAccessContext(
        "42", "owner-user", "dept-1", List.of(), "archived", "2026-06-07T00:00:00Z"
    );
    ProjectAccessDecision decision = ProjectAccessDecision.denied(
        ProjectAccessAction.WRITE,
        context,
        ProjectAccessDecision.DENIED_ARCHIVED_PROJECT,
        List.of(PermissionCodes.PROJECT_WRITE_ALL)
    );
    when(standardEffortService.saveProjectItemSelections(
        eq("42"),
        any(SaveProjectItemSelectionsRequest.class),
        eq("item-scope-denied-123")
    )).thenThrow(new ProjectAccessDeniedException(decision));

    mockMvc.perform(put("/api/projects/42/standard-effort/items")
            .header("X-Request-Id", "item-scope-denied-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"42","selections":[]}
                """))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
        .andExpect(jsonPath("$.error.details.project_id").value("42"))
        .andExpect(jsonPath("$.error.details.reason")
            .value(ProjectAccessDecision.DENIED_ARCHIVED_PROJECT));
  }

  @Test
  void updateProjectActualEffortReturnsSavedRowWithPermission() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE)
    ));
    when(standardEffortService.updateProjectActualEffort(
        eq("42"),
        any(UpdateProjectActualEffortRequest.class),
        eq("actual-save-123")
    )).thenReturn(sampleActualEffortResponse());

    mockMvc.perform(put("/api/projects/42/standard-effort/actual-effort")
            .header("X-Request-Id", "actual-save-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "project_id": "42",
                  "solution_variant_id": "variant-1",
                  "actual_effort_mm": 2.50
                }
                """))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Request-Id", "actual-save-123"))
        .andExpect(jsonPath("$.ok").value(true))
        .andExpect(jsonPath("$.meta.request_id").value("actual-save-123"))
        .andExpect(jsonPath("$.data.project_solution_selection.project_id")
            .value("42"))
        .andExpect(jsonPath("$.data.project_solution_selection.solution_variant_id")
            .value("variant-1"))
        .andExpect(jsonPath("$.data.project_solution_selection.enabled")
            .value(false))
        .andExpect(jsonPath("$.data.project_solution_selection.actual_effort_mm")
            .value(2.5));
  }

  @Test
  void updateProjectActualEffortRequiresActualEffortWritePermission() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.ROUTE_ESTIMATOR_READ)
    ));

    mockMvc.perform(put("/api/projects/42/standard-effort/actual-effort")
            .header("X-Request-Id", "actual-deny-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"42","solution_variant_id":"variant-1","actual_effort_mm":1}
                """))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
        .andExpect(jsonPath("$.error.details.required_permissions",
            hasItem(PermissionCodes.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE)));
  }

  @Test
  void updateProjectActualEffortDeniesSelectionWriteOnlyPermission() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.STANDARD_EFFORT_SELECTION_WRITE)
    ));

    mockMvc.perform(put("/api/projects/42/standard-effort/actual-effort")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"42","solution_variant_id":"variant-1","actual_effort_mm":1}
                """))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
  }

  @Test
  void updateProjectActualEffortDeniesSystemAdminRoleOnly() throws Exception {
    currentUserProvider.setUser(user(List.of(RoleCodes.SYSTEM_ADMIN), List.of()));

    mockMvc.perform(put("/api/projects/42/standard-effort/actual-effort")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"42","solution_variant_id":"variant-1","actual_effort_mm":1}
                """))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
  }

  @Test
  void updateProjectActualEffortReturnsValidationErrorWrapper() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE)
    ));
    when(standardEffortService.updateProjectActualEffort(
        eq("abc"),
        any(UpdateProjectActualEffortRequest.class),
        eq("actual-invalid-123")
    )).thenThrow(new ValidationException("project_id must be a numeric string."));

    mockMvc.perform(put("/api/projects/abc/standard-effort/actual-effort")
            .header("X-Request-Id", "actual-invalid-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"abc","solution_variant_id":"variant-1","actual_effort_mm":1}
                """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
        .andExpect(jsonPath("$.error.request_id").value("actual-invalid-123"));
  }

  @Test
  void updateProjectActualEffortReturnsNotFoundWrapper() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE)
    ));
    when(standardEffortService.updateProjectActualEffort(
        eq("404"),
        any(UpdateProjectActualEffortRequest.class),
        eq("actual-not-found-123")
    )).thenThrow(new NotFoundException("Project not found."));

    mockMvc.perform(put("/api/projects/404/standard-effort/actual-effort")
            .header("X-Request-Id", "actual-not-found-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"404","solution_variant_id":"variant-1","actual_effort_mm":1}
                """))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.error.code").value("NOT_FOUND"))
        .andExpect(jsonPath("$.error.request_id").value("actual-not-found-123"));
  }

  @Test
  void updateProjectActualEffortReturnsForbiddenWhenProjectScopeDenied() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE)
    ));
    ProjectAccessContext context = new ProjectAccessContext(
        "42", "owner-user", "dept-1", List.of(), "archived", "2026-06-07T00:00:00Z"
    );
    ProjectAccessDecision decision = ProjectAccessDecision.denied(
        ProjectAccessAction.WRITE,
        context,
        ProjectAccessDecision.DENIED_ARCHIVED_PROJECT,
        List.of(PermissionCodes.PROJECT_WRITE_ALL)
    );
    when(standardEffortService.updateProjectActualEffort(
        eq("42"),
        any(UpdateProjectActualEffortRequest.class),
        eq("actual-scope-denied-123")
    )).thenThrow(new ProjectAccessDeniedException(decision));

    mockMvc.perform(put("/api/projects/42/standard-effort/actual-effort")
            .header("X-Request-Id", "actual-scope-denied-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"42","solution_variant_id":"variant-1","actual_effort_mm":1}
                """))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
        .andExpect(jsonPath("$.error.details.project_id").value("42"))
        .andExpect(jsonPath("$.error.details.reason")
            .value(ProjectAccessDecision.DENIED_ARCHIVED_PROJECT));
  }

  @Test
  void updateProjectActualEffortReturnsServiceUnavailableWrapper() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE)
    ));
    when(standardEffortService.updateProjectActualEffort(
        eq("42"),
        any(UpdateProjectActualEffortRequest.class),
        eq("actual-db-off-123")
    )).thenThrow(new ServiceUnavailableException("Database is disabled."));

    mockMvc.perform(put("/api/projects/42/standard-effort/actual-effort")
            .header("X-Request-Id", "actual-db-off-123")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"project_id":"42","solution_variant_id":"variant-1","actual_effort_mm":1}
                """))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.error.code").value("SERVICE_UNAVAILABLE"))
        .andExpect(jsonPath("$.error.request_id").value("actual-db-off-123"));
  }

  private static StandardEffortMetaResponse sampleResponse() {
    return new StandardEffortMetaResponse(
        List.of(new SolutionDto("PBX", "PBX", 10, true)),
        List.of(new SolutionVariantDto(
            "variant-1", "PBX", "avaya", "Avaya", "PBX Avaya", 10, true
        )),
        List.of(new BaseEffortRowDto(
            "base-1", "variant-1", "analysis", "Analysis",
            new BigDecimal("1.25"), 10, true
        )),
        List.of(new StandardItemRowDto(
            "item-1", 100, "Channel", "Voice", "IVR", "Basic", 10, true
        )),
        List.of(new CoefficientRowDto(
            "item-1", "variant-1", new BigDecimal("1.75"), true
        ))
    );
  }

  private static StandardEffortMetaResponse emptyResponse() {
    return new StandardEffortMetaResponse(
        List.of(),
        List.of(),
        List.of(),
        List.of(),
        List.of()
    );
  }

  private static StandardEffortProjectInputResponse sampleProjectInputResponse() {
    return new StandardEffortProjectInputResponse(
        List.of(new SolutionDto("PBX", "PBX", 10, true)),
        List.of(new SolutionVariantDto(
            "variant-1", "PBX", "avaya", "Avaya", "PBX Avaya", 10, true
        )),
        List.of(new BaseEffortRowDto(
            "base-1", "variant-1", "analysis", "Analysis",
            new BigDecimal("1.25"), 10, true
        )),
        List.of(new StandardItemRowDto(
            "item-1", 100, "Channel", "Voice", "IVR", "Basic", 10, true
        )),
        List.of(new CoefficientRowDto(
            "item-1", "variant-1", new BigDecimal("1.75"), true
        )),
        List.of(new ProjectSolutionSelectionDto(
            "42", "variant-1", true, new BigDecimal("3.50"),
            "2026-06-07T00:00:00Z", "2026-06-07T01:00:00Z"
        )),
        List.of(new ProjectItemSelectionDto(
            "42", "variant-1", "item-1", true,
            "2026-06-07T00:00:00Z", "2026-06-07T01:00:00Z"
        ))
    );
  }

  private static ProjectSolutionSelectionsResponse sampleSolutionSelectionsResponse() {
    return new ProjectSolutionSelectionsResponse(List.of(new ProjectSolutionSelectionDto(
        "42",
        "variant-1",
        true,
        new BigDecimal("1.25"),
        "2026-06-07T00:00:00Z",
        "2026-06-07T01:00:00Z"
    )));
  }

  private static ProjectItemSelectionsResponse sampleItemSelectionsResponse() {
    return new ProjectItemSelectionsResponse(List.of(new ProjectItemSelectionDto(
        "42",
        "variant-1",
        "item-1",
        true,
        "2026-06-07T00:00:00Z",
        "2026-06-07T01:00:00Z"
    )));
  }

  private static ProjectSolutionSelectionResponse sampleActualEffortResponse() {
    return new ProjectSolutionSelectionResponse(new ProjectSolutionSelectionDto(
        "42",
        "variant-1",
        false,
        new BigDecimal("2.50"),
        "2026-06-07T00:00:00Z",
        "2026-06-07T01:00:00Z"
    ));
  }

  private static CurrentUser user(List<String> roleCodes, List<String> permissionCodes) {
    return new CurrentUser(
        "user-1",
        "user@example.com",
        "User",
        null,
        roleCodes,
        permissionCodes,
        true,
        true
    );
  }

  @TestConfiguration
  static class TestConfig {

    @Bean
    TestCurrentUserProvider testCurrentUserProvider() {
      return new TestCurrentUserProvider();
    }
  }

  static final class TestCurrentUserProvider implements CurrentUserProvider {

    private CurrentUser user;

    void setUser(CurrentUser user) {
      this.user = user;
    }

    @Override
    public CurrentUser getCurrentUser() {
      return user;
    }

    @Override
    public PermissionSnapshot getPermissionSnapshot() {
      return PermissionSnapshot.from(user);
    }
  }
}
