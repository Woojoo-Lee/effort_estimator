package com.company.effort.standardeffort.repository;

import com.company.effort.standardeffort.dto.BaseEffortRowDto;
import com.company.effort.standardeffort.dto.CoefficientRowDto;
import com.company.effort.standardeffort.dto.ProjectItemSelectionDto;
import com.company.effort.standardeffort.dto.ProjectSolutionSelectionDto;
import com.company.effort.standardeffort.dto.SolutionDto;
import com.company.effort.standardeffort.dto.SolutionVariantDto;
import com.company.effort.standardeffort.dto.StandardItemRowDto;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.StringJoiner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnBean(JdbcTemplate.class)
public class StandardEffortJdbcRepository implements StandardEffortRepository {

  private static final String ACTIVE_SOLUTIONS_SQL = """
      SELECT solution_code, solution_name, display_order, active
      FROM public.estimation_solution
      WHERE active = true
      ORDER BY display_order, solution_name
      """;

  private static final String ACTIVE_SOLUTION_VARIANTS_SQL = """
      SELECT solution_variant_id, solution_code, variant_code, variant_name,
             display_name, display_order, active
      FROM public.estimation_solution_variant
      WHERE active = true
      ORDER BY display_order, solution_code, variant_code
      """;

  private static final String ACTIVE_BASE_EFFORT_ROWS_SQL = """
      SELECT base_effort_id, solution_variant_id, phase_code, phase_name,
             effort_mm, display_order, active
      FROM public.estimation_standard_base_effort_meta
      WHERE active = true
      ORDER BY solution_variant_id, display_order, phase_code
      """;

  private static final String ACTIVE_ITEM_ROWS_SQL = """
      SELECT item_id, excel_row_no, category_l1, category_l2, item_name,
             item_option, display_order, active
      FROM public.estimation_standard_item_meta
      WHERE active = true
      ORDER BY display_order, category_l1, item_name, item_option
      """;

  private static final String ACTIVE_COEFFICIENT_ROWS_SQL = """
      SELECT item_id, solution_variant_id, coefficient, active
      FROM public.estimation_item_solution_coefficient_meta
      WHERE active = true
      ORDER BY solution_variant_id, item_id
      """;

  static final String PROJECT_SOLUTION_SELECTIONS_SQL = """
      SELECT project_id::text AS project_id,
             solution_variant_id::text AS solution_variant_id,
             enabled,
             actual_effort_mm,
             created_at,
             updated_at
      FROM public.estimation_project_solution_selection
      WHERE project_id = CAST(? AS bigint)
      ORDER BY solution_variant_id
      """;

  static final String ACTIVE_SOLUTION_VARIANT_EXISTS_SQL = """
      SELECT COUNT(1)
      FROM public.estimation_solution_variant
      WHERE solution_variant_id = CAST(? AS uuid)
        AND active = true
      """;

  static final String ACTIVE_ITEM_EXISTS_SQL = """
      SELECT COUNT(1)
      FROM public.estimation_standard_item_meta
      WHERE item_id = CAST(? AS uuid)
        AND active = true
      """;

  static final String ACTIVE_COEFFICIENT_EXISTS_SQL = """
      SELECT COUNT(1)
      FROM public.estimation_item_solution_coefficient_meta
      WHERE item_id = CAST(? AS uuid)
        AND solution_variant_id = CAST(? AS uuid)
        AND active = true
      """;

  static final String PROJECT_SOLUTION_SELECTIONS_BY_VARIANT_IDS_SQL_PREFIX = """
      SELECT project_id::text AS project_id,
             solution_variant_id::text AS solution_variant_id,
             enabled,
             actual_effort_mm,
             created_at,
             updated_at
      FROM public.estimation_project_solution_selection
      WHERE project_id = CAST(? AS bigint)
        AND solution_variant_id IN (
      """;

