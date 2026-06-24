# Executive Demo Scenario 2026-06

## Purpose

This document provides a concise representative demo flow for the June first
Production release of the Standard Effort operation app.

The demo should show completed operating value, not internal implementation
details. Do not show or mention real passwords, password hashes, cookies,
session secrets, service role keys, or private env values.

## Demo Preparation

- Use the Production URL after confirming the latest Vercel deployment is
  ready.
- Open the app in a private browser window or after Ctrl+F5 refresh.
- Prepare `admin01`, `sales01`, and `viewer01` accounts.
- Prepare one project with Standard Effort data.
- Confirm Excel download is allowed in the browser.
- Keep Supabase SQL Editor, Vercel env screens, and secret-bearing files closed
  during the executive demo.

## Demo Flow

### 1. Login

1. Open the app.
2. Show the full-screen login page.
3. Point out that the login uses user ID and password, not email.
4. Log in as `admin01`.

Message to explain:

- The June first version includes minimum app auth and role-based operation.
- Email login and email password reset are not used.

### 2. Standard Effort Estimation

1. Open `공수 산정`.
2. Select an existing project.
3. Show the compact project selector area.
4. Show Standard Effort result summary.
5. Show solution selection.
6. Show item checkbox selection.
7. Show `actual_effort_mm`, standard effort, and gap values.
8. Show last updated time and updater display.
9. Click refresh if needed.

Message to explain:

- The estimation screen is now focused on existing project selection and
  Standard Effort operation.
- Project creation/editing is handled in Project Management.
- Responsibility tracking records updater information at row level.

### 3. Excel Download

1. Click the Excel download button.
2. Confirm that an `.xlsx` file downloads.
3. Explain that the export uses Standard Effort values, including M/M fields.

Message to explain:

- Excel output is available for sharing and reporting.
- Legacy comparison UI is no longer shown in the main operating screen.

### 4. User And Role Management

1. Open `사용자 관리`.
2. Show user list.
3. Show role and active state fields.
4. Explain admin-only access.
5. Do not expose or search for password hashes.

Message to explain:

- Admin can manage role and account active state.
- Self-demotion and self-lock are blocked for safety.
- Password values and hashes are never shown in the UI.

### 5. Codebook Management

1. Open `코드북 관리`.
2. Show compact code type and code list layout.
3. Show use-state select.
4. Explain that deletion/hard delete is not provided in the June MVP.

Message to explain:

- Codebook management is provided for June MVP value management.
- Auth role policy is still the fixed `admin` / `sales` / `viewer` policy and
  is not dynamically driven by codebook rows.

### 6. Project Management

1. Open `프로젝트 관리`.
2. Show project create/edit area.
3. Show updater column.
4. Explain soft archive/restore instead of hard delete.
5. Explain admin all-project control.

Message to explain:

- Project lifecycle operations are separated from the estimation screen.
- Hard delete wording and behavior are intentionally not exposed.

### 7. Sales Role Difference

1. Log out.
2. Log in as `sales01`.
3. Open `공수 산정`.
4. Show that sales can use estimation for owned projects.
5. Show that `actual_effort_mm` is read-only.
6. Confirm Standard Effort meta, user management, and codebook management are
   blocked or hidden.

Message to explain:

- Sales can work on their own project selections.
- Build-team managed actual effort remains controlled.

### 8. Viewer Role Difference

1. Log out.
2. Log in as `viewer01`.
3. Show estimation screen read-only behavior.
4. Confirm management screens are blocked or hidden.

Message to explain:

- Viewer is a safe read-only role for review.

## Demo Do-Not-Show List

- `.env`, `.env.local`, `.env*`, or `.vercel`.
- Vercel server-only env values.
- Supabase service role key.
- Passwords or password hashes.
- Cookies or session secrets.
- Raw DB credentials.
- Any SQL result containing secret-bearing columns.

## Closing Summary

Use this short close:

- June first Production is live with ID/password login, role-based operation,
  Standard Effort estimation, Excel export, user management, codebook
  management, project responsibility split, and row-history responsibility
  tracking.
- Remaining work is follow-up: backend/Tomcat transition, detailed audit log,
  codebook hierarchy expansion, and additional non-blocking smoke items.
