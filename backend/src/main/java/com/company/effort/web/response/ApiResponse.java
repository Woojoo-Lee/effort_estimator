package com.company.effort.web.response;

public record ApiResponse<T>(
    boolean ok,
    T data,
    ApiResponseMeta meta
) {

  public static <T> ApiResponse<T> ok(T data, String requestId) {
    return new ApiResponse<>(true, data, new ApiResponseMeta(requestId));
  }

  public record ApiResponseMeta(String requestId) {
  }
}