  static final String UPSERT_PROJECT_SOLUTION_SELECTION_SQL = """
      INSERT INTO public.estimation_project_solution_selection (
        project_id,
        solution_variant_id,
        enabled,
        actual_effort_mm,
        updated_at
      ) VALUES (
        CAST(? AS bigint),
        CAST(? AS uuid),
        ?,
        ?,
        now()
      )
      ON CONFLICT (project_id, solution_variant_id)
      DO UPDATE SET
        enabled = EXCLUDED.enabled,
        actual_effort_mm = EXCLUDED.actual_effort_mm,
        updated_at = now()
      RETURNING
        project_id::text AS project_id,
        solution_variant_id::text AS solution_variant_id,
        enabled,
        actual_effort_mm,
        created_at,
        updated_at
      """;

  static final String UPSERT_PROJECT_ACTUAL_EFFORT_SQL = """
      INSERT INTO public.estimation_project_solution_selection (
        project_id,
        solution_variant_id,
        enabled,
        actual_effort_mm,
        updated_at
      ) VALUES (
        CAST(? AS bigint),
        CAST(? AS uuid),
        true,
        ?,
        now()
      )
      ON CONFLICT (project_id, solution_variant_id)
      DO UPDATE SET
        actual_effort_mm = EXCLUDED.actual_effort_mm,
        updated_at = now()
      RETURNING
        project_id::text AS project_id,
        solution_variant_id::text AS solution_variant_id,
        enabled,
        actual_effort_mm,
        created_at,
        updated_at
      """;

  private static final String PROJECT_ITEM_SELECTIONS_SQL = """
      SELECT project_id::text AS project_id,
             solution_variant_id::text AS solution_variant_id,
             item_id::text AS item_id,
             checked,
             created_at,
             updated_at
      FROM public.estimation_project_item_solution_selection
      WHERE project_id = CAST(? AS bigint)
      ORDER BY solution_variant_id, item_id
      """;

  static final String PROJECT_ITEM_SELECTION_BY_KEY_SQL = """
      SELECT project_id::text AS project_id,
             solution_variant_id::text AS solution_variant_id,
             item_id::text AS item_id,
             checked,
             created_at,
             updated_at
      FROM public.estimation_project_item_solution_selection
      WHERE project_id = CAST(? AS bigint)
        AND solution_variant_id = CAST(? AS uuid)
        AND item_id = CAST(? AS uuid)
      ORDER BY solution_variant_id, item_id
      """;

  static final String UPSERT_PROJECT_ITEM_SELECTION_SQL = """
      INSERT INTO public.estimation_project_item_solution_selection (
        project_id,
        solution_variant_id,
        item_id,
        checked,
        updated_at
      ) VALUES (
        CAST(? AS bigint),
        CAST(? AS uuid),
        CAST(? AS uuid),
        ?,
        now()
      )
      ON CONFLICT (project_id, solution_variant_id, item_id)
      DO UPDATE SET
        checked = EXCLUDED.checked,
        updated_at = now()
      RETURNING
        project_id::text AS project_id,
        solution_variant_id::text AS solution_variant_id,
        item_id::text AS item_id,
        checked,
        created_at,
        updated_at
      """;

  private final JdbcTemplate jdbcTemplate;

  public StandardEffortJdbcRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public List<SolutionDto> findActiveSolutions() {
    return jdbcTemplate.query(ACTIVE_SOLUTIONS_SQL, this::mapSolution);
  }

  @Override
  public List<SolutionVariantDto> findActiveSolutionVariants() {
    return jdbcTemplate.query(ACTIVE_SOLUTION_VARIANTS_SQL, this::mapSolutionVariant);
  }

  @Override
  public List<BaseEffortRowDto> findActiveBaseEffortRows() {
    return jdbcTemplate.query(ACTIVE_BASE_EFFORT_ROWS_SQL, this::mapBaseEffortRow);
  }

  @Override
  public List<StandardItemRowDto> findActiveItemRows() {
    return jdbcTemplate.query(ACTIVE_ITEM_ROWS_SQL, this::mapItemRow);
  }

  @Override
  public List<CoefficientRowDto> findActiveCoefficientRows() {
    return jdbcTemplate.query(ACTIVE_COEFFICIENT_ROWS_SQL, this::mapCoefficientRow);
  }

