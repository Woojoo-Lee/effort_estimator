package com.company.effort.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

public class PermissionInterceptor implements HandlerInterceptor {

  private final PermissionService permissionService;

  public PermissionInterceptor(PermissionService permissionService) {
    this.permissionService = permissionService;
  }

  @Override
  public boolean preHandle(
      HttpServletRequest request,
      HttpServletResponse response,
      Object handler
  ) {
    if (!(handler instanceof HandlerMethod handlerMethod)) {
      return true;
    }

    RequirePermission requirement = resolveRequirement(handlerMethod);
    if (requirement == null) {
      return true;
    }

    permissionService.checkPermission(requirement);
    return true;
  }

  private RequirePermission resolveRequirement(HandlerMethod handlerMethod) {
    RequirePermission methodRequirement =
        handlerMethod.getMethodAnnotation(RequirePermission.class);

    if (methodRequirement != null) {
      return methodRequirement;
    }

    return handlerMethod.getBeanType().getAnnotation(RequirePermission.class);
  }
}
