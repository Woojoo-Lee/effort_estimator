package com.company.effort.audit;

import com.company.effort.web.exception.ServiceUnavailableException;

public class AuditUnavailableException extends ServiceUnavailableException {

  public AuditUnavailableException(String message) {
    super(message);
  }
}
