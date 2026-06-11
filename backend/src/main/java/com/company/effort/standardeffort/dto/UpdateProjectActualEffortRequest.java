package com.company.effort.standardeffort.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import java.util.LinkedHashMap;
import java.util.Map;

public class UpdateProjectActualEffortRequest {

  private String projectId;
  private String solutionVariantId;
  private Object actualEffortMm;
  private final Map<String, Object> unknownFields = new LinkedHashMap<>();

  public String getProjectId() {
    return projectId;
  }

  public void setProjectId(String projectId) {
    this.projectId = projectId;
  }

  public String getSolutionVariantId() {
    return solutionVariantId;
  }

  public void setSolutionVariantId(String solutionVariantId) {
    this.solutionVariantId = solutionVariantId;
  }

  public Object getActualEffortMm() {
    return actualEffortMm;
  }

  public void setActualEffortMm(Object actualEffortMm) {
    this.actualEffortMm = actualEffortMm;
  }

  public Map<String, Object> getUnknownFields() {
    return Map.copyOf(unknownFields);
  }

  @JsonAnySetter
  public void setUnknownField(String name, Object value) {
    unknownFields.put(name, value);
  }
}