  @Override
  public List<ProjectSolutionSelectionDto> findProjectSolutionSelections(String projectId) {
    return jdbcTemplate.query(
        PROJECT_SOLUTION_SELECTIONS_SQL,
        this::mapProjectSolutionSelection,
        projectId
    );
  }

  @Override
  public List<ProjectItemSelectionDto> findProjectItemSelections(String projectId) {
    return jdbcTemplate.query(
        PROJECT_ITEM_SELECTIONS_SQL,
        this::mapProjectItemSelection,
        projectId
    );
  }

  @Override
  public boolean activeSolutionVariantExists(String solutionVariantId) {
    Integer count = jdbcTemplate.queryForObject(
        ACTIVE_SOLUTION_VARIANT_EXISTS_SQL,
        Integer.class,
        solutionVariantId
    );
    return count != null && count > 0;
  }

  @Override
  public boolean activeItemExists(String itemId) {
    Integer count = jdbcTemplate.queryForObject(
        ACTIVE_ITEM_EXISTS_SQL,
        Integer.class,
        itemId
    );
    return count != null && count > 0;
  }

  @Override
  public boolean activeCoefficientExists(String itemId, String solutionVariantId) {
    Integer count = jdbcTemplate.queryForObject(
        ACTIVE_COEFFICIENT_EXISTS_SQL,
        Integer.class,
        itemId,
        solutionVariantId
    );
    return count != null && count > 0;
  }

  @Override
  public List<ProjectSolutionSelectionDto> findProjectSolutionSelectionsByVariantIds(
      String projectId,
      Collection<String> solutionVariantIds
  ) {
    if (solutionVariantIds == null || solutionVariantIds.isEmpty()) {
      return List.of();
    }

    String sql = buildProjectSolutionSelectionsByVariantIdsSql(solutionVariantIds.size());
    List<Object> args = new ArrayList<>();
    args.add(projectId);
    args.addAll(solutionVariantIds);

    return jdbcTemplate.query(
        sql,
        this::mapProjectSolutionSelection,
        args.toArray()
    );
  }

  @Override
  public List<ProjectSolutionSelectionDto> upsertProjectSolutionSelections(
      String projectId,
      List<ProjectSolutionSelectionDto> rows
  ) {
    if (rows == null || rows.isEmpty()) {
      return List.of();
    }

    List<ProjectSolutionSelectionDto> savedRows = new ArrayList<>();
    for (ProjectSolutionSelectionDto row : rows) {
      savedRows.add(jdbcTemplate.queryForObject(
          UPSERT_PROJECT_SOLUTION_SELECTION_SQL,
          this::mapProjectSolutionSelection,
          projectId,
          row.solutionVariantId(),
          row.enabled(),
          row.actualEffortMm()
      ));
    }

    return List.copyOf(savedRows);
  }

  @Override
  public ProjectSolutionSelectionDto updateProjectActualEffort(
      String projectId,
      String solutionVariantId,
      BigDecimal actualEffortMm
  ) {
    return jdbcTemplate.queryForObject(
        UPSERT_PROJECT_ACTUAL_EFFORT_SQL,
        this::mapProjectSolutionSelection,
        projectId,
        solutionVariantId,
        actualEffortMm
    );
  }

  @Override
  public List<ProjectItemSelectionDto> findProjectItemSelectionsByKeys(
      String projectId,
      Collection<ProjectItemSelectionKey> keys
  ) {
    if (keys == null || keys.isEmpty()) {
      return List.of();
    }

    List<ProjectItemSelectionDto> beforeRows = new ArrayList<>();
    for (ProjectItemSelectionKey key : keys) {
      beforeRows.addAll(jdbcTemplate.query(
          PROJECT_ITEM_SELECTION_BY_KEY_SQL,
          this::mapProjectItemSelection,
          projectId,
          key.solutionVariantId(),
          key.itemId()
      ));
    }

    return List.copyOf(beforeRows);
  }

