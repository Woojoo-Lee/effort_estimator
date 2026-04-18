-- Seed SCALE/RISK options for the estimator codebook.
-- Safe to run multiple times: existing rows are updated, missing rows are inserted.

WITH seed(group_code, code, code_name, code_value, sort_order, is_active, description) AS (
  VALUES
    ('SCALE', '1.0', '표준규모', '1.0', 1, true, '규모 계수 선택값'),
    ('SCALE', '1.2', '중형규모', '1.2', 2, true, '규모 계수 선택값'),
    ('SCALE', '1.5', '대형규모', '1.5', 3, true, '규모 계수 선택값'),
    ('SCALE', '1.8', '초대형', '1.8', 4, true, '규모 계수 선택값'),
    ('RISK', '1.0', '낮음', '1.0', 1, true, '리스크 계수 선택값'),
    ('RISK', '1.1', '보통', '1.1', 2, true, '리스크 계수 선택값'),
    ('RISK', '1.2', '높음', '1.2', 3, true, '리스크 계수 선택값')
)
UPDATE public.common_code AS target
SET
  code_name = seed.code_name,
  code_value = seed.code_value,
  sort_order = seed.sort_order,
  is_active = seed.is_active,
  description = seed.description
FROM seed
WHERE target.group_code = seed.group_code
  AND target.code = seed.code;

WITH seed(group_code, code, code_name, code_value, sort_order, is_active, description) AS (
  VALUES
    ('SCALE', '1.0', '표준규모', '1.0', 1, true, '규모 계수 선택값'),
    ('SCALE', '1.2', '중형규모', '1.2', 2, true, '규모 계수 선택값'),
    ('SCALE', '1.5', '대형규모', '1.5', 3, true, '규모 계수 선택값'),
    ('SCALE', '1.8', '초대형', '1.8', 4, true, '규모 계수 선택값'),
    ('RISK', '1.0', '낮음', '1.0', 1, true, '리스크 계수 선택값'),
    ('RISK', '1.1', '보통', '1.1', 2, true, '리스크 계수 선택값'),
    ('RISK', '1.2', '높음', '1.2', 3, true, '리스크 계수 선택값')
)
INSERT INTO public.common_code (
  group_code,
  code,
  code_name,
  code_value,
  sort_order,
  is_active,
  description
)
SELECT
  seed.group_code,
  seed.code,
  seed.code_name,
  seed.code_value,
  seed.sort_order,
  seed.is_active,
  seed.description
FROM seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.common_code AS target
  WHERE target.group_code = seed.group_code
    AND target.code = seed.code
);
