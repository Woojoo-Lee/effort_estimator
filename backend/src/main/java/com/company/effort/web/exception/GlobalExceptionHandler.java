package com.company.effort.web.exception;

import com.company.effort.security.AuthenticationRequiredException;
import com.company.effort.security.PermissionDeniedException;
import com.company.effort.security.ProjectAccessDecision;
import com.company.effort.security.ProjectAccessDeniedException;
import com.company.effort.web.filter.RequestIdFilter;
import com.company.effort.web.response.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(AuthenticationRequiredException.class)
  public ResponseEntity<ApiErrorResponse> handleAuthenticationRequiredException(
      AuthenticationRequiredException exception,
      HttpServletRequest request
  ) {
    return ResponseEntity
        .status(HttpStatus.UNAUTHORIZED)
        .body(ApiErrorResponse.of(
            "UNAUTHORIZED",
            exception.getMessage(),
            Map.of(),
            RequestIdFilter.getRequestId(request)
        ));
  }

  @ExceptionHandler(PermissionDeniedException.class)
  public ResponseEntity<ApiErrorResponse> handlePermissionDeniedException(
      PermissionDeniedException exception,
      HttpServletRequest request
  ) {
    return ResponseEntity
        .status(HttpStatus.FORBIDDEN)
        .body(ApiErrorResponse.of(
            "FORBIDDEN",
            exception.getMessage(),
            Map.of("required_permissions", exception.getRequiredPermissions()),
            RequestIdFilter.getRequestId(request)
        ));
  }

  @ExceptionHandler(ProjectAccessDeniedException.class)
  public ResponseEntity<ApiErrorResponse> handleProjectAccessDeniedException(
      ProjectAccessDeniedException exception,
      HttpServletRequest request
  ) {
    ProjectAccessDecision decision = exception.getDecision();
    Map<String, Object> details = new LinkedHashMap<>();

    if (decision != null) {
      details.put("action", decision.action());
      details.put("project_id", decision.projectId());
      details.put("reason", decision.reason());
      details.put("required_permissions", decision.requiredPermissions());
    }

    return ResponseEntity
        .status(HttpStatus.FORBIDDEN)
        .body(ApiErrorResponse.of(
            "FORBIDDEN",
            exception.getMessage(),
            details,
            RequestIdFilter.getRequestId(request)
        ));
  }

  @ExceptionHandler(ServiceUnavailableException.class)
  public ResponseEntity<ApiErrorResponse> handleServiceUnavailableException(
      ServiceUnavailableException exception,
      HttpServletRequest request
  ) {
    return ResponseEntity
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .body(ApiErrorResponse.of(
            "SERVICE_UNAVAILABLE",
            exception.getMessage(),
            Map.of(),
            RequestIdFilter.getRequestId(request)
        ));
  }

  @ExceptionHandler(NotFoundException.class)
  public ResponseEntity<ApiErrorResponse> handleNotFoundException(
      NotFoundException exception,
      HttpServletRequest request
  ) {
    return ResponseEntity
        .status(HttpStatus.NOT_FOUND)
        .body(ApiErrorResponse.of(
            "NOT_FOUND",
            exception.getMessage(),
            Map.of(),
            RequestIdFilter.getRequestId(request)
        ));
  }

  @ExceptionHandler(ValidationException.class)
  public ResponseEntity<ApiErrorResponse> handleValidationException(
      ValidationException exception,
      HttpServletRequest request
  ) {
    return ResponseEntity
        .status(HttpStatus.BAD_REQUEST)
        .body(ApiErrorResponse.of(
            "VALIDATION_ERROR",
            exception.getMessage(),
            Map.of(),
            RequestIdFilter.getRequestId(request)
        ));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiErrorResponse> handleValidationException(
      MethodArgumentNotValidException exception,
      HttpServletRequest request
  ) {
    Map<String, Object> fieldErrors = new LinkedHashMap<>();

    for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
      fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
    }

    return ResponseEntity
        .status(HttpStatus.BAD_REQUEST)
        .body(ApiErrorResponse.of(
            "VALIDATION_ERROR",
            "Request validation failed.",
            Map.of("fields", fieldErrors),
            RequestIdFilter.getRequestId(request)
        ));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiErrorResponse> handleException(
      Exception exception,
      HttpServletRequest request
  ) {
    return ResponseEntity
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiErrorResponse.of(
            "INTERNAL_ERROR",
            "An unexpected server error occurred.",
            Map.of(),
            RequestIdFilter.getRequestId(request)
        ));
  }
}
