package com.company.effort.audit;

import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnBean(JdbcTemplate.class)
@ConditionalOnProperty(name = "app.db.enabled", havingValue = "true")
public class JdbcAuditRepository implements AuditRepository {

  static final String INSERT_SQL = """
      INSERT INTO public.app_audit_logs (
        event_type,
        event_result,
        actor_user_id,
        actor_email,
        target_type,
        target_id,
        project_id,
        before_json,
        after_json,
        metadata_json,
        ip_address,
        user_agent,
        request_id
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        CAST(? AS bigint),
        CAST(? AS jsonb),
        CAST(? AS jsonb),
        CAST(? AS jsonb),
        CAST(? AS inet),
        ?,
        ?
      )
      """;

  private final JdbcTemplate jdbcTemplate;

  public JdbcAuditRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public AuditRecord insert(AuditRecord record) {
    int affectedRows = jdbcTemplate.update(
        INSERT_SQL,
        record.eventType(),
        record.eventResult(),
        record.actorUserId(),
        record.actorEmail(),
        record.targetType(),
        record.targetId(),
        record.projectId(),
        record.beforeJsonString(),
        record.afterJsonString(),
        record.metadataJsonString(),
        record.ip(),
        record.userAgent(),
        record.requestId()
    );

    if (affectedRows < 1) {
      throw new AuditUnavailableException("Audit insert did not affect any rows.");
    }

    return record;
  }
}
