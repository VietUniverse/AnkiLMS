# Kế hoạch nâng cấp ts-fsrs lên v6 (dành cho dev backend)

Ngày viết: 2026-11-28. Repo: `HaechiVN/frontend`, gồm cả Pages Functions trong `functions/`.
Tài liệu gốc của thư viện: <https://open-spaced-repetition.github.io/ts-fsrs/guide/migration.md>.

## Đọc nhanh

- Commit `714a2d0` đã đổi `package.json` sang `ts-fsrs@6.0.1`, và app vẫn chạy. Còn ba việc dở:
  - code vẫn gọi API cũ của v5 (`fsrs()`, `createEmptyCard`, `default_w`); v6 vẫn giữ các hàm này nhưng đã đánh dấu **deprecated**;
  - `pnpm-lock.yaml` vẫn ghi 5.4.2;
  - API nhận trọng số chưa chặn vector FSRS-7.
- **Quyết định:** chuyển sang API v6 nhưng **giữ mô hình FSRS-6**. Chưa lên FSRS-7.
  - Đã chạy thử 56 tình huống chấm thẻ. API v6 cho kết quả **giống hệt** bản đang chạy.
  - Không cần migration D1, không đổi dữ liệu.
- **Việc của backend:**
  - T2: kiểm độ dài trọng số;
  - T3: không nuốt lỗi khi ghi `review_logs`;
  - T7a: nhận trạng thái `relearning`;
  - T8: kiểm Node 24 trên Cloudflare Pages.
- **Việc phía lib frontend** (`src/lib/fsrs45.ts`), ai làm cũng được: T1, T4, T5, T6, T7b.
- **Thứ tự deploy:** T2 và T3 deploy được độc lập. **T7a phải lên production trước T7b**, nếu không API sẽ trả 400 cho thẻ `relearning`.

## 1. FSRS chạy ở đâu trong app

```
VocabularySRSModule.tsx  (người học bấm Again/Hard/Good/Easy)
  └─ calculateFSRS45()              src/lib/fsrs45.ts    ← CHỖ DUY NHẤT gọi ts-fsrs, chạy trên trình duyệt
       └─ ApiClient.saveCardState() src/lib/apiClient.ts:335
            └─ POST /api/card-states  functions/api/card-states.ts
                 ├─ UPSERT card_states   (trạng thái thẻ hiện tại)
                 └─ INSERT review_logs   (một dòng cho mỗi lần chấm, dùng cho optimizer)

/api/fsrs/settings  functions/api/fsrs/settings.ts   đọc/ghi user_fsrs_settings (weights, retention…)
/api/fsrs/optimize  functions/api/fsrs/optimize.ts   lưu vector trọng số đã tối ưu
scripts/fsrs-optimizer.mjs                           chạy tay: đọc review_logs từ D1 remote → binding → ghi weights
```

- Backend **không** import ts-fsrs. Việc tính lịch nằm hết ở client; backend chỉ kiểm giới hạn giá trị rồi lưu.
- Vì vậy nâng ts-fsrs không đổi code Functions. Chỉ có điều kiện Node 24 khi build là đụng tới backend.
- Các file khác chỉ dùng hàm tiện ích (`ankiScheduleToFSRSState`, `isFSRSCardDue`), không gọi ts-fsrs trực tiếp: `studyQueue.ts`, `vocabCards.ts`, `KoreanGamesModule.tsx`.

## 2. Hiện trạng

