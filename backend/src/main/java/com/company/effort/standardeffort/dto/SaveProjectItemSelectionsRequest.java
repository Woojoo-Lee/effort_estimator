package com.company.effort.standardeffort.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class SaveProjectItemSelectionsRequest {

  private String projectId;
  private List<ProjectItemSelectionRequest> selections;
  private final Map<String, Object> unknownFields = new LinkedHashMap<>();

  public String getProjectId() {
    return projectId;
  }

  public void setProjectId(String projectId) {
    this.projectId = projectId;
  }

  public List<ProjectItemSelectionRequest> getSelections() {
    return selections;
  }

  public void setSelections(List<ProjectItemSelectionRequest> selections) {
    this.selections = selections;
  }

  public Map<String, Object> getUnknownFields() {
    return Map.copyOf(unknownFields);
  }

  @JsonAnySetter
  public void setUnknownField(String name, Object value) {
    unknownFields.put(name, value);
  }
}
