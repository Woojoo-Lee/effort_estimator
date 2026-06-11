package com.company.effort.web.response;

import java.util.Map;

public record ApiErrorResponse(
    boolean ok,
    ApiError error
) {

  public static ApiErrorResponse of(
      String code,
      String message,
      Map<String, Object> details,
      String requestId
  ) {
    return new ApiErrorResponse(
        false,
        new ApiError(code, message, details == null ? Map.of() : details, requestId)
    );
  }

  public record ApiError(
      String code,
      String message,
      Map<String, Object> details,
      String requestId
  ) {
  }
}
