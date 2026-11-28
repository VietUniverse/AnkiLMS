# Kế hoạch nâng cấp ts-fsrs lên v6 (dành cho dev backend)

Ngày viết: 2026-11-28. Repo: `HaechiVN/frontend`, gồm cả Pages Functions trong `functions/`.
Tài liệu gốc của thư viện: <https://open-spaced-repetition.github.io/ts-fsrs/guide/migration.md>.

> **Nguyên tắc chính: Anki lên FSRS-7 thì mình mới lên, và làm theo cách Anki xử lý.**
> - **Giai đoạn A** (API v6, vẫn giữ FSRS-6) **làm ngay**. Việc này không phụ thuộc Anki.
> - **Giai đoạn B** (FSRS-7) **chỉ bắt đầu khi Anki ra bản chính thức có FSRS-7**. Bản beta (ví dụ `26.11b1`) không tính. Lý do: Anki là app dùng FSRS lớn nhất, và chính đội FSRS viết phần tích hợp. Họ sẽ gặp và sửa lỗi trên rất nhiều người dùng trước, mình đi sau thì ít rủi ro hơn.
> - **Khi Anki ra bản đó, chép cách Anki làm, không tự nghĩ ra.** Gồm: các bước học, chế độ bỏ qua bước học, giới hạn số lần ôn trong ngày, cách chuyển thẻ cũ, cách hiển thị "độ ổn định", cách tối ưu trọng số. Mục **6.7** liệt kê từng điểm cần đối chiếu và chỗ phải sửa trong HaechiVN.
> - **Theo dõi:** trang [Releases của Anki](https://github.com/ankitects/anki/releases) và [PR #5687](https://github.com/ankitects/anki/pull/5687), nơi đang bàn tích hợp FSRS-7. Mỗi lần Anki có bản chính thức mới thì đọc ghi chú phát hành, tìm chữ "FSRS-7".
> - **Các đề xuất cấu hình ở mục 6 chỉ là tạm thời.** Khi Anki đã chốt cách làm thì thay bằng cách của Anki.

## Đọc nhanh

- Commit `714a2d0` đã đổi `package.json` sang `ts-fsrs@6.0.1`, và app vẫn chạy. Còn ba việc dở:
  - code vẫn gọi API cũ của v5 (`fsrs()`, `createEmptyCard`, `default_w`); v6 vẫn giữ các hàm này nhưng đã đánh dấu **deprecated**;
  - `pnpm-lock.yaml` vẫn ghi 5.4.2;
  - API nhận trọng số chưa chặn vector FSRS-7.
- **Quyết định:** làm hai giai đoạn.
  - **Giai đoạn A (mục 5):** chuyển sang API v6 nhưng **giữ mô hình FSRS-6**. Đã chạy thử 56 tình huống chấm thẻ, API v6 cho kết quả **giống hệt** bản đang chạy. Không cần migration D1, không đổi dữ liệu.
  - **Giai đoạn B (mục 6), chỉ làm khi Anki đã ra bản chính thức có FSRS-7:** **thẻ mới dùng FSRS-7**, còn thẻ đã học giữ FSRS-6, mỗi thẻ có nhãn mô hình riêng. Bật dần bằng feature flag. Cần migration D1 với các cột thêm mới (B1). Chủ app phải chốt cấu hình trước, vì với trọng số mặc định, FSRS-7 hẹn ôn xa hơn hẳn (6.5).
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

## 6. Giai đoạn B: FSRS-7 cho thẻ mới (làm sau khi xong mục 5)

### 6.1 Quyết định

- **Thời điểm bắt đầu:** khi Anki ra bản chính thức có FSRS-7 (xem nguyên tắc ở đầu file). Chưa tới lúc đó thì chỉ đọc mục này để chuẩn bị.
- **Thẻ mới**, tức chưa được chấm lần nào kể từ ngày bật, dùng **FSRS-7**.
- **Thẻ đã học giữ FSRS-6.** Lý do: `review_logs` mới có từ 24/11/2026, nên không có đủ lịch sử để dựng lại trí nhớ cho FSRS-7. Thẻ nhập từ Anki đang là beta, tắt trên production (`featureFlags.ts:28`).
- **Mỗi thẻ mang nhãn `fsrs_model`** (`'FSRS-6'` hoặc `'FSRS-7'`), và scheduler được chọn theo nhãn. Thẻ không có nhãn là FSRS-6. **Không bao giờ đổi nhãn ngầm.**
- **Bật dần bằng feature flag:** chỉ admin trước, theo dõi rồi mới mở cho mọi người (B7).

### 6.2 Vì sao: số liệu chính thức

Nguồn: README của `open-spaced-repetition/srs-benchmark`. Dữ liệu là khoảng 10.000 bộ thẻ Anki, 350–520 triệu lượt ôn. Bảng dưới là Log Loss, càng thấp càng đoán trúng khả năng nhớ:

| Mô hình | Không tính ôn cùng ngày | Có tính ôn cùng ngày |
|---|---|---|
| FSRS-6, đã tối ưu theo từng người | 0,3460 | 0,3842 |
| FSRS-7, đã tối ưu theo từng người | **0,3401** | **0,3206** |
| FSRS-7, trọng số mặc định | 0,3620 | 0,3399 |

**Cách đọc:**
- FSRS-7 tốt hơn, nhất là khi tính cả những lần ôn trong cùng một ngày; học từ vựng có nhiều lần ôn kiểu này.
- Nếu **không** tính ôn cùng ngày, FSRS-7 dùng trọng số mặc định lại kém FSRS-6 đã tối ưu.
- Phần lớn user HaechiVN đang dùng trọng số mặc định. Bảng không có dòng "FSRS-6 mặc định", nên chưa so trực tiếp được hai bản mặc định với nhau. Vì vậy cần bước theo dõi ở B7, và cần optimizer FSRS-7 ở B8.

### 6.3 Tình trạng hệ sinh thái (ngày 28/11/2026)

| Nơi | FSRS-7 |
|---|---|
| ts-fsrs 6.0.0 (28/10) và 6.0.1 (22/11) | Bản chính thức; mô hình mặc định của `DefaultScheduler` |
| fsrs-rs 7.0.0 (10/11), lõi Rust mà Anki dùng | Bản chính thức |
| py-fsrs 6.3.3 | Chưa có, vẫn là FSRS-6 |
| Anki 26.09.4 (chính thức), 26.11b1 (beta) | **Chưa có**. Ghi chú phát hành không nhắc tới FSRS-7 |

FSRS-7 mới ra khoảng một tháng, bản 6.0.1 đã là một bản vá. **Giữ phiên bản ghim cứng** (`"ts-fsrs": "6.0.1"`, không dùng `^`). Mỗi lần nâng thì đọc release note và chạy lại T6, B5.

### 6.4 Cộng đồng đang chuyển đổi thế nào

- **Anki, [PR #5687](https://github.com/ankitects/anki/pull/5687)** (bản nháp, mở từ 24/09, chưa merge). Ngày 16/11 nhóm Anki cho biết sẽ bàn kế hoạch khi có đủ regression test. Hướng đang đề xuất:
  - Preset đã có trọng số FSRS-6 do người dùng tối ưu thì **giữ FSRS-6**, cho tới khi người dùng reset hoặc tối ưu lại.
  - Preset rỗng hoặc mặc định thì chuyển sang FSRS-7, và dựng lại trí nhớ từ toàn bộ revlog (Anki có đủ lịch sử).
  - **Giữ nguyên ngày hẹn ôn** khi tự động chuyển.
  - Lịch sử bị cắt ngắn thì "căn chỉnh": dùng `scale_memory_state_to_interval` ([fsrs-rs PR #485](https://github.com/open-spaced-repetition/fsrs-rs/pull/485)) để tìm trạng thái FSRS-7 khớp với khoảng ôn đã ghi.
- **Hướng dẫn của ts-fsrs** ([migration guide](https://open-spaced-repetition.github.io/ts-fsrs/guide/migration.md)) chặt hơn Anki: thẻ thiếu lịch sử thì **giữ FSRS-6**, không suy ra trạng thái, không tự đặt `stabilityFast = 0.8 * S`. ts-fsrs 6.0.1 **không có** hàm căn chỉnh tương đương. Vì vậy HaechiVN chưa chuyển thẻ cũ.
- **Tranh luận về learning steps** (trong PR #5687):
  - Expertium, người nghiên cứu chính của FSRS, đề xuất để learning steps **trống** khi dùng FSRS-7, và thêm hai cài đặt: "tối đa N lần ôn trong ngày" (gợi ý 1–2) và "khoảng tối thiểu" (gợi ý 30 phút đến 1 giờ).
  - Đề xuất này chưa được chốt. Tài liệu ts-fsrs thì khuyên **giữ rõ** các bước đang dùng.
- **Lỗi cũ đã được báo:** [srs-benchmark #313](https://github.com/open-spaced-repetition/srs-benchmark/issues/313), mở từ tháng 4: FSRS-7 với trọng số mặc định cho khoảng ôn vô lý sau khi trả lời sai ở lần đầu. Tháng 6, Expertium trả lời rằng bản cuối sẽ chính xác hơn. Issue vẫn đang mở.

### 6.5 Lịch ôn thử với FSRS-7 mặc định: thay đổi rõ với người học

Đã chạy ts-fsrs 6.0.1 với `FSRS7_DEFAULT_WEIGHTS`, `fractionalDays: true`, bước `1m/10m`, retention 0,9. Mỗi chuỗi là: chấm X ở lần đầu, sau đó bấm Good đúng hạn hai lần.

| Lần đầu chấm | FSRS-6 hiện tại | FSRS-7, `allowModelOverride: true` (mặc định của FSRS-7) | FSRS-7, `allowModelOverride: false` |
|---|---|---|---|
| Again | 1 phút → 10 phút → 3 ngày | 1 phút → 27,5 phút → 1 ngày | 1 phút → 10 phút → 1 ngày |
| Hard | 5,5 phút → 10 phút → 6 ngày | 14,3 giờ → 5,7 ngày → 20,1 ngày | 5,5 phút → 10 phút → 3,8 ngày |
| Good | 10 phút → 4 ngày → 16 ngày | **4,8 ngày** → 26,2 ngày → 92,4 ngày | 10 phút → 10,1 ngày → 42,6 ngày |
| Easy | 2 ngày → 11 ngày → 44 ngày | **53,9 ngày** → 233 ngày → 868 ngày | 53,9 ngày → 233 ngày → 868 ngày |

- Với `allowModelOverride: true`, bấm Good ở lần đầu là **bỏ qua bước 10 phút** và hẹn sau gần 5 ngày.
- Bấm Easy ở lần đầu thì cả hai chế độ đều hẹn sau khoảng 54 ngày; FSRS-6 hiện tại chỉ hẹn 2 ngày.
- Trọng số mặc định được train trên người dùng Anki nói chung, không phải người Việt mới học tiếng Hàn.

**Đề xuất:**
- Bắt đầu với `allowModelOverride: false` để giữ bước 1m/10m quen thuộc.
- Cân nhắc giới hạn khoảng ôn của thẻ mới sau lần chấm đầu. Ví dụ: Easy ở lần đầu không quá 7 ngày, làm bằng middleware riêng (`defineMiddleware`). Đây là **quyết định sản phẩm**, cần chủ app chốt trước khi bật.

### 6.6 Việc cần làm

**B0. Điều kiện trước** (không có thì không bắt đầu)
- **Anki đã ra bản chính thức có FSRS-7, và cột "Anki làm gì" ở bảng 6.7 đã được điền đủ.**
- Mục 5 đã xong và đã lên production.
- T3 đã xong. Thẻ FSRS-7 phải có log đầy đủ ngay từ lần chấm đầu, để sau này phát lại được nếu phải quay về.
- Chủ app chốt cấu hình ở 6.5.

**B1. Migration D1** (S, **backend**)
- Thêm file migration mới trong `frontend/migrations/` và cập nhật `schema.sql`. Mọi cột đều **thêm mới**, có giá trị mặc định, nên dữ liệu cũ tự là FSRS-6 mà không phải ghi lại.
  ```sql
  ALTER TABLE card_states ADD COLUMN fsrs_model TEXT NOT NULL DEFAULT 'FSRS-6';
  ALTER TABLE card_states ADD COLUMN stability_fast REAL;          -- chỉ FSRS-7
  ALTER TABLE card_states ADD COLUMN last_review_at TEXT;          -- ISO đầy đủ; FSRS-7 cần giờ chính xác
  ALTER TABLE card_states ADD COLUMN scheduled_days REAL;          -- khoảng ôn có phần lẻ ngày
  ALTER TABLE review_logs ADD COLUMN fsrs_model TEXT NOT NULL DEFAULT 'FSRS-6';
  ALTER TABLE review_logs ADD COLUMN stability_fast REAL;
  ALTER TABLE user_fsrs_settings ADD COLUMN weights_fsrs7_json TEXT; -- 34 trọng số, tách khỏi weights_json (FSRS-6)
  ```
- Chạy `--local` trước. Trước khi chạy `--remote` thì `wrangler d1 export` để sao lưu.

**B2. `POST /api/card-states` nhận thẻ FSRS-7** (S, **backend**, `functions/api/card-states.ts`)
- Nhận thêm `fsrsModel` (`'FSRS-6'` hoặc `'FSRS-7'`, mặc định `'FSRS-6'`), `stabilityFast`, `lastReviewAt` (kiểm bằng `Date.parse`) và `scheduledDays` (số hữu hạn từ 0 tới 36500).
- Với FSRS-7, `stabilityFast` là **bắt buộc** và phải nằm trong `[0.0001, 36500]`.
- **Giữ** điều kiện `interval` là số nguyên ở dòng 85, và giữ `lastReview` dạng `YYYY-MM-DD` ở dòng 95, để thống kê và client cũ không vỡ. Client gửi `interval = Math.round(scheduledDays)`; giá trị chính xác nằm ở `scheduled_days`, `due_at` và `last_review_at`.
- **Không cho hạ nhãn:** nếu thẻ đang là `FSRS-7` trong D1 mà request gửi `FSRS-6`, trả 409. Trường hợp này xảy ra khi client cũ chưa cập nhật ghi đè lên thẻ.
- INSERT `review_logs` ghi thêm `fsrs_model` và `stability_fast`.
- `functions/api/progress-recovery.ts` phải mang theo các trường mới. GET trả các trường mới về cho client.

**B3. Trọng số theo mô hình** (XS, **backend**)
- `functions/api/fsrs/settings.ts` và `functions/api/fsrs/optimize.ts` nhận thêm `modelVersion`.
- FSRS-6 thì kiểm độ dài 17, 19 hoặc 21 và ghi vào `weights_json`. FSRS-7 thì kiểm đúng 34 phần tử và ghi vào `weights_fsrs7_json`.
- GET trả về cả hai.

**B4. Optimizer theo mô hình** (S, **backend/script**)
- `scripts/fsrs-optimizer.mjs` nhận thêm tham số `--model FSRS-6|FSRS-7`.
- Chỉ đọc `review_logs` có `fsrs_model` đúng với tham số đó. **Không trộn** log của hai mô hình.
- Gọi `computeParameters(items, { modelVersion, enableShortTerm: true })`. Với FSRS-7, cân nhắc thêm `enableSchedPenalties: true`; benchmark khuyên dùng khi đưa vào app thật.
- Thêm `--dry-run` chỉ in ra kết quả mà không ghi D1.

**B5. Lib `fsrs45.ts` chạy hai mô hình** (M, lib frontend)
- Thêm định nghĩa thứ hai với `FSRS7Model`, cùng 7 middleware và cấu hình đã chốt ở 6.5: `fractionalDays: true`, `learningSteps: ["1m","10m"]`, `relearningSteps: ["10m"]`, giá trị `allowModelOverride` đã chọn.
- `FSRSState` thêm `fsrsModel?`, `stabilityFast?`, `lastReviewAt?`, `scheduledDays?`. Hàm `calculateFSRS45` chọn scheduler theo `fsrsModel`; không có nhãn thì là FSRS-6.
- Thẻ mới chỉ được gắn `fsrsModel: 'FSRS-7'` ở **lần chấm đầu**, và chỉ khi flag `fsrs7NewCards` đang bật cho user. Thêm flag này vào `src/lib/featureFlags.ts`.
- Rà các chỗ đang coi `stability` là "số ngày nhớ". Ví dụ `KoreanGamesModule.tsx:83` dùng `stability >= 3`. Với FSRS-7, `stability` là thành phần chậm, không phải khoảng ôn đạt 90%. Dùng `interval` hoặc `scheduledDays` thay vào.

**B6. Kiểm thử** (S)
- Thêm `scripts/check-fsrs7-new-cards.mjs`. Script phải kiểm:
  - thẻ FSRS-6 cho lịch giống hệt T6;
  - thẻ mới khi bật flag ra FSRS-7, đúng như bảng 6.5 với cấu hình đã chốt;
  - thẻ FSRS-7 đi qua JSON và API rồi quay lại vẫn còn `stabilityFast`;
  - vector 21 phần tử gửi cho FSRS-7 thì bị từ chối.
- Ở D1 local: client cũ gửi `FSRS-6` cho thẻ đang là `FSRS-7` thì nhận 409.

**B7. Bật dần và theo dõi** (XS)
- Bật flag cho admin khoảng 1–2 tuần, sau đó mới mở cho mọi user.
- So tỉ lệ nhớ thật của thẻ đang ở trạng thái ôn (`state = 2`), tách theo mô hình:
  ```sql
  SELECT fsrs_model, COUNT(*) AS n, ROUND(AVG(rating > 1), 3) AS true_retention
  FROM review_logs WHERE state = 2 AND review_time >= date('now', '-30 day')
  GROUP BY fsrs_model;
  ```
  Nhắm tỉ lệ gần `desiredRetention` (0,9). Nếu FSRS-7 thấp hơn nhiều thì tắt flag và xem lại cấu hình ở 6.5.
- **Quay lại:** tắt flag thì từ đó thẻ mới không được gắn FSRS-7 nữa. Thẻ đã là FSRS-7 thì vẫn ở FSRS-7. Muốn đưa chúng về FSRS-6 thì phải phát lại log bằng `new Reschedule(fsrs6Scheduler).replay({ history })`. Việc này làm được nhờ T3 và B2, vì thẻ FSRS-7 có log đầy đủ từ đầu.

**B8. Về sau, không làm ngay**
- Khi một user có đủ log FSRS-7, chạy B4 để tối ưu trọng số FSRS-7 cho riêng họ. Đây là lúc FSRS-7 đạt kết quả tốt nhất như bảng 6.2.
- Có chuyển thẻ cũ sang FSRS-7 bằng cách căn chỉnh như Anki hay không: chờ Anki chốt PR #5687, và chờ ts-fsrs có hàm tương đương. Không tự viết công thức.

### 6.7 Đối chiếu với Anki khi Anki ra bản có FSRS-7

Cách dùng bảng này:
1. Khi Anki ra bản chính thức có FSRS-7, đọc ghi chú phát hành, phần Deck Options trong [Anki Manual](https://docs.ankiweb.net/deck-options.html) và PR đã merge.
2. Điền cột "Anki làm gì" cho từng dòng, kèm link nguồn.
3. Đổi cột "Đề xuất hiện tại" của HaechiVN cho khớp với Anki. Muốn làm khác Anki thì phải ghi rõ lý do ngay trong dòng đó.

| # | Điểm cần đối chiếu | Anki làm gì (điền khi Anki ra bản chính thức) | Đề xuất hiện tại của HaechiVN | Chỗ sửa |
|---|---|---|---|---|
| 1 | Các bước học mặc định khi dùng FSRS-7: để trống, hay giữ `1m/10m` | PR #5687: giữ các bước người dùng đã đặt; Expertium muốn để trống. Chưa chốt | Giữ `1m/10m` | `fsrs45.ts` (B5) |
| 2 | Chế độ dùng khoảng của mô hình thay cho bước học (`allowModelOverride`) | Chưa rõ | `false` | B5 |
| 3 | Giới hạn số lần ôn trong ngày, khoảng tối thiểu | Expertium đề xuất tối đa 1–2 lần/ngày, tối thiểu 30 phút đến 1 giờ. Chưa chốt | Chưa có | Middleware riêng (B5) |
| 4 | Người đã có trọng số FSRS-6 tối ưu riêng: thẻ mới của họ dùng FSRS-6 hay FSRS-7 | PR #5687: preset đã có trọng số FSRS-6 thì **giữ FSRS-6** đến khi tối ưu lại | Mọi thẻ mới dùng FSRS-7 | B5: nếu theo Anki, user có `weights_json` thì thẻ mới vẫn dùng FSRS-6 |
| 5 | Thẻ đã học: dựng lại từ lịch sử; lịch sử thiếu thì căn chỉnh hay giữ FSRS-6 | PR #5687: dựng lại từ lịch sử; lịch sử thiếu thì căn chỉnh bằng `scale_memory_state_to_interval` | Giữ FSRS-6 | B8, cần ts-fsrs có hàm tương đương |
| 6 | Ngày hẹn ôn của thẻ khi chuyển mô hình | PR #5687: giữ nguyên | Giữ nguyên (không chuyển thẻ cũ) | B8 |
| 7 | "Độ ổn định" hiển thị cho người dùng | PR #5687: vẫn hiển thị số ngày đến khi khả năng nhớ còn 90% | Dùng `interval`/`scheduledDays` thay cho `stability` | `KoreanGamesModule.tsx:83`, các màn thống kê |
| 8 | Khoảng ôn quá xa ở lần chấm đầu (Easy khoảng 54 ngày, mục 6.5) | Chưa rõ. Fork của tác giả có bảng "khoảng ôn khi tốt nghiệp" cho thẻ mới | Giới hạn bằng middleware, ví dụ tối đa 7 ngày | B5 |
| 9 | Tối ưu trọng số FSRS-7: recency, scheduling penalties, health check | Benchmark khuyên bật recency và scheduling penalties khi đưa FSRS-7 vào Anki | Cân nhắc `enableSchedPenalties: true` | B4 |
| 10 | Retention mong muốn mặc định | Chưa rõ | 0,9 | `FSRS45_DEFAULTS` |

**Lưu ý về thư viện:** Anki dùng **fsrs-rs** (Rust), còn HaechiVN dùng **ts-fsrs** (TypeScript). Cùng một mô hình nhưng hai thư viện khác nhau.
- Khi nâng ts-fsrs, chọn bản ra **sau** bản Anki, và release note phải nói đã khớp với fsrs-rs. Ví dụ: ts-fsrs PR #625 "update fsrs-rs to 7.0.0", PR #628 "align FSRS-6 rounding, FSRS-7 short-term".
- Sau khi nâng, chạy lại T6 và B6.

## 7. Rủi ro

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Thiếu hoặc sai thứ tự middleware ở T4 làm lịch lệch | Cao | T6 chạy trước và sau T4 |
| Deploy T7b trước T7a | Cao | API trả 400 cho thẻ `relearning`. Giữ đúng thứ tự deploy |
| Pages build dùng Node dưới 24 | Trung bình | T8 |
| Vector FSRS-7 lọt vào D1 | Trung bình | T2, và kiểm bằng câu SQL ở T2 |
| WebView cũ (Chrome dưới 93) | Thấp | Nếu cần, thêm `transpilePackages: ['ts-fsrs', '@open-spaced-repetition/srs-kit']` vào `next.config.ts` |
| FSRS-7 mặc định hẹn ôn quá xa với người mới học (6.5) | Cao | Chốt `allowModelOverride` và giới hạn lần đầu trước khi bật; bật cho admin trước (B7) |
| Client cũ ghi đè thẻ FSRS-7 thành FSRS-6 | Trung bình | B2 trả 409 khi bị hạ nhãn |
| Trộn log hoặc trọng số của hai mô hình khi tối ưu | Trung bình | B3, B4 tách theo `fsrs_model` |
| FSRS-7 còn mới, các bản vá có thể đổi lịch | Trung bình | Ghim đúng phiên bản; mỗi lần nâng đọc release note và chạy lại T6, B6 |

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
