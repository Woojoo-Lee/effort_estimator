package com.company.effort.audit;

public record AuditWriteResult(
    boolean ok,
    AuditRecord record,
    String errorMessage,
    String exceptionClass
) {

  public static AuditWriteResult ok(AuditRecord record) {
    return new AuditWriteResult(true, record, null, null);
  }

  public static AuditWriteResult failure(Exception exception) {
    String exceptionClass = exception == null ? null : exception.getClass().getName();
    String errorMessage = exception == null ? null : exception.getMessage();
    return new AuditWriteResult(false, null, errorMessage, exceptionClass);
  }
}
