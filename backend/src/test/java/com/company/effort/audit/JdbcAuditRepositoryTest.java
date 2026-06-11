package com.company.effort.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

class JdbcAuditRepositoryTest {

  @Test
  void insertSqlTargetsAppAuditLogs() {
    assertThat(JdbcAuditRepository.INSERT_SQL)
        .contains("INSERT INTO public.app_audit_logs");
  }

  @Test
  void insertSqlIncludesCoreColumns() {
    assertThat(JdbcAuditRepository.INSERT_SQL)
        .contains("event_type")
        .contains("event_result")
        .contains("target_type")
        .contains("target_id")
        .contains("project_id");
  }

  @Test
  void jsonFieldsUseJsonbCast() {
    assertThat(JdbcAuditRepository.INSERT_SQL)
        .contains("CAST(? AS jsonb)");
  }

  @Test
  void projectIdUsesBigintSafeCast() {
    assertThat(JdbcAuditRepository.INSERT_SQL)
        .contains("CAST(? AS bigint)")
        .doesNotContain("project_id uuid")
        .doesNotContain("project_id::uuid");
  }

  @Test
  void projectIdNumericStringPassesThrough() {
    JdbcTemplate jdbcTemplate = jdbcTemplateReturningUpdateCount(1);
    JdbcAuditRepository repository = new JdbcAuditRepository(jdbcTemplate);

    repository.insert(baseRecord().withDatabaseFields(null, null));

    Object[] args = capturedUpdateArgs(jdbcTemplate);
    assertThat(args[6]).isEqualTo("9007199254740993");
  }

  @Test
  void eventResultIsStored() {
    JdbcTemplate jdbcTemplate = jdbcTemplateReturningUpdateCount(1);
    JdbcAuditRepository repository = new JdbcAuditRepository(jdbcTemplate);

    repository.insert(baseRecord());

    Object[] args = capturedUpdateArgs(jdbcTemplate);
    assertThat(args[1]).isEqualTo(AuditEventResult.SUCCESS);
  }

  @Test
  void insertKeepsNullProjectIdNullable() {
    JdbcTemplate jdbcTemplate = jdbcTemplateReturningUpdateCount(1);
    JdbcAuditRepository repository = new JdbcAuditRepository(jdbcTemplate);

    repository.insert(new AuditRecord(
        null,
        null,
        "00000000-0000-0000-0000-000000000001",
        "actor@example.com",
        AuditEventType.EXPORT_DOWNLOAD,
        AuditEventResult.SUCCESS,
        AuditTargetType.EXPORT,
        "export-1",
        null,
        null,
        null,
        "{\"section\":\"export\"}",
        "req-1",
        null,
        "JUnit"
    ));

    Object[] args = capturedUpdateArgs(jdbcTemplate);
    assertThat(args[6]).isNull();
  }

  @Test
  void insertDoesNotConvertProjectIdToUuidInSql() {
    assertThat(JdbcAuditRepository.INSERT_SQL.toLowerCase())
        .doesNotContain("project_id::uuid")
        .doesNotContain("cast(? as uuid)");
  }

  @Test
  void noActualDbConnectionIsRequiredForRepositoryUnitTest() {
    JdbcTemplate jdbcTemplate = jdbcTemplateReturningUpdateCount(1);
    JdbcAuditRepository repository = new JdbcAuditRepository(jdbcTemplate);

    AuditRecord inserted = repository.insert(baseRecord());

    assertThat(inserted.projectId()).isEqualTo("9007199254740993");
  }

  private static AuditRecord baseRecord() {
    return new AuditRecord(
        null,
        null,
        "00000000-0000-0000-0000-000000000001",
        "actor@example.com",
        AuditEventType.STANDARD_EFFORT_SOLUTION_TOGGLE,
        AuditEventResult.SUCCESS,
        AuditTargetType.STANDARD_EFFORT,
        "variant-1",
        "9007199254740993",
        "{\"enabled\":false}",
        "{\"enabled\":true}",
        "{\"unit\":\"M/M\"}",
        "req-1",
        "127.0.0.1",
        "JUnit"
    );
  }

  private static JdbcTemplate jdbcTemplateReturningUpdateCount(int updateCount) {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.update(
        anyString(),
        any(),
        any(),
        any(),
        any(),
        any(),
        any(),
        any(),
        any(),
        any(),
        any(),
        any(),
        any(),
        any()
    ))
        .thenReturn(updateCount);
    return jdbcTemplate;
  }

  private static Object[] capturedUpdateArgs(JdbcTemplate jdbcTemplate) {
    ArgumentCaptor<Object> argsCaptor = ArgumentCaptor.forClass(Object.class);
    verify(jdbcTemplate).update(
        eq(JdbcAuditRepository.INSERT_SQL),
        argsCaptor.capture(),
        argsCaptor.capture(),
        argsCaptor.capture(),
        argsCaptor.capture(),
        argsCaptor.capture(),
        argsCaptor.capture(),
        argsCaptor.capture(),
        argsCaptor.capture(),
        argsCaptor.capture(),
        argsCaptor.capture(),
        argsCaptor.capture(),
        argsCaptor.capture(),
        argsCaptor.capture()
    );
    return argsCaptor.getAllValues().toArray();
  }
}
