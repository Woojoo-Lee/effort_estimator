package com.company.effort.config;

import javax.sql.DataSource;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.util.StringUtils;

@Configuration
@EnableConfigurationProperties(DataSourceConfig.DbProperties.class)
public class DataSourceConfig {

  @Bean
  @ConditionalOnProperty(name = "app.db.enabled", havingValue = "true")
  public DataSource dataSource(DbProperties properties) {
    validateRequiredProperty("DB_URL", properties.url());
    validateRequiredProperty("DB_USERNAME", properties.username());
    validateRequiredProperty("DB_PASSWORD", properties.password());

    DriverManagerDataSource dataSource = new DriverManagerDataSource();
    dataSource.setDriverClassName(properties.driverClassName());
    dataSource.setUrl(properties.url());
    dataSource.setUsername(properties.username());
    dataSource.setPassword(properties.password());
    return dataSource;
  }

  @Bean
  @ConditionalOnBean(DataSource.class)
  public JdbcTemplate jdbcTemplate(DataSource dataSource) {
    return new JdbcTemplate(dataSource);
  }

  private static void validateRequiredProperty(String name, String value) {
    if (!StringUtils.hasText(value)) {
      throw new IllegalStateException(
          name + " is required when app.db.enabled=true."
      );
    }
  }

  @ConfigurationProperties(prefix = "app.db")
  public record DbProperties(
      boolean enabled,
      String url,
      String username,
      String password,
      String driverClassName,
      String validationQuery
  ) {
  }
}
