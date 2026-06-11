package com.company.effort.standardeffort.repository;

import com.company.effort.standardeffort.dto.BaseEffortRowDto;
import com.company.effort.standardeffort.dto.CoefficientRowDto;
import com.company.effort.standardeffort.dto.ProjectItemSelectionDto;
import com.company.effort.standardeffort.dto.ProjectSolutionSelectionDto;
import com.company.effort.standardeffort.dto.SolutionDto;
import com.company.effort.standardeffort.dto.SolutionVariantDto;
import com.company.effort.standardeffort.dto.StandardItemRowDto;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

public interface StandardEffortRepository {

  List<SolutionDto> findActiveSolutions();

  List<SolutionVariantDto> findActiveSolutionVariants();

  List<BaseEffortRowDto> findActiveBaseEffortRows();

  List<StandardItemRowDto> findActiveItemRows();

  List<CoefficientRowDto> findActiveCoefficientRows();

  List<ProjectSolutionSelectionDto> findProjectSolutionSelections(String projectId);

  List<ProjectItemSelectionDto> findProjectItemSelections(String projectId);

  boolean activeSolutionVariantExists(String solutionVariantId);

  boolean activeItemExists(String itemId);

  boolean activeCoefficientExists(String itemId, String solutionVariantId);

  List<ProjectSolutionSelectionDto> findProjectSolutionSelectionsByVariantIds(
      String projectId,
      Collection<String> solutionVariantIds
  );

  List<ProjectSolutionSelectionDto> upsertProjectSolutionSelections(
      String projectId,
      List<ProjectSolutionSelectionDto> rows
  );

  ProjectSolutionSelectionDto updateProjectActualEffort(
      String projectId,
      String solutionVariantId,
      BigDecimal actualEffortMm
  );

  List<ProjectItemSelectionDto> findProjectItemSelectionsByKeys(
      String projectId,
      Collection<ProjectItemSelectionKey> keys
  );

  List<ProjectItemSelectionDto> upsertProjectItemSelections(
      String projectId,
      List<ProjectItemSelectionDto> rows
  );
}
