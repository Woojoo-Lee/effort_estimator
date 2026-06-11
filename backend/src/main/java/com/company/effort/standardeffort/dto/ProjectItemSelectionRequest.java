package com.company.effort.standardeffort.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import java.util.LinkedHashMap;
import java.util.Map;

public class ProjectItemSelectionRequest {

  private String projectId;
  private String solutionVariantId;
  private String itemId;
  private Object checked;
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

  public String getItemId() {
    return itemId;
  }

  public void setItemId(String itemId) {
    this.itemId = itemId;
  }

  public Object getChecked() {
    return checked;
  }

  public void setChecked(Object checked) {
    this.checked = checked;
  }

  public Map<String, Object> getUnknownFields() {
    return Map.copyOf(unknownFields);
  }

  @JsonAnySetter
  public void setUnknownField(String name, Object value) {
    unknownFields.put(name, value);
  }
}
