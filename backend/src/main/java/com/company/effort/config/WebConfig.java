package com.company.effort.config;

import com.company.effort.security.PermissionInterceptor;
import com.company.effort.security.PermissionService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  private final ObjectProvider<PermissionInterceptor> permissionInterceptorProvider;

  public WebConfig(ObjectProvider<PermissionInterceptor> permissionInterceptorProvider) {
    this.permissionInterceptorProvider = permissionInterceptorProvider;
  }

  @Bean
  @ConditionalOnBean(PermissionService.class)
  PermissionInterceptor permissionInterceptor(PermissionService permissionService) {
    return new PermissionInterceptor(permissionService);
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    permissionInterceptorProvider.ifAvailable(permissionInterceptor ->
        registry.addInterceptor(permissionInterceptor)
            .addPathPatterns("/api/**")
    );
  }
}
