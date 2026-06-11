package com.company.effort.web.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.company.effort.security.DevCurrentUserProvider;
import com.company.effort.security.PermissionCodes;
import com.company.effort.security.RoleCodes;
import com.company.effort.web.exception.GlobalExceptionHandler;
import com.company.effort.web.filter.RequestIdFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@Import({RequestIdFilter.class, GlobalExceptionHandler.class, DevCurrentUserProvider.class})
@TestPropertySource(properties = {
    "app.security.mode=dev",
    "app.security.dev.user-id=11111111-1111-1111-1111-111111111111",
    "app.security.dev.email=tester@example.com",
    "app.security.dev.display-name=Test User",
    "app.security.dev.department-id=dept-a",
    "app.security.dev.role-codes=system_admin,viewer,system_admin",
    "app.security.dev.permission-codes=route.estimator.read,project.read.own,export.read"
})
class AuthControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void meReturnsCurrentUser() throws Exception {
    mockMvc.perform(get("/api/me"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ok").value(true))
        .andExpect(jsonPath("$.data.user_id").value("11111111-1111-1111-1111-111111111111"))
        .andExpect(jsonPath("$.data.email").value("tester@example.com"))
        .andExpect(jsonPath("$.data.display_name").value("Test User"))
        .andExpect(jsonPath("$.data.department_id").value("dept-a"))
        .andExpect(jsonPath("$.data.role_codes", hasItem(RoleCodes.SYSTEM_ADMIN)))
        .andExpect(jsonPath("$.data.permission_codes", hasItem(PermissionCodes.ROUTE_ESTIMATOR_READ)))
        .andExpect(jsonPath("$.data.authenticated").value(true))
        .andExpect(jsonPath("$.data.dev_only").value(true));
  }

  @Test
  void mePassesThroughRequestIdHeader() throws Exception {
    mockMvc.perform(get("/api/me").header("X-Request-Id", "auth-request-123"))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Request-Id", "auth-request-123"))
        .andExpect(jsonPath("$.meta.request_id").value("auth-request-123"));
  }

  @Test
  void meGeneratesRequestIdHeader() throws Exception {
    mockMvc.perform(get("/api/me"))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Request-Id", not(blankOrNullString())))
        .andExpect(jsonPath("$.meta.request_id").value(not(blankOrNullString())));
  }

  @Test
  void permissionsReturnsSnapshot() throws Exception {
    mockMvc.perform(get("/api/me/permissions"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ok").value(true))
        .andExpect(jsonPath("$.data.user.user_id").value("11111111-1111-1111-1111-111111111111"))
        .andExpect(jsonPath("$.data.role_codes", hasItem(RoleCodes.SYSTEM_ADMIN)))
        .andExpect(jsonPath("$.data.permission_codes", hasItem(PermissionCodes.ROUTE_ESTIMATOR_READ)))
        .andExpect(jsonPath("$.data.permissions", hasItem(PermissionCodes.PROJECT_READ_OWN)))
        .andExpect(jsonPath("$.data.dev_only").value(true));
  }

  @Test
  void permissionsDoNotExpandFromRoleOnly() throws Exception {
    mockMvc.perform(get("/api/me/permissions"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.role_codes", hasItem(RoleCodes.SYSTEM_ADMIN)))
        .andExpect(jsonPath("$.data.permission_codes", hasItem(PermissionCodes.ROUTE_ESTIMATOR_READ)))
        .andExpect(jsonPath("$.data.permission_codes", not(hasItem(PermissionCodes.USER_MANAGE))));
  }
}
