#!/usr/bin/env bash
# Báo cáo người quay lại (retention) đọc thẳng D1 production, chỉ SELECT.
# Dùng: bash scripts/retention_report.sh
set -euo pipefail
DB=03f24d93-89c1-4648-9555-94e3167845d2
# D1 = có học lại trong 1 ngày sau ngày đầu; D7/D30 tính trong cửa sổ 7/30 ngày.
SQL="WITH f AS (SELECT user_id, MIN(checkin_date) AS d0 FROM checkins GROUP BY user_id),
r AS (SELECT f.user_id, f.d0,
  MAX(CASE WHEN julianday(c.checkin_date)-julianday(f.d0) BETWEEN 1 AND 1 THEN 1 ELSE 0 END) AS d1,
  MAX(CASE WHEN julianday(c.checkin_date)-julianday(f.d0) BETWEEN 1 AND 7 THEN 1 ELSE 0 END) AS d7,
  MAX(CASE WHEN julianday(c.checkin_date)-julianday(f.d0) BETWEEN 1 AND 30 THEN 1 ELSE 0 END) AS d30,
  COUNT(c.checkin_date) AS days
  FROM f LEFT JOIN checkins c ON c.user_id=f.user_id GROUP BY f.user_id)
SELECT COUNT(*) AS nguoi_co_checkin,
  ROUND(100.0*SUM(d1)/COUNT(*),1) AS d1_pct,
  ROUND(100.0*SUM(d7)/COUNT(*),1) AS d7_pct,
  ROUND(100.0*SUM(d30)/COUNT(*),1) AS d30_pct,
  SUM(CASE WHEN days>=3 THEN 1 ELSE 0 END) AS nguoi_3_ngay_tro_len,
  (SELECT COUNT(DISTINCT user_id) FROM checkins WHERE checkin_date >= date('now','-7 day')) AS wau7,
  (SELECT COUNT(DISTINCT user_id) FROM checkins WHERE checkin_date >= date('now','-28 day')) AS mau28
FROM r"

npx wrangler d1 execute "$DB" --remote --command "$SQL" --json 2>/dev/null |
  python3 -c 'import json,sys; raw=sys.stdin.read(); d=json.loads(raw[raw.find("["):]); [print(f"{k:24} {v}") for k,v in d[0]["results"][0].items()]'
