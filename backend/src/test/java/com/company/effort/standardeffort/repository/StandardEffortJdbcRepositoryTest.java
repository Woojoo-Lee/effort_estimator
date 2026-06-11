package com.company.effort.standardeffort.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.company.effort.standardeffort.dto.BaseEffortRowDto;
import com.company.effort.standardeffort.dto.CoefficientRowDto;
import com.company.effort.standardeffort.dto.ProjectItemSelectionDto;
import com.company.effort.standardeffort.dto.ProjectSolutionSelectionDto;
import com.company.effort.standardeffort.dto.SolutionDto;
import com.company.effort.standardeffort.dto.SolutionVariantDto;
import com.company.effort.standardeffort.dto.StandardItemRowDto;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class StandardEffortJdbcRepositoryTest {

  @Test
  void findActiveSolutionsUsesActiveFilter() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.query(anyString(), ArgumentMatchers.<RowMapper<SolutionDto>>any()))
        .thenReturn(List.of());
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    repository.findActiveSolutions();

    String sql = capturedSql(jdbcTemplate, SolutionDto.class);
    assertThat(sql).contains("FROM public.estimation_solution");
    assertThat(sql).contains("WHERE active = true");
  }

  @Test
  void findActiveSolutionVariantsUsesActiveFilter() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.query(anyString(), ArgumentMatchers.<RowMapper<SolutionVariantDto>>any()))
        .thenReturn(List.of());
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    repository.findActiveSolutionVariants();

    String sql = capturedSql(jdbcTemplate, SolutionVariantDto.class);
    assertThat(sql).contains("FROM public.estimation_solution_variant");
    assertThat(sql).contains("WHERE active = true");
  }

  @Test
  void findActiveBaseEffortRowsSelectsEffortMm() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.query(anyString(), ArgumentMatchers.<RowMapper<BaseEffortRowDto>>any()))
        .thenReturn(List.of());
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    repository.findActiveBaseEffortRows();

    String sql = capturedSql(jdbcTemplate, BaseEffortRowDto.class);
    assertThat(sql).contains("effort_mm");
    assertThat(sql).doesNotContain("effort_md");
    assertThat(sql).contains("WHERE active = true");
  }

  @Test
  void findActiveItemRowsUsesActiveFilter() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.query(anyString(), ArgumentMatchers.<RowMapper<StandardItemRowDto>>any()))
        .thenReturn(List.of());
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    repository.findActiveItemRows();

    String sql = capturedSql(jdbcTemplate, StandardItemRowDto.class);
    assertThat(sql).contains("FROM public.estimation_standard_item_meta");
    assertThat(sql).contains("WHERE active = true");
  }

  @Test
  void findActiveCoefficientRowsUsesActiveFilter() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.query(anyString(), ArgumentMatchers.<RowMapper<CoefficientRowDto>>any()))
        .thenReturn(List.of());
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    repository.findActiveCoefficientRows();

    String sql = capturedSql(jdbcTemplate, CoefficientRowDto.class);
    assertThat(sql).contains("FROM public.estimation_item_solution_coefficient_meta");
    assertThat(sql).contains("WHERE active = true");
  }

  @Test
  void baseEffortRowMapperMapsEffortMmAndStringIds() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.query(anyString(), ArgumentMatchers.<RowMapper<BaseEffortRowDto>>any()))
        .thenReturn(List.of());
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    repository.findActiveBaseEffortRows();

    RowMapper<BaseEffortRowDto> mapper = capturedMapper(jdbcTemplate);
    ResultSet resultSet = mock(ResultSet.class);
    when(resultSet.getString("base_effort_id")).thenReturn("base-1");
    when(resultSet.getString("solution_variant_id")).thenReturn("variant-1");
    when(resultSet.getString("phase_code")).thenReturn("analysis");
    when(resultSet.getString("phase_name")).thenReturn("Analysis");
    when(resultSet.getBigDecimal("effort_mm")).thenReturn(new BigDecimal("1.25"));
    when(resultSet.getInt("display_order")).thenReturn(10);
    when(resultSet.getBoolean("active")).thenReturn(true);

    BaseEffortRowDto row = mapper.mapRow(resultSet, 0);

    assertThat(row.baseEffortId()).isEqualTo("base-1");
    assertThat(row.solutionVariantId()).isEqualTo("variant-1");
    assertThat(row.effortMm()).isEqualByComparingTo("1.25");
    assertThat(row.active()).isTrue();
  }

  @Test
  void coefficientRowMapperMapsCoefficientAndStringIds() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.query(anyString(), ArgumentMatchers.<RowMapper<CoefficientRowDto>>any()))
        .thenReturn(List.of());
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    repository.findActiveCoefficientRows();

    RowMapper<CoefficientRowDto> mapper = capturedMapper(jdbcTemplate);
    ResultSet resultSet = mock(ResultSet.class);
    when(resultSet.getString("item_id")).thenReturn("item-1");
    when(resultSet.getString("solution_variant_id")).thenReturn("variant-1");
    when(resultSet.getBigDecimal("coefficient")).thenReturn(new BigDecimal("1.75"));
    when(resultSet.getBoolean("active")).thenReturn(true);

    CoefficientRowDto row = mapper.mapRow(resultSet, 0);

    assertThat(row.itemId()).isEqualTo("item-1");
    assertThat(row.solutionVariantId()).isEqualTo("variant-1");
    assertThat(row.coefficient()).isEqualByComparingTo("1.75");
    assertThat(row.active()).isTrue();
  }

  @Test
  void findProjectSolutionSelectionsUsesProjectSelectionSqlAndBigintCast() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    repository.findProjectSolutionSelections("9007199254740993");

    String sql = capturedSqlWithProjectId(jdbcTemplate, "9007199254740993");
    assertThat(sql).contains("FROM public.estimation_project_solution_selection");
    assertThat(sql).contains("project_id = CAST(? AS bigint)");
    assertThat(sql).contains("project_id::text AS project_id");
    assertThat(sql).contains("solution_variant_id::text AS solution_variant_id");
    assertThat(sql).contains("actual_effort_mm");
    assertThat(sql).doesNotContain("actual_effort_md");
    assertThat(sql.toLowerCase()).doesNotContain("uuid");
  }

  @Test
  void projectSolutionSelectionMapperMapsStringIdsAndActualEffortMm() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    repository.findProjectSolutionSelections("42");

    RowMapper<ProjectSolutionSelectionDto> mapper =
        capturedMapperWithProjectId(jdbcTemplate, "42");
    ResultSet resultSet = mock(ResultSet.class);
    when(resultSet.getString("project_id")).thenReturn("42");
    when(resultSet.getString("solution_variant_id")).thenReturn("variant-1");
    when(resultSet.getBoolean("enabled")).thenReturn(true);
    when(resultSet.getBigDecimal("actual_effort_mm")).thenReturn(new BigDecimal("2.50"));
    when(resultSet.getString("created_at")).thenReturn("2026-06-07T00:00:00Z");
    when(resultSet.getString("updated_at")).thenReturn("2026-06-07T01:00:00Z");

    ProjectSolutionSelectionDto row = mapper.mapRow(resultSet, 0);

    assertThat(row.projectId()).isEqualTo("42");
    assertThat(row.solutionVariantId()).isEqualTo("variant-1");
    assertThat(row.enabled()).isTrue();
    assertThat(row.actualEffortMm()).isEqualByComparingTo("2.50");
    assertThat(row.createdAt()).isEqualTo("2026-06-07T00:00:00Z");
    assertThat(row.updatedAt()).isEqualTo("2026-06-07T01:00:00Z");
  }

  @Test
  void projectSolutionSelectionMapperDefaultsNullActualEffortMmToZero() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    repository.findProjectSolutionSelections("42");

    RowMapper<ProjectSolutionSelectionDto> mapper =
        capturedMapperWithProjectId(jdbcTemplate, "42");
    ResultSet resultSet = mock(ResultSet.class);
    when(resultSet.getString("project_id")).thenReturn("42");
    when(resultSet.getString("solution_variant_id")).thenReturn("variant-1");
    when(resultSet.getBigDecimal("actual_effort_mm")).thenReturn(null);

    ProjectSolutionSelectionDto row = mapper.mapRow(resultSet, 0);

    assertThat(row.actualEffortMm()).isEqualByComparingTo("0");
  }

  @Test
  void findProjectItemSelectionsUsesProjectSelectionSqlAndBigintCast() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    repository.findProjectItemSelections("42");

    String sql = capturedSqlWithProjectId(jdbcTemplate, "42");
    assertThat(sql).contains("FROM public.estimation_project_item_solution_selection");
    assertThat(sql).contains("project_id = CAST(? AS bigint)");
    assertThat(sql).contains("project_id::text AS project_id");
    assertThat(sql).contains("solution_variant_id::text AS solution_variant_id");
    assertThat(sql).contains("item_id::text AS item_id");
    assertThat(sql.toLowerCase()).doesNotContain("uuid");
  }

  @Test
  void projectItemSelectionMapperMapsStringIdsAndChecked() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    repository.findProjectItemSelections("42");

    RowMapper<ProjectItemSelectionDto> mapper =
        capturedMapperWithProjectId(jdbcTemplate, "42");
    ResultSet resultSet = mock(ResultSet.class);
    when(resultSet.getString("project_id")).thenReturn("42");
    when(resultSet.getString("solution_variant_id")).thenReturn("variant-1");
    when(resultSet.getString("item_id")).thenReturn("item-1");
    when(resultSet.getBoolean("checked")).thenReturn(true);
    when(resultSet.getString("created_at")).thenReturn("2026-06-07T00:00:00Z");
    when(resultSet.getString("updated_at")).thenReturn("2026-06-07T01:00:00Z");

    ProjectItemSelectionDto row = mapper.mapRow(resultSet, 0);

    assertThat(row.projectId()).isEqualTo("42");
    assertThat(row.solutionVariantId()).isEqualTo("variant-1");
    assertThat(row.itemId()).isEqualTo("item-1");
    assertThat(row.checked()).isTrue();
    assertThat(row.createdAt()).isEqualTo("2026-06-07T00:00:00Z");
    assertThat(row.updatedAt()).isEqualTo("2026-06-07T01:00:00Z");
  }

  @Test
  void activeSolutionVariantExistsUsesActiveVariantSql() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.queryForObject(
        anyString(),
        eq(Integer.class),
        eq("variant-1")
    )).thenReturn(1);
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    boolean exists = repository.activeSolutionVariantExists("variant-1");

    assertThat(exists).isTrue();
    ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
    verify(jdbcTemplate).queryForObject(
        sqlCaptor.capture(),
        eq(Integer.class),
        eq("variant-1")
    );
    assertThat(sqlCaptor.getValue())
        .contains("FROM public.estimation_solution_variant")
        .contains("active = true");
  }

  @Test
  void activeItemExistsUsesActiveItemSql() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.queryForObject(
        anyString(),
        eq(Integer.class),
        eq("item-1")
    )).thenReturn(1);
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    boolean exists = repository.activeItemExists("item-1");

    assertThat(exists).isTrue();
    ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
    verify(jdbcTemplate).queryForObject(
        sqlCaptor.capture(),
        eq(Integer.class),
        eq("item-1")
    );
    assertThat(sqlCaptor.getValue())
        .contains("FROM public.estimation_standard_item_meta")
        .contains("item_id = CAST(? AS uuid)")
        .contains("active = true");
  }

  @Test
  void activeCoefficientExistsUsesActiveCoefficientSql() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.queryForObject(
        anyString(),
        eq(Integer.class),
        eq("item-1"),
        eq("variant-1")
    )).thenReturn(1);
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    boolean exists = repository.activeCoefficientExists("item-1", "variant-1");

    assertThat(exists).isTrue();
    ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
    verify(jdbcTemplate).queryForObject(
        sqlCaptor.capture(),
        eq(Integer.class),
        eq("item-1"),
        eq("variant-1")
    );
    assertThat(sqlCaptor.getValue())
        .contains("FROM public.estimation_item_solution_coefficient_meta")
        .contains("item_id = CAST(? AS uuid)")
        .contains("solution_variant_id = CAST(? AS uuid)")
        .contains("active = true");
  }

  @Test
  void findProjectSolutionSelectionsByVariantIdsUsesProjectIdBigintAndActualEffortMm() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.query(
        anyString(),
        ArgumentMatchers.<RowMapper<ProjectSolutionSelectionDto>>any(),
        any(),
        any(),
        any()
    )).thenReturn(List.of());
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    repository.findProjectSolutionSelectionsByVariantIds(
        "9007199254740993",
        List.of("variant-1", "variant-2")
    );

    ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
    verify(jdbcTemplate).query(
        sqlCaptor.capture(),
        ArgumentMatchers.<RowMapper<ProjectSolutionSelectionDto>>any(),
        eq("9007199254740993"),
        eq("variant-1"),
        eq("variant-2")
    );
    assertThat(sqlCaptor.getValue())
        .contains("project_id = CAST(? AS bigint)")
        .contains("actual_effort_mm")
        .doesNotContain("actual_effort_md")
        .doesNotContain("project_id::uuid");
  }

  @Test
  void upsertProjectSolutionSelectionsUsesConflictAndActualEffortMm() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ProjectSolutionSelectionDto savedRow = new ProjectSolutionSelectionDto(
        "42", "variant-1", true, new BigDecimal("1.25"),
        "2026-06-07T00:00:00Z", "2026-06-07T01:00:00Z"
    );
    when(jdbcTemplate.queryForObject(
        anyString(),
        ArgumentMatchers.<RowMapper<ProjectSolutionSelectionDto>>any(),
        any(),
        any(),
        any(),
        any()
    )).thenReturn(savedRow);
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    List<ProjectSolutionSelectionDto> result = repository.upsertProjectSolutionSelections(
        "9007199254740993",
        List.of(new ProjectSolutionSelectionDto(
            "9007199254740993", "variant-1", true, new BigDecimal("1.25"),
            null, null
        ))
    );

    ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
    verify(jdbcTemplate).queryForObject(
        sqlCaptor.capture(),
        ArgumentMatchers.<RowMapper<ProjectSolutionSelectionDto>>any(),
        eq("9007199254740993"),
        eq("variant-1"),
        eq(true),
        eq(new BigDecimal("1.25"))
    );
    assertThat(sqlCaptor.getValue())
        .contains("INSERT INTO public.estimation_project_solution_selection")
        .contains("ON CONFLICT (project_id, solution_variant_id)")
        .contains("actual_effort_mm")
        .doesNotContain("actual_effort_md");
    assertThat(result.get(0).projectId()).isEqualTo("42");
  }

  @Test
  void updateProjectActualEffortUsesConflictAndPreservesEnabledOnUpdate() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ProjectSolutionSelectionDto savedRow = new ProjectSolutionSelectionDto(
        "42", "variant-1", false, new BigDecimal("2.50"),
        "2026-06-07T00:00:00Z", "2026-06-07T01:00:00Z"
    );
    when(jdbcTemplate.queryForObject(
        anyString(),
        ArgumentMatchers.<RowMapper<ProjectSolutionSelectionDto>>any(),
        any(),
        any(),
        any()
    )).thenReturn(savedRow);
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    ProjectSolutionSelectionDto result = repository.updateProjectActualEffort(
        "9007199254740993",
        "variant-1",
        new BigDecimal("2.50")
    );

    ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
    verify(jdbcTemplate).queryForObject(
        sqlCaptor.capture(),
        ArgumentMatchers.<RowMapper<ProjectSolutionSelectionDto>>any(),
        eq("9007199254740993"),
        eq("variant-1"),
        eq(new BigDecimal("2.50"))
    );
    assertThat(sqlCaptor.getValue())
        .contains("INSERT INTO public.estimation_project_solution_selection")
        .contains("ON CONFLICT (project_id, solution_variant_id)")
        .contains("enabled,")
        .contains("true")
        .contains("actual_effort_mm")
        .contains("project_id::text AS project_id")
        .contains("solution_variant_id::text AS solution_variant_id")
        .contains("CAST(? AS bigint)")
        .doesNotContain("actual_effort_md")
        .doesNotContain("enabled = EXCLUDED.enabled");
    assertThat(result.projectId()).isEqualTo("42");
    assertThat(result.solutionVariantId()).isEqualTo("variant-1");
    assertThat(result.actualEffortMm()).isEqualByComparingTo("2.50");
  }


  @Test
  void findProjectItemSelectionsByKeysUsesItemSelectionTableAndBigintCast() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.query(
        anyString(),
        ArgumentMatchers.<RowMapper<ProjectItemSelectionDto>>any(),
        any(),
        any(),
        any()
    )).thenReturn(List.of());
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    repository.findProjectItemSelectionsByKeys(
        "9007199254740993",
        List.of(new ProjectItemSelectionKey("variant-1", "item-1"))
    );

    ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
    verify(jdbcTemplate).query(
        sqlCaptor.capture(),
        ArgumentMatchers.<RowMapper<ProjectItemSelectionDto>>any(),
        eq("9007199254740993"),
        eq("variant-1"),
        eq("item-1")
    );
    assertThat(sqlCaptor.getValue())
        .contains("FROM public.estimation_project_item_solution_selection")
        .contains("project_id = CAST(? AS bigint)")
        .contains("solution_variant_id = CAST(? AS uuid)")
        .contains("item_id = CAST(? AS uuid)")
        .contains("item_id::text AS item_id")
        .doesNotContain("actual_effort_mm")
        .doesNotContain("actual_effort_md");
  }

  @Test
  void upsertProjectItemSelectionsUsesConflictAndCheckedOnly() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ProjectItemSelectionDto savedRow = new ProjectItemSelectionDto(
        "42", "variant-1", "item-1", true,
        "2026-06-07T00:00:00Z", "2026-06-07T01:00:00Z"
    );
    when(jdbcTemplate.queryForObject(
        anyString(),
        ArgumentMatchers.<RowMapper<ProjectItemSelectionDto>>any(),
        any(),
        any(),
        any(),
        any()
    )).thenReturn(savedRow);
    StandardEffortJdbcRepository repository = new StandardEffortJdbcRepository(jdbcTemplate);

    List<ProjectItemSelectionDto> result = repository.upsertProjectItemSelections(
        "9007199254740993",
        List.of(new ProjectItemSelectionDto(
            "9007199254740993", "variant-1", "item-1", true,
            null, null
        ))
    );

    ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
    verify(jdbcTemplate).queryForObject(
        sqlCaptor.capture(),
        ArgumentMatchers.<RowMapper<ProjectItemSelectionDto>>any(),
        eq("9007199254740993"),
        eq("variant-1"),
        eq("item-1"),
        eq(true)
    );
    assertThat(sqlCaptor.getValue())
        .contains("INSERT INTO public.estimation_project_item_solution_selection")
        .contains("ON CONFLICT (project_id, solution_variant_id, item_id)")
        .contains("checked")
        .doesNotContain("effort_mm")
        .doesNotContain("actual_effort_mm")
        .doesNotContain("actual_effort_md");
    assertThat(result.get(0).projectId()).isEqualTo("42");
  }

  @SuppressWarnings({"rawtypes", "unchecked"})
  private static <T> String capturedSql(JdbcTemplate jdbcTemplate, Class<T> ignoredType) {
    ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
    verify(jdbcTemplate).query(sqlCaptor.capture(), ArgumentMatchers.<RowMapper>any());
    return sqlCaptor.getValue();
  }

  @SuppressWarnings({"rawtypes", "unchecked"})
  private static <T> RowMapper<T> capturedMapper(JdbcTemplate jdbcTemplate) {
    ArgumentCaptor<RowMapper> mapperCaptor = ArgumentCaptor.forClass(RowMapper.class);
    verify(jdbcTemplate).query(anyString(), mapperCaptor.capture());
    return mapperCaptor.getValue();
  }

  @SuppressWarnings({"rawtypes", "unchecked"})
  private static String capturedSqlWithProjectId(
      JdbcTemplate jdbcTemplate,
      String expectedProjectId
  ) {
    ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
    verify(jdbcTemplate).query(
        sqlCaptor.capture(),
        ArgumentMatchers.<RowMapper>any(),
        eq(expectedProjectId)
    );
    return sqlCaptor.getValue();
  }

  @SuppressWarnings({"rawtypes", "unchecked"})
  private static <T> RowMapper<T> capturedMapperWithProjectId(
      JdbcTemplate jdbcTemplate,
      String expectedProjectId
  ) {
    ArgumentCaptor<RowMapper> mapperCaptor = ArgumentCaptor.forClass(RowMapper.class);
    verify(jdbcTemplate).query(
        anyString(),
        mapperCaptor.capture(),
        eq(expectedProjectId)
    );
    return mapperCaptor.getValue();
  }
}