| Chỗ | Hiện tại | Vấn đề |
|---|---|---|
| `package.json` | `"ts-fsrs": "6.0.1"`, `"@open-spaced-repetition/binding": "^0.6.2"` | Không có vấn đề |
| `pnpm-lock.yaml` | `ts-fsrs@5.4.2` | Lockfile thừa, lệch với `package-lock.json` |
| `tsconfig.json:24` | `paths: { "ts-fsrs": ["./node_modules/ts-fsrs"] }` | Không cần nữa: v6 khai báo kiểu qua `exports` (`.d.mts`/`.d.cts`) |
| `src/lib/fsrs45.ts:1` | `import { createEmptyCard, default_w, fsrs, Rating, State } from "ts-fsrs"` | API deprecated |
| `src/lib/fsrs45.ts:280` | `State.Relearning` bị lưu thành `"review"` | Lỗi, xem T7 |
| `src/lib/ts-fsrs-fallback/` | 1888 dòng, bản chép cũ của ts-fsrs | Không file nào import, là code chết |
| `functions/api/fsrs/settings.ts:74`, `functions/api/fsrs/optimize.ts:84` | Chỉ kiểm từng phần tử là số hữu hạn | **Không kiểm độ dài**, xem T2 |
| `functions/api/card-states.ts:147-163` | `INSERT review_logs … .run().catch(() => {})` | Mất log mà không có dấu vết, xem T3 |
| `functions/api/card-states.ts:91`, `progress-recovery.ts:9,44` | Chỉ nhận `new`, `learning`, `review` | Phải thêm `relearning` (T7a) |
| `functions/api/profile.ts:23` | `COUNT(*) … WHERE state = 'review'` | Sau T7 phải đếm cả `relearning` |
| `scripts/fsrs-optimizer.mjs` | `modelVersion: ModelVersion.Fsrs6`; chạy qua `cmd.exe` với đường dẫn `d:\LAB\…` cố định; ghép SQL bằng chuỗi; ghi thẳng D1 `--remote`; có email mặc định của một user thật | Đúng FSRS-6, nhưng chỉ chạy được trên Windows. Nên bỏ email mặc định khỏi code |
| D1 `review_logs` (migration 0026) | Bắt đầu ghi từ 24/11/2026 | Lịch sử còn quá ngắn để lên FSRS-7 (mục 6) |

## 3. Những thay đổi của v6 cần biết

| v6 | Ảnh hưởng |
|---|---|
| Mô hình mặc định của `DefaultScheduler` là **FSRS-7** (34 trọng số, thêm `stabilityFast`, khoảng ôn có phần lẻ của ngày). `fsrs()` cũ vẫn dùng FSRS-6 | Phải chọn rõ `FSRS6Model`, không dùng mặc định |
| API mới: `defineScheduler({ model, chrono }).use(...middleware).create({ config })`, gọi `review({ card, now, grade })`, nhận `{ card, revlog }`; trường viết camelCase (`dueAt`, `lastReviewAt`, `learningStep`, `scheduledDays`, `scheduleStatus`) | Chỉ phải sửa trong `fsrs45.ts`. Payload gửi API giữ nguyên |
| Bản định nghĩa trần **không có** chính sách nào. Phải gắn đủ 7 middleware theo đúng thứ tự | Thiếu middleware là sai lịch |
| Bỏ `Card.elapsed_days` và `ReviewLog.elapsed_days/last_elapsed_days` | Commit `714a2d0` đã tự tính giá trị này. Cột D1 vẫn giữ |
| `clearStatsOnForget` mặc định là `true` (v5 là `false`) | App không có chức năng forget, nhưng vẫn đặt `false` |
| `engines.node >= 24`; có thêm phụ thuộc `@open-spaced-repetition/srs-kit@1.0.1` | Ảnh hưởng tới build trên Pages (T8) |
| `migrateFSRS6Parameters()` chỉ nhận vector 17, 19 hoặc 21 phần tử; **ném lỗi** với 34 | Lý do phải làm T2 |
| Binding 0.6: `computeParameters` mặc định train **FSRS-7** | Script optimizer phải giữ `ModelVersion.Fsrs6` |

## 4. Bằng chứng đã có

Đã cài `ts-fsrs@5.4.2` và `6.0.1` vào hai thư mục riêng, rồi chạy cùng `fsrs45.ts` trên 56 tình huống: 7 trạng thái thẻ × 4 nút × 2 mức retention. Danh sách tình huống nằm ở phụ lục A.

| So sánh | Giống | Khác |
|---|---|---|
| 5.4.2 so với 6.0.1 (API cũ) | 50/56 | 6 |
| 6.0.1 API cũ so với **bản thử API v6** (`defineScheduler` + `FSRS6Model`) | **56/56** | 0 |

