package com.company.effort.project.repository;

import com.company.effort.project.dto.ProjectSummaryDto;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

@Repository
@ConditionalOnBean(JdbcTemplate.class)
public class JdbcProjectContextRepository implements ProjectContextRepository {

  static final String PROJECT_SUMMARY_SQL = """
      SELECT
        p.id::text AS project_id,
        p.project_name,
        to_jsonb(p)->>'owner_user_id' AS owner_user_id,
        to_jsonb(p)->>'department_id' AS department_id,
        COALESCE(to_jsonb(p)->>'status', 'active') AS status,
        to_jsonb(p)->>'archived_at' AS archived_at
      FROM public.estimation_projects p
      WHERE p.id = CAST(? AS bigint)
      """;

  static final String ASSIGNED_USER_IDS_SQL = """
      SELECT user_id::text
      FROM public.app_project_members
      WHERE project_id = CAST(? AS bigint)
        AND active = true
      ORDER BY user_id::text
      """;

  private final JdbcTemplate jdbcTemplate;

  public JdbcProjectContextRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public Optional<ProjectSummaryDto> findProjectSummary(String projectId) {
    List<ProjectSummaryDto> rows =
        jdbcTemplate.query(PROJECT_SUMMARY_SQL, this::mapProjectSummary, projectId);

    return rows.stream().findFirst();
  }

  @Override
  public List<String> findAssignedUserIds(String projectId) {
    return jdbcTemplate.query(
        ASSIGNED_USER_IDS_SQL,
        (resultSet, rowNumber) -> resultSet.getString("user_id"),
        projectId
    );
  }

  ProjectSummaryDto mapProjectSummary(ResultSet resultSet, int rowNumber)
      throws SQLException {
    String status = resultSet.getString("status");

    return new ProjectSummaryDto(
        resultSet.getString("project_id"),
        resultSet.getString("project_name"),
        resultSet.getString("owner_user_id"),
        resultSet.getString("department_id"),
        StringUtils.hasText(status) ? status : "active",
        resultSet.getString("archived_at"),
        List.of()
    );
  }
}
