package com.company.effort.security;

import java.util.List;

public final class RoleCodes {

  public static final String SYSTEM_ADMIN = "system_admin";
  public static final String META_ADMIN = "meta_admin";
  public static final String ESTIMATOR = "estimator";
  public static final String VIEWER = "viewer";

  public static final List<String> ALL = List.of(
      SYSTEM_ADMIN,
      META_ADMIN,
      ESTIMATOR,
      VIEWER
  );

  private RoleCodes() {
  }
}