- **6 ca khác:** đều là bấm Hard ở bước học đầu. Hạn ôn ra `+5 phút 30 giây` thay vì `+6 phút`. Theo luật bước học, Hard ở bước đầu là trung bình của 1 phút và 10 phút, tức 5,5 phút; bản v6 giữ độ chính xác tới giây nên đúng hơn. Ngoài hạn ôn, mọi giá trị khác (stability, difficulty, interval, reps, lapses) đều trùng.
- **Múi giờ:** đã thử ba ca theo giờ Việt Nam: ôn 23:30 rồi 08:00 hôm sau; hai lần cùng ngày UTC nhưng khác ngày địa phương; `lastReview` chỉ có ngày. Cả ba bản cho kết quả giống nhau.
- **Script tự kiểm:** `scripts/check-fsrs-learning-steps.mjs` qua được trên 6.0.1 và trên bản thử.
- **Bundle (gzip):**

  | Phần | Kích thước |
  |---|---|
  | v5 `index.mjs` | khoảng 13,4 KB |
  | v6 `index.mjs` | khoảng 10,6 KB |
  | `srs-kit` | khoảng 10,1 KB |

  Tổng tăng không đáng kể.
- **Trình duyệt:** `dist` của v6 dùng `??=`, `#private`, `Object.hasOwn`, nên cần Chrome 93 hoặc Safari 15.4 trở lên.

## 5. Danh sách việc

Mỗi task là một commit, chỉ `git add` file của task đó. Chạy thử với D1 local (`npm run dev:api`, tức `wrangler pages dev`). **Không** ghi lên D1 `--remote` khi đang thử.

### T1. Đồng bộ phụ thuộc (XS, phía frontend)
- Xoá `HaechiVN/frontend/pnpm-lock.yaml`, vì repo dùng npm (xem commit `34a9465`). Nếu còn CI hay máy nào cài bằng pnpm thì chạy `pnpm install` để cập nhật, thay vì xoá.
- Bỏ dòng `"ts-fsrs": ["./node_modules/ts-fsrs"]` trong `tsconfig.json` `paths`.
- Chạy `npm ci`, kiểm `node -p "require('./node_modules/ts-fsrs/package.json').version"` in ra `6.0.1`.
- **Xong khi:** `npm run typecheck` qua và `node scripts/check-fsrs-learning-steps.mjs` in `ok`.

### T2. Kiểm độ dài vector trọng số (XS, **backend**)
- **Lý do:** nếu `user_fsrs_settings.weights_json` chứa vector 34 phần tử (FSRS-7), mỗi lần user đó chấm thẻ sẽ lỗi `Invalid parameters length "34", expected 17, 19 or 21.`. Chỉ cần ai đó bỏ `modelVersion` trong script optimizer là xảy ra, vì binding 0.6 mặc định train FSRS-7.
- **File:** `functions/api/fsrs/settings.ts:74` và `functions/api/fsrs/optimize.ts:84`.
- **Làm:** thêm điều kiện sau vào chỗ đang kiểm `every(Number.isFinite)`, ở cả hai file:
  ```ts
  const FSRS6_WEIGHT_LENGTHS = [17, 19, 21]; // độ dài mà ts-fsrs migrateFSRS6Parameters chấp nhận
  if (!FSRS6_WEIGHT_LENGTHS.includes(body.weights.length)) return errorResponse("Vector trọng số FSRS-6 phải có 21 phần tử.");
  ```
  Nên chỉ ghi vector 21 phần tử. Nhận 17 và 19 để không làm hỏng dữ liệu cũ, nếu có.
- **Kiểm trên D1 local trước khi deploy:**
  ```sql
  SELECT user_id, json_array_length(weights_json) AS n FROM user_fsrs_settings WHERE n NOT IN (0, 17, 19, 21);
  ```
  Nếu có dòng thì báo lại, **đừng tự sửa** dữ liệu production.
- **Xong khi:** POST vector 34 số trả 400; POST vector 21 số trả 200; `npm run typecheck` qua.

