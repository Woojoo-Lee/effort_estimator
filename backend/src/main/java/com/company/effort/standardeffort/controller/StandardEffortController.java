package com.company.effort.standardeffort.controller;

import com.company.effort.security.PermissionCodes;
import com.company.effort.security.RequirePermission;
import com.company.effort.standardeffort.dto.ProjectItemSelectionsResponse;
import com.company.effort.standardeffort.dto.ProjectSolutionSelectionResponse;
import com.company.effort.standardeffort.dto.ProjectSolutionSelectionsResponse;
import com.company.effort.standardeffort.dto.SaveProjectItemSelectionsRequest;
import com.company.effort.standardeffort.dto.SaveProjectSolutionSelectionsRequest;
import com.company.effort.standardeffort.dto.StandardEffortMetaResponse;
import com.company.effort.standardeffort.dto.StandardEffortProjectInputResponse;
import com.company.effort.standardeffort.dto.UpdateProjectActualEffortRequest;
import com.company.effort.standardeffort.service.StandardEffortService;
import com.company.effort.web.filter.RequestIdFilter;
import com.company.effort.web.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StandardEffortController {

  private final StandardEffortService standardEffortService;

  public StandardEffortController(StandardEffortService standardEffortService) {
    this.standardEffortService = standardEffortService;
  }

  @GetMapping("/api/standard-effort/meta")
  @RequirePermission(PermissionCodes.ROUTE_ESTIMATOR_READ)
  public ApiResponse<StandardEffortMetaResponse> getMeta(HttpServletRequest request) {
    return ApiResponse.ok(
        standardEffortService.getActiveMeta(),
        RequestIdFilter.getRequestId(request)
    );
  }

  @GetMapping("/api/projects/{projectId}/standard-effort")
  @RequirePermission(PermissionCodes.ROUTE_ESTIMATOR_READ)
  public ApiResponse<StandardEffortProjectInputResponse> getProjectInput(
      @PathVariable String projectId,
      HttpServletRequest request
  ) {
    return ApiResponse.ok(
        standardEffortService.getProjectInput(projectId),
        RequestIdFilter.getRequestId(request)
    );
  }

  @PutMapping("/api/projects/{projectId}/standard-effort/solutions")
  @RequirePermission(PermissionCodes.STANDARD_EFFORT_SELECTION_WRITE)
  public ApiResponse<ProjectSolutionSelectionsResponse> saveProjectSolutionSelections(
      @PathVariable String projectId,
      @RequestBody SaveProjectSolutionSelectionsRequest body,
      HttpServletRequest request
  ) {
    String requestId = RequestIdFilter.getRequestId(request);
    return ApiResponse.ok(
        standardEffortService.saveProjectSolutionSelections(projectId, body, requestId),
        requestId
    );
  }

  @PutMapping("/api/projects/{projectId}/standard-effort/items")
  @RequirePermission(PermissionCodes.STANDARD_EFFORT_SELECTION_WRITE)
  public ApiResponse<ProjectItemSelectionsResponse> saveProjectItemSelections(
      @PathVariable String projectId,
      @RequestBody SaveProjectItemSelectionsRequest body,
      HttpServletRequest request
  ) {
    String requestId = RequestIdFilter.getRequestId(request);
    return ApiResponse.ok(
        standardEffortService.saveProjectItemSelections(projectId, body, requestId),
        requestId
    );
  }

  @PutMapping("/api/projects/{projectId}/standard-effort/actual-effort")
  @RequirePermission(PermissionCodes.STANDARD_EFFORT_ACTUAL_EFFORT_WRITE)
  public ApiResponse<ProjectSolutionSelectionResponse> updateProjectActualEffort(
      @PathVariable String projectId,
      @RequestBody UpdateProjectActualEffortRequest body,
      HttpServletRequest request
  ) {
    String requestId = RequestIdFilter.getRequestId(request);
    return ApiResponse.ok(
        standardEffortService.updateProjectActualEffort(projectId, body, requestId),
        requestId
    );
  }
}
