package com.company.effort.security;

public interface CurrentUserProvider {

  CurrentUser getCurrentUser();

  PermissionSnapshot getPermissionSnapshot();
}