  @Override
  public List<ProjectItemSelectionDto> upsertProjectItemSelections(
      String projectId,
      List<ProjectItemSelectionDto> rows
  ) {
    if (rows == null || rows.isEmpty()) {
      return List.of();
    }

    List<ProjectItemSelectionDto> savedRows = new ArrayList<>();
    for (ProjectItemSelectionDto row : rows) {
      savedRows.add(jdbcTemplate.queryForObject(
          UPSERT_PROJECT_ITEM_SELECTION_SQL,
          this::mapProjectItemSelection,
          projectId,
          row.solutionVariantId(),
          row.itemId(),
          row.checked()
      ));
    }

    return List.copyOf(savedRows);
  }

  private SolutionDto mapSolution(ResultSet resultSet, int rowNumber) throws SQLException {
    return new SolutionDto(
        resultSet.getString("solution_code"),
        resultSet.getString("solution_name"),
        resultSet.getInt("display_order"),
        resultSet.getBoolean("active")
    );
  }

  private SolutionVariantDto mapSolutionVariant(ResultSet resultSet, int rowNumber)
      throws SQLException {
    return new SolutionVariantDto(
        resultSet.getString("solution_variant_id"),
        resultSet.getString("solution_code"),
        resultSet.getString("variant_code"),
        resultSet.getString("variant_name"),
        resultSet.getString("display_name"),
        resultSet.getInt("display_order"),
        resultSet.getBoolean("active")
    );
  }

  private BaseEffortRowDto mapBaseEffortRow(ResultSet resultSet, int rowNumber)
      throws SQLException {
    return new BaseEffortRowDto(
        resultSet.getString("base_effort_id"),
        resultSet.getString("solution_variant_id"),
        resultSet.getString("phase_code"),
        resultSet.getString("phase_name"),
        valueOrZero(resultSet.getBigDecimal("effort_mm")),
        resultSet.getInt("display_order"),
        resultSet.getBoolean("active")
    );
  }

  private StandardItemRowDto mapItemRow(ResultSet resultSet, int rowNumber)
      throws SQLException {
    return new StandardItemRowDto(
        resultSet.getString("item_id"),
        resultSet.getInt("excel_row_no"),
        resultSet.getString("category_l1"),
        resultSet.getString("category_l2"),
        resultSet.getString("item_name"),
        resultSet.getString("item_option"),
        resultSet.getInt("display_order"),
        resultSet.getBoolean("active")
    );
  }

  private CoefficientRowDto mapCoefficientRow(ResultSet resultSet, int rowNumber)
      throws SQLException {
    return new CoefficientRowDto(
        resultSet.getString("item_id"),
        resultSet.getString("solution_variant_id"),
        valueOrZero(resultSet.getBigDecimal("coefficient")),
        resultSet.getBoolean("active")
    );
  }

  private ProjectSolutionSelectionDto mapProjectSolutionSelection(
      ResultSet resultSet,
      int rowNumber
  ) throws SQLException {
    return new ProjectSolutionSelectionDto(
        resultSet.getString("project_id"),
        resultSet.getString("solution_variant_id"),
        resultSet.getBoolean("enabled"),
        valueOrZero(resultSet.getBigDecimal("actual_effort_mm")),
        resultSet.getString("created_at"),
        resultSet.getString("updated_at")
    );
  }

  private ProjectItemSelectionDto mapProjectItemSelection(ResultSet resultSet, int rowNumber)
      throws SQLException {
    return new ProjectItemSelectionDto(
        resultSet.getString("project_id"),
        resultSet.getString("solution_variant_id"),
        resultSet.getString("item_id"),
        resultSet.getBoolean("checked"),
        resultSet.getString("created_at"),
        resultSet.getString("updated_at")
    );
  }

  private BigDecimal valueOrZero(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }

  private String buildProjectSolutionSelectionsByVariantIdsSql(int variantCount) {
    StringJoiner placeholders = new StringJoiner(", ");
    for (int index = 0; index < variantCount; index += 1) {
      placeholders.add("CAST(? AS uuid)");
    }

    return PROJECT_SOLUTION_SELECTIONS_BY_VARIANT_IDS_SQL_PREFIX
        + placeholders
        + """
          )
      ORDER BY solution_variant_id
      """;
  }
}
