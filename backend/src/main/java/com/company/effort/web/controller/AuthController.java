package com.company.effort.web.controller;

import com.company.effort.security.CurrentUser;
import com.company.effort.security.CurrentUserProvider;
import com.company.effort.security.PermissionSnapshot;
import com.company.effort.web.filter.RequestIdFilter;
import com.company.effort.web.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AuthController {

  private final CurrentUserProvider currentUserProvider;

  public AuthController(CurrentUserProvider currentUserProvider) {
    this.currentUserProvider = currentUserProvider;
  }

  @GetMapping("/me")
  public ApiResponse<CurrentUser> me(HttpServletRequest request) {
    return ApiResponse.ok(
        currentUserProvider.getCurrentUser(),
        RequestIdFilter.getRequestId(request)
    );
  }

  @GetMapping("/me/permissions")
  public ApiResponse<PermissionSnapshot> permissions(HttpServletRequest request) {
    return ApiResponse.ok(
        currentUserProvider.getPermissionSnapshot(),
        RequestIdFilter.getRequestId(request)
    );
  }
}
