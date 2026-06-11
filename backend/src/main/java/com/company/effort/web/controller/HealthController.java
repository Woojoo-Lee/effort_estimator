package com.company.effort.web.controller;

import com.company.effort.web.filter.RequestIdFilter;
import com.company.effort.web.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

  @GetMapping("/health")
  public ApiResponse<Map<String, String>> health(HttpServletRequest request) {
    return ApiResponse.ok(
        Map.of("status", "UP"),
        RequestIdFilter.getRequestId(request)
    );
  }
}
