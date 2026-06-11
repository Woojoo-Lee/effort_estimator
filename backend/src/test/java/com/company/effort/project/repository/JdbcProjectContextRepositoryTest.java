package com.company.effort.project.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.company.effort.project.dto.ProjectSummaryDto;
import java.sql.ResultSet;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class JdbcProjectContextRepositoryTest {

  @Test
  void findProjectSummarySqlUsesEstimationProjectsAndBigintCast() {
    assertThat(JdbcProjectContextRepository.PROJECT_SUMMARY_SQL)
        .contains("FROM public.estimation_projects p")
        .contains("WHERE p.id = CAST(? AS bigint)")
        .contains("p.id::text AS project_id")
        .doesNotContain("uuid");
  }

  @Test
  void findProjectSummaryQueriesByProjectIdString() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.query(
        anyString(),
        ArgumentMatchers.<RowMapper<ProjectSummaryDto>>any(),
        ArgumentMatchers.eq("42")
    )).thenReturn(List.of());
    JdbcProjectContextRepository repository = new JdbcProjectContextRepository(jdbcTemplate);

    Optional<ProjectSummaryDto> result = repository.findProjectSummary("42");

    assertThat(result).isEmpty();
    verify(jdbcTemplate).query(
        ArgumentMatchers.eq(JdbcProjectContextRepository.PROJECT_SUMMARY_SQL),
        ArgumentMatchers.<RowMapper<ProjectSummaryDto>>any(),
        ArgumentMatchers.eq("42")
    );
  }

  @Test
  void mapProjectSummaryPreservesStringIdsAndNullableOwnerDepartment() throws Exception {
    JdbcProjectContextRepository repository =
        new JdbcProjectContextRepository(mock(JdbcTemplate.class));
    ResultSet resultSet = mock(ResultSet.class);
    when(resultSet.getString("project_id")).thenReturn("42");
    when(resultSet.getString("project_name")).thenReturn("Project A");
    when(resultSet.getString("owner_user_id")).thenReturn(null);
    when(resultSet.getString("department_id")).thenReturn(null);
    when(resultSet.getString("status")).thenReturn(null);
    when(resultSet.getString("archived_at")).thenReturn(null);

    ProjectSummaryDto summary = repository.mapProjectSummary(resultSet, 0);

    assertThat(summary.projectId()).isEqualTo("42");
    assertThat(summary.projectName()).isEqualTo("Project A");
    assertThat(summary.ownerUserId()).isNull();
    assertThat(summary.departmentId()).isNull();
    assertThat(summary.status()).isEqualTo("active");
    assertThat(summary.archivedAt()).isNull();
    assertThat(summary.assignedUserIds()).isEmpty();
  }

  @Test
  void mapProjectSummaryPreservesArchivedAt() throws Exception {
    JdbcProjectContextRepository repository =
        new JdbcProjectContextRepository(mock(JdbcTemplate.class));
    ResultSet resultSet = mock(ResultSet.class);
    when(resultSet.getString("project_id")).thenReturn("42");
    when(resultSet.getString("project_name")).thenReturn("Project A");
    when(resultSet.getString("owner_user_id")).thenReturn("owner-1");
    when(resultSet.getString("department_id")).thenReturn("dept-1");
    when(resultSet.getString("status")).thenReturn("archived");
    when(resultSet.getString("archived_at")).thenReturn("2026-06-07T00:00:00Z");

    ProjectSummaryDto summary = repository.mapProjectSummary(resultSet, 0);

    assertThat(summary.status()).isEqualTo("archived");
    assertThat(summary.archivedAt()).isEqualTo("2026-06-07T00:00:00Z");
  }

  @Test
  void findAssignedUserIdsSqlUsesProjectMembersAndBigintCast() {
    assertThat(JdbcProjectContextRepository.ASSIGNED_USER_IDS_SQL)
        .contains("FROM public.app_project_members")
        .contains("project_id = CAST(? AS bigint)")
        .contains("active = true")
        .doesNotContain("uuid");
  }

  @Test
  void findAssignedUserIdsReturnsStrings() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.query(
        anyString(),
        ArgumentMatchers.<RowMapper<String>>any(),
        ArgumentMatchers.eq("42")
    )).thenReturn(List.of("user-1", "user-2"));
    JdbcProjectContextRepository repository = new JdbcProjectContextRepository(jdbcTemplate);

    List<String> assignedUserIds = repository.findAssignedUserIds("42");

    assertThat(assignedUserIds).containsExactly("user-1", "user-2");
    verify(jdbcTemplate).query(
        ArgumentMatchers.eq(JdbcProjectContextRepository.ASSIGNED_USER_IDS_SQL),
        ArgumentMatchers.<RowMapper<String>>any(),
        ArgumentMatchers.eq("42")
    );
  }

  @Test
  void assignedUserRowMapperReadsUserIdAsString() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.query(
        anyString(),
        ArgumentMatchers.<RowMapper<String>>any(),
        ArgumentMatchers.eq("42")
    )).thenReturn(List.of());
    JdbcProjectContextRepository repository = new JdbcProjectContextRepository(jdbcTemplate);

    repository.findAssignedUserIds("42");

    RowMapper<String> mapper = capturedStringMapper(jdbcTemplate);
    ResultSet resultSet = mock(ResultSet.class);
    when(resultSet.getString("user_id")).thenReturn("user-1");

    assertThat(mapper.mapRow(resultSet, 0)).isEqualTo("user-1");
  }

  @SuppressWarnings({"rawtypes", "unchecked"})
  private static RowMapper<String> capturedStringMapper(JdbcTemplate jdbcTemplate) {
    ArgumentCaptor<RowMapper> mapperCaptor = ArgumentCaptor.forClass(RowMapper.class);
    verify(jdbcTemplate).query(
        ArgumentMatchers.eq(JdbcProjectContextRepository.ASSIGNED_USER_IDS_SQL),
        mapperCaptor.capture(),
        ArgumentMatchers.eq("42")
    );
    return mapperCaptor.getValue();
  }
}
