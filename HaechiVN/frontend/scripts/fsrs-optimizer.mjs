import { spawnSync } from "child_process";
import { FSRSBindingReview, FSRSBindingItem, computeParameters, ModelVersion } from "@open-spaced-repetition/binding";

// Mặc định FSRS v5/v6 weights của ts-fsrs 5.4.2 để đối chiếu
const DEFAULT_W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334,
  3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835,
  0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425,
  0.0912, 0.0658, 0.1542
];

function runD1Query(sql) {
  const result = spawnSync("cmd.exe", [
    "/c", "npx", "wrangler", "d1", "execute", "haechivn-korean-db", "--remote", "--json", `--command=${sql}`
  ], {
    cwd: "d:\\LAB\\AnkiLMS\\HaechiVN\\frontend",
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
  });

  const stdout = result.stdout || "";
  try {
    const jsonStart = stdout.indexOf("[");
    const jsonEnd = stdout.lastIndexOf("]");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const parsed = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
      return parsed[0]?.results || [];
    }
  } catch (err) {
    console.error("JSON parse error on stdout:", stdout);
    throw err;
  }
  return [];
}

async function main() {
  const targetEmail = process.argv[2] || "thanhnamd916@gmail.com";
  console.log(`🔍 Tìm người dùng: ${targetEmail}...`);

  const userRows = runD1Query(`SELECT id, email, name FROM users WHERE email='${targetEmail}'`);
  console.log("DEBUG userRows:", JSON.stringify(userRows));
  if (!userRows.length) {
    console.error(`❌ Không tìm thấy user với email: ${targetEmail}`);
    process.exit(1);
  }
  const user = userRows[0];
  console.log(`✅ Tìm thấy user: ${user.name} (${user.id})`);

  // Kiểm tra review_logs hiện có
  let logRows = runD1Query(`SELECT * FROM review_logs WHERE user_id='${user.id}' ORDER BY card_id, review_time ASC`);
  console.log(`📊 Số review logs hiện tại trong DB: ${logRows.length}`);

  // Nếu review_logs chưa đủ (do học trước migration), tái hiện từ card_states và study_sessions
  if (logRows.length < 500) {
    console.log("⚡ Review logs chưa đủ để huấn luyện. Bắt đầu tái hiện revlogs từ 1.066 card_states thực tế...");
    const cardStates = runD1Query(
      `SELECT deck_id, card_id, interval, reps, lapses, state, stability, difficulty, last_review, updated_at
       FROM card_states WHERE user_id='${user.id}'`
    );
    console.log(`📦 Tải được ${cardStates.length} card states từ D1.`);

    // Tái hiện các lượt review hợp lý dựa trên reps và lapses
    const trainItems = [];
    const seedLogs = [];

    for (const card of cardStates) {
      const reps = Math.max(1, Number(card.reps) || 1);
      const lapses = Math.min(reps - 1, Math.max(0, Number(card.lapses) || 0));
      const reviews = [];

      // Lần đầu tiên: deltaT = 0
      reviews.push(new FSRSBindingReview(3, 0)); // Good ban đầu

      let currentInterval = 1;
      for (let r = 1; r < reps; r++) {
        const isLapse = r >= reps - lapses;
        const rating = isLapse ? 1 : (r % 3 === 0 ? 4 : 3); // Again nếu lapse, xen kẽ Good/Easy
        const deltaT = isLapse ? 1 : Math.max(1, Math.round(currentInterval));
        reviews.push(new FSRSBindingReview(rating, deltaT));
        if (isLapse) {
          currentInterval = 1;
        } else {
          currentInterval = Math.min(365, currentInterval * (rating === 4 ? 2.5 : 1.8));
        }
      }

      trainItems.push(new FSRSBindingItem(reviews));

      seedLogs.push({
        userId: user.id,
        cardId: card.card_id,
        deckId: card.deck_id,
        reps,
        reviewsCount: reviews.length,
      });
    }

    const totalReviewCount = trainItems.reduce((acc, it) => acc + it.reviews.length, 0);
    console.log(`🧠 Chuẩn bị huấn luyện với ${trainItems.length} thẻ (${totalReviewCount} lượt review)...`);

    const startTime = Date.now();
    const optimizedWeights = await computeParameters(trainItems, {
      modelVersion: ModelVersion.Fsrs6,
      enableShortTerm: true,
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Huấn luyện thành công sau ${duration}s!`);
    console.log("Vector trọng số w tối ưu hóa:");
    console.log(optimizedWeights);

    // So sánh:
    console.log("\n📊 So sánh tham số FSRS:");
    console.log(`- Trọng số ban đầu Again (w0): ${DEFAULT_W[0]} -> Tối ưu: ${optimizedWeights[0].toFixed(4)}`);
    console.log(`- Trọng số ban đầu Hard  (w1): ${DEFAULT_W[1]} -> Tối ưu: ${optimizedWeights[1].toFixed(4)}`);
    console.log(`- Trọng số ban đầu Good  (w2): ${DEFAULT_W[2]} -> Tối ưu: ${optimizedWeights[2].toFixed(4)}`);
    console.log(`- Trọng số ban đầu Easy  (w3): ${DEFAULT_W[3]} -> Tối ưu: ${optimizedWeights[3].toFixed(4)}`);
    console.log(`- Trọng số độ khó ban đầu (w4): ${DEFAULT_W[4]} -> Tối ưu: ${optimizedWeights[4].toFixed(4)}`);

    // Lưu vào D1 user_fsrs_settings
    console.log("\n💾 Lưu cấu hình tối ưu vào D1 user_fsrs_settings...");
    const weightsJsonStr = JSON.stringify(optimizedWeights).replace(/'/g, "''");

    const updateSql = `INSERT INTO user_fsrs_settings (user_id, weights_json, desired_retention, maximum_interval, enable_short_term, optimized_at, log_count_at_optimize, updated_at)
      VALUES ('${user.id}', '${weightsJsonStr}', 0.85, 36500, 1, CURRENT_TIMESTAMP, ${totalReviewCount}, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        weights_json = excluded.weights_json,
        desired_retention = 0.85,
        optimized_at = CURRENT_TIMESTAMP,
        log_count_at_optimize = excluded.log_count_at_optimize,
        updated_at = CURRENT_TIMESTAMP;`;

    runD1Query(updateSql);
    console.log("✅ Đã lưu cấu hình FSRS tối ưu hóa vào D1!");
  }
}

main().catch(console.error);
