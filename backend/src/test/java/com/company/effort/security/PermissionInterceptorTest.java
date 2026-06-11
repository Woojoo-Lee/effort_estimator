package com.company.effort.security;

import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.company.effort.config.WebConfig;
import com.company.effort.web.exception.GlobalExceptionHandler;
import com.company.effort.web.filter.RequestIdFilter;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(controllers = {
    PermissionTestController.class,
    ClassLevelPermissionTestController.class
})
@Import({
    RequestIdFilter.class,
    GlobalExceptionHandler.class,
    PermissionService.class,
    PermissionInterceptor.class,
    WebConfig.class,
    PermissionInterceptorTest.TestConfig.class
})
class PermissionInterceptorTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private TestCurrentUserProvider currentUserProvider;

  @BeforeEach
  void setUp() {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.ROUTE_ESTIMATOR_READ)
    ));
  }

  @Test
  void allowsEndpointWithoutAnnotation() throws Exception {
    currentUserProvider.setUser(user(List.of(), List.of()));

    mockMvc.perform(get("/api/test/open"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("OPEN"));
  }

  @Test
  void allowsWhenRequiredPermissionExists() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.PROJECT_WRITE_ALL)
    ));

    mockMvc.perform(get("/api/test/protected"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PROTECTED"));
  }

  @Test
  void deniesWhenRequiredPermissionIsMissing() throws Exception {
    mockMvc.perform(get("/api/test/protected").header("X-Request-Id", "deny-123"))
        .andExpect(status().isForbidden())
        .andExpect(header().string("X-Request-Id", "deny-123"))
        .andExpect(jsonPath("$.ok").value(false))
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
        .andExpect(jsonPath("$.error.request_id").value("deny-123"))
        .andExpect(jsonPath("$.error.details.required_permissions",
            hasItem(PermissionCodes.PROJECT_WRITE_ALL)));
  }

  @Test
  void deniesSystemAdminRoleOnly() throws Exception {
    currentUserProvider.setUser(user(List.of(RoleCodes.SYSTEM_ADMIN), List.of()));

    mockMvc.perform(get("/api/test/protected"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
  }

  @Test
  void anyModeAllowsOnePermission() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.EXPORT_READ)
    ));

    mockMvc.perform(get("/api/test/any"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ANY"));
  }

  @Test
  void allModeRequiresEveryPermission() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.EXPORT_READ, PermissionCodes.EXPORT_STANDARD_EFFORT)
    ));

    mockMvc.perform(get("/api/test/all"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ALL"));
  }

  @Test
  void allModeDeniesWhenOnePermissionIsMissing() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.EXPORT_READ)
    ));

    mockMvc.perform(get("/api/test/all"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
  }

  @Test
  void classLevelAnnotationIsUsed() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.EXPORT_READ)
    ));

    mockMvc.perform(get("/api/class-test/class-level"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CLASS"));
  }

  @Test
  void methodAnnotationOverridesClassLevelAnnotation() throws Exception {
    currentUserProvider.setUser(user(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.PROJECT_WRITE_ALL)
    ));

    mockMvc.perform(get("/api/class-test/override"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("OVERRIDE"));
  }

  @Test
  void unauthenticatedUserReturnsUnauthorizedWrapper() throws Exception {
    currentUserProvider.setUser(new CurrentUser(
        "user-1",
        "user@example.com",
        "User",
        null,
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.PROJECT_WRITE_ALL),
        false,
        true
    ));

    mockMvc.perform(get("/api/test/protected"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
        .andExpect(jsonPath("$.error.request_id").value(not(blankOrNullString())));
  }

  private static CurrentUser user(List<String> roleCodes, List<String> permissionCodes) {
    return new CurrentUser(
        "user-1",
        "user@example.com",
        "User",
        null,
        roleCodes,
        permissionCodes,
        true,
        true
    );
  }

  record StatusResponse(String status) {
  }

  @TestConfiguration
  static class TestConfig {

    @Bean
    TestCurrentUserProvider testCurrentUserProvider() {
      return new TestCurrentUserProvider();
    }
  }

  static final class TestCurrentUserProvider implements CurrentUserProvider {

    private CurrentUser user;

    void setUser(CurrentUser user) {
      this.user = user;
    }

    @Override
    public CurrentUser getCurrentUser() {
      return user;
    }

    @Override
    public PermissionSnapshot getPermissionSnapshot() {
      return PermissionSnapshot.from(user);
    }
  }
}

@RestController
@RequestMapping("/api/test")
class PermissionTestController {

  @GetMapping("/open")
  PermissionInterceptorTest.StatusResponse open() {
    return new PermissionInterceptorTest.StatusResponse("OPEN");
  }

  @GetMapping("/protected")
  @RequirePermission(PermissionCodes.PROJECT_WRITE_ALL)
  PermissionInterceptorTest.StatusResponse protectedEndpoint() {
    return new PermissionInterceptorTest.StatusResponse("PROTECTED");
  }

  @GetMapping("/any")
  @RequirePermission(
      value = {PermissionCodes.EXPORT_READ, PermissionCodes.EXPORT_STANDARD_EFFORT},
      mode = PermissionCheckMode.ANY
  )
  PermissionInterceptorTest.StatusResponse any() {
    return new PermissionInterceptorTest.StatusResponse("ANY");
  }

  @GetMapping("/all")
  @RequirePermission(
      value = {PermissionCodes.EXPORT_READ, PermissionCodes.EXPORT_STANDARD_EFFORT},
      mode = PermissionCheckMode.ALL
  )
  PermissionInterceptorTest.StatusResponse all() {
    return new PermissionInterceptorTest.StatusResponse("ALL");
  }
}

@RestController
@RequestMapping("/api/class-test")
@RequirePermission(PermissionCodes.EXPORT_READ)
class ClassLevelPermissionTestController {

  @GetMapping("/class-level")
  PermissionInterceptorTest.StatusResponse classLevel() {
    return new PermissionInterceptorTest.StatusResponse("CLASS");
  }

  @GetMapping("/override")
  @RequirePermission(PermissionCodes.PROJECT_WRITE_ALL)
  PermissionInterceptorTest.StatusResponse override() {
    return new PermissionInterceptorTest.StatusResponse("OVERRIDE");
  }
}