### T3. Không nuốt lỗi khi ghi `review_logs` (XS, **backend**)
- **Lý do:** optimizer và việc lên FSRS-7 về sau cần lịch sử **đầy đủ**. Hiện mất một dòng log thì không ai biết.
- **File:** `functions/api/card-states.ts`, đoạn INSERT `review_logs` (khoảng dòng 146–163).
- **Làm:** thay `.catch(() => {})` bằng đoạn sau, và vẫn trả `success: true` vì `card_states` đã lưu xong:
  ```ts
  .catch((e) => console.error("review_logs insert failed", { userId: user.id, deckId: body.deckId, cardId: body.cardId, error: String(e) }))
  ```
  Không log toàn bộ `body`.
- **Xong khi:** tạm đổi tên bảng ở D1 local thì thấy dòng lỗi trong `wrangler pages dev`; đổi lại thì chấm thẻ vẫn ghi log bình thường.

### T4. Chuyển `fsrs45.ts` sang API v6, giữ FSRS-6 (S, lib frontend)
- **File:** `src/lib/fsrs45.ts`. Giữ nguyên tên export và kiểu (`calculateFSRS45`, `FSRSState`, `FSRSReviewLog`, `FSRS45_DEFAULTS`, `ankiScheduleToFSRSState`, `isFSRSCardDue`), để file gọi và payload API không phải đổi.
- **Import:**
  ```ts
  import { dateChrono, defineScheduler, Rating, State } from "ts-fsrs";
  import {
    schedulerDesiredRetentionMiddleware, schedulerFuzzingMiddleware, schedulerStatsMiddleware,
    schedulerScheduledDaysMiddleware, schedulerLearningStepsMiddleware,
    schedulerMaximumIntervalMiddleware, schedulerMonotonicIntervalMiddleware,
  } from "ts-fsrs/middlewares";
  import { FSRS6Model, FSRS6_DEFAULT_WEIGHTS, migrateFSRS6Parameters } from "ts-fsrs/models/fsrs-6";
  ```
- **Định nghĩa scheduler:** tạo một lần, rồi cache instance theo cấu hình. Thứ tự middleware **phải** đúng như dưới đây.
  ```ts
  const definition = defineScheduler({ model: FSRS6Model, chrono: dateChrono }).use(
    schedulerDesiredRetentionMiddleware, schedulerFuzzingMiddleware, schedulerStatsMiddleware,
    schedulerScheduledDaysMiddleware, schedulerLearningStepsMiddleware,
    schedulerMaximumIntervalMiddleware, schedulerMonotonicIntervalMiddleware,
  );
  const schedulers = new Map<string, ReturnType<typeof definition.create>>();
  function schedulerFor(o: { w?: number[]; retention: number; maxInterval: number; learning?: string[]; relearning?: string[] }) {
    const key = JSON.stringify(o);
    let s = schedulers.get(key);
    if (!s) {
      const relearningSteps = o.relearning ?? ["10m"];
      s = definition.create({ config: {
        weights: migrateFSRS6Parameters(o.w),   // undefined → trọng số mặc định FSRS-6
        fractionalDays: false,                  // giữ chính sách ngày như v5
        enableShortTerm: true,
        desiredRetention: o.retention,
        learningSteps: o.learning ?? ["1m", "10m"],
        relearningSteps,
        numRelearningSteps: relearningSteps.length,
        enableFuzz: false,
        maximumInterval: o.maxInterval,
        clearStatsOnForget: false,
      } });
      schedulers.set(key, s);
    }
    return s;
  }
  ```
- **`toFsrsCard`:** trả thẻ v6 qua `definition.schema.card.parse({...})`. Ánh xạ trường như sau:

  | Thẻ v6 | Lấy từ `FSRSState` |
  |---|---|
  | `cardId` | `stateKeyOf(card)` nếu có, không thì chuỗi cố định (app không dùng `rollback`) |
  | `dueAt` | `dueAt`, hoặc `dueDate` lúc 23:59 |
  | `lastReviewAt` | `null` nếu là thẻ mới; ngược lại là `lastReview` đọc theo **giờ địa phương** và không vượt `now`. Giữ đoạn sửa lỗi "Invalid delta_t" ở dòng 96–103 |
  | `stability`, `difficulty` | Giữ luật hiện tại: thẻ mới thì trí nhớ rỗng |
  | `state` | `state` |
  | `scheduleStatus` | New → `"new"`; Learning/Relearning → `"learning"`; Review → `"review"` |
  | `scheduledDays` | `interval` |
  | `learningStep` | `resumeLearningStep()` |
  | `reps`, `lapses` | Giữ nguyên |
- **`calculateFSRS45`:** gọi `schedulerFor(...).review({ card, now, grade })` rồi map ngược:

  | `FSRSState` / `FSRSReviewLog` | Lấy từ |
  |---|---|
  | `dueAt`, `dueDate` | `card.dueAt` |
  | `interval` | `card.scheduledDays` (số nguyên, vì `fractionalDays: false`) |
  | `learningSteps` | `card.learningStep` |
  | `stability`, `difficulty`, `reps`, `lapses`, `state` | Các trường cùng tên trên `card` |
  | `lastReviewLog.due` | `revlog.lastReviewAt ?? revlog.dueAt`. Cột `due` cũ của v5 mang nghĩa này. **Không** đổi thẳng `revlog.dueAt` thành `due` |
  | `lastReviewLog.review` | `revlog.reviewTime` |
  | `elapsed_days`, `last_elapsed_days` | Tự tính từ `lastReviewAt`, như commit `714a2d0` đang làm |
- **Dòng 193:** đổi `default_w.length` thành `FSRS6_DEFAULT_WEIGHTS.length`. Chỉ đưa `schedulerConfig.w` vào khi độ dài là 17, 19 hoặc 21.
- **Xong khi:** `npm run typecheck` qua; T6 qua; xem trước khoảng ôn trên các nút ở localhost giống trước khi sửa.

### T5. Dọn code chết (XS)
- Xoá `src/lib/ts-fsrs-fallback/`. Kiểm trước bằng lệnh sau, phải không ra kết quả nào:
  ```bash
  grep -rn "ts-fsrs-fallback" src functions scripts
  ```
- Trong `scripts/fsrs-optimizer.mjs`: lấy `DEFAULT_W` từ `FSRS6_DEFAULT_WEIGHTS` thay vì chép tay, và sửa chú thích thành "FSRS-6".
- Không bắt buộc: bỏ email mặc định và đường dẫn `d:\LAB\…` cố định trong script; email đọc từ `process.argv` và bắt buộc phải truyền.

### T6. Script kiểm lịch không đổi (S)
- Tạo `scripts/check-fsrs-v6-parity.mjs` từ script ở phụ lục A. Chạy một lần **trước T4** để ghi snapshot ra `scripts/fixtures/fsrs-parity.json`; sau T4 thì so với snapshot đó.
- Chỉ chấp nhận khác ở 6 ca `*/hard/*` của thẻ mới hoặc đang học bước 1, và hạn ôn phải là `now + 330 giây`. Mọi khác biệt khác đều tính là fail.
- **Xong khi:** `node scripts/check-fsrs-v6-parity.mjs` thoát với mã 0.

### T7. Trạng thái `relearning` (S, tách làm hai phần)

**Lỗi hiện tại:**
- `fsrs45.ts:280` gộp `State.Relearning` vào `"review"`.
- Thẻ đang ôn bị bấm Again được lưu `state: "review"` với `dueAt` sau 10 phút.
- `isFSRSCardDue` chỉ so `dueAt` khi trạng thái là `learning`, nên thẻ bị coi là **đến hạn ngay**, không chờ đủ 10 phút.
- Lần chấm sau, thẻ bị coi như Review, mất trạng thái học lại, và `review_logs.state` ghi `2` thay vì `3`.

**T7a, backend (deploy trước):**
- Thêm `"relearning"` vào danh sách hợp lệ ở `functions/api/card-states.ts:91`, và vào kiểu cùng hàm kiểm ở `functions/api/progress-recovery.ts:9` và `:44`.
- `functions/api/profile.ts:23`: đổi thành `state IN ('review', 'relearning')`.
- Tìm thêm chỗ khác so `state`:
  ```bash
  grep -rn "'review'\|\"review\"\|'learning'\|\"learning\"" functions
  ```
- D1 `card_states.state` là `TEXT`, không có CHECK, nên **không cần migration**.
- **Xong khi:** POST `state: "relearning"` trả 200, và dữ liệu cũ đọc vẫn bình thường.

**T7b, lib frontend (chỉ deploy sau khi T7a đã lên production):**
- `FSRSState.state` thêm `"relearning"` và map hai chiều với `State.Relearning`.
- `isFSRSCardDue` so `dueAt` cho cả `learning` lẫn `relearning`.
- Rà `studyQueue.ts`, `vocabCards.ts`, `VocabularySRSModule.tsx` và `KoreanGamesModule.tsx`: thẻ `relearning` phải được đếm là thẻ ôn, không phải thẻ mới.
- Thêm ca kiểm vào `check-fsrs-learning-steps.mjs`: Again trên thẻ đang ôn thì `state` là `"relearning"`, chưa đến hạn sau 1 phút, đến hạn sau 10 phút; sau đó Good thì về `"review"`.

### T8. Kiểm build và deploy (XS, **backend**)
- Biến `NODE_VERSION` của Cloudflare Pages phải từ 24 trở lên. npm chỉ cảnh báo `engines` chứ không chặn, nên build vẫn chạy nhưng không được bảo đảm.
- Trước khi deploy, chạy `npm run typecheck`, `npm run lint` (so số lỗi với trước khi sửa), `npm run build`, và cả hai script kiểm.
- Thứ tự deploy: T2, T3, T7a (backend) → T1, T4, T5, T6 → T7b.
- Rollback: revert commit tương ứng. Giai đoạn này không có migration và không đổi dạng dữ liệu.

## 6. FSRS-7: chưa làm, nhưng backend cần biết

Chưa làm vì thẻ đã học chỉ chuyển sang FSRS-7 được khi có **toàn bộ** lịch sử ôn, để dựng lại trí nhớ bằng `Reschedule.replay()`. Hiện tại:
- `review_logs` mới có từ 24/11/2026;
- thẻ nhập từ Anki không có log;
- trọng số FSRS-6 không dùng được cho FSRS-7.

Điều kiện để mở lại:
1. Có vài tháng log đầy đủ. T3 là điều kiện tiên quyết.
2. Chạy `evaluateWithTimeSeriesSplits` của binding trên dữ liệu thật thấy FSRS-7 tốt hơn FSRS-6 rõ rệt.
3. Có người duyệt kế hoạch migration riêng.

Những chỗ backend sẽ phải đổi khi tới lúc:
- `card-states.ts:85` đang bắt `interval` là **số nguyên**. FSRS-7 dùng `fractionalDays: true` nên sẽ bị trả 400. Cần nới điều kiện, hoặc tách cột khoảng ôn có phần lẻ.
- `card_states.last_review` và điều kiện kiểm ở `card-states.ts:95` chỉ nhận `YYYY-MM-DD`. FSRS-7 cần giờ chính xác, nên phải lấy từ `review_logs.review_time` hoặc thêm cột `last_review_at`.
- Migration mới cần thêm:
  - `card_states.stability_fast REAL`;
  - `card_states.fsrs_model TEXT DEFAULT 'FSRS-6'`;
  - `user_fsrs_settings.model_version TEXT DEFAULT 'FSRS-6'`, và vector 34 trọng số lưu riêng.
- T2 phải kiểm độ dài theo `model_version`.
- Script migration phải có `--dry-run` và backup trước (`wrangler d1 export`). Chỉ ghi trí nhớ của thẻ (`stability`, `stability_fast`, `difficulty`, `fsrs_model`). **Không sửa `review_logs`**, không đổi `due_*`, `reps`, `lapses` hay bước học.
- Thẻ có lịch sử thiếu giữ FSRS-6, và mỗi thẻ được xử lý theo `fsrs_model` của nó.

## 7. Rủi ro

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Thiếu hoặc sai thứ tự middleware ở T4 làm lịch lệch | Cao | T6 chạy trước và sau T4 |
| Deploy T7b trước T7a | Cao | API trả 400 cho thẻ `relearning`. Giữ đúng thứ tự deploy |
| Pages build dùng Node dưới 24 | Trung bình | T8 |
| Vector FSRS-7 lọt vào D1 | Trung bình | T2, và kiểm bằng câu SQL ở T2 |
| WebView cũ (Chrome dưới 93) | Thấp | Nếu cần, thêm `transpilePackages: ['ts-fsrs', '@open-spaced-repetition/srs-kit']` vào `next.config.ts` |

---

## Phụ lục A: ma trận 56 tình huống

```js
// node <script> <thư mục chứa fsrs45.ts>
const { calculateFSRS45 } = await import(process.argv[2] + "/fsrs45.ts");
const now = new Date("2026-11-20T03:00:00Z");
const base = { easeFactor: 2.5 };
const states = {
  new: { ...base, interval: 1, reps: 0, lapses: 0, state: "new", dueDate: "2026-11-20", stability: 0, difficulty: 5, lastReview: null },
  learning0: { ...base, interval: 0, reps: 1, lapses: 0, state: "learning", dueDate: "2026-11-20", dueAt: "2026-11-20T02:59:00Z", stability: 2.3, difficulty: 5.1, lastReview: "2026-11-20T02:58:00Z", learningSteps: 1 },
  legacyLearning: { ...base, interval: 0, reps: 2, lapses: 0, state: "learning", dueDate: "2026-11-20", stability: 2.3, difficulty: 5.1, lastReview: "2026-11-20" },
  reviewOnTime: { ...base, interval: 5, reps: 4, lapses: 0, state: "review", dueDate: "2026-11-20", stability: 6.2, difficulty: 4.8, lastReview: "2026-11-15" },
  reviewOverdue: { ...base, interval: 10, reps: 6, lapses: 1, state: "review", dueDate: "2026-11-01", stability: 12, difficulty: 6.5, lastReview: "2026-10-22" },
  reviewEarly: { ...base, interval: 30, reps: 8, lapses: 0, state: "review", dueDate: "2026-12-10", stability: 35, difficulty: 3.2, lastReview: "2026-11-10" },
  ankiImport: { ...base, interval: 20, reps: 5, lapses: 0, state: "review", dueDate: "2026-11-19", stability: 21, difficulty: 5.5, lastReview: "2026-10-30",
    schedulerConfig: { desiredRetention: 0.85, maximum_interval: 3650, learning_steps: ["1m","10m"], relearning_steps: ["10m"] } },
};
const out = {};
for (const [name, st] of Object.entries(states)) for (const r of ["again","hard","good","easy"]) for (const ret of [0.9, 0.8]) {
  try { const s = calculateFSRS45(r, st, now, ret);
    out[`${name}/${r}/${ret}`] = { state: s.state, dueAt: s.dueAt, interval: s.interval, S: s.stability, D: s.difficulty, step: s.learningSteps, reps: s.reps, lapses: s.lapses, log: s.lastReviewLog };
  } catch (e) { out[`${name}/${r}/${ret}`] = { error: String(e.message) }; }
}
console.log(JSON.stringify(out));
```

## Phụ lục B: đoạn lõi của bản thử API v6 đã chạy (56/56 ca khớp `fsrs()` v6)

```ts
const previousCard = toFsrsCard(current, now); // dạng cũ; bản thật nên trả thẳng thẻ v6
const st = previousCard.state;
const v6card = definition.schema.card.parse({
  cardId: "x",
  dueAt: previousCard.due,
  lastReviewAt: st === State.New ? null : (previousCard.last_review ?? null),
  stability: previousCard.stability,
  difficulty: previousCard.difficulty,
  state: st,
  scheduleStatus: st === State.New ? "new" : st === State.Review ? "review" : "learning",
  scheduledDays: previousCard.scheduled_days,
  learningStep: previousCard.learning_steps,
  reps: previousCard.reps,
  lapses: previousCard.lapses,
});
const { card, revlog } = schedulerFor(options).review({ card: v6card, now, grade: ratingMap[rating] });
```
