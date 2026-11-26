// Số từ non (khoảng ôn < 21 ngày) / chín (>= 21 ngày) ở cuối mỗi ngày (giờ VN), dựng lại từ review_logs.
// Log lưu scheduled_days của thẻ TRƯỚC lần chấm, nên khoảng sau lần chấm i = scheduled_days của log i+1; lần cuối = interval hiện tại.
export function vocabGrowth(
  states: { deck_id: string; card_id: number; interval: number; state: string; last_review: string | null }[],
  logs: { deck_id: string; card_id: number; scheduled_days: number; review_time: string }[],
  dayCount: number | null, // null = từ ngày học đầu tiên tới hôm nay
  now = Date.now(),
) {
  const dayOf = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const byCard = new Map<string, { day: string; sched: number }[]>();
  for (const log of logs) {
    const key = `${log.deck_id}_${log.card_id}`;
    if (!byCard.has(key)) byCard.set(key, []);
    byCard.get(key)!.push({ day: dayOf(log.review_time), sched: Number(log.scheduled_days) || 0 });
  }
  // Mỗi thẻ: danh sách (ngày, khoảng ôn sau lần chấm đó).
  const events: { day: string; interval: number }[][] = [];
  for (const st of states) {
    // Đếm theo từ: chỉ thẻ Review (id dương); thẻ Typing lưu id âm.
    if (st.state === "new" || Number(st.card_id) < 0) continue;
    const key = `${st.deck_id}_${st.card_id}`;
    const reviews = byCard.get(key);
    if (!reviews) {
      if (st.last_review) events.push([{ day: st.last_review.slice(0, 10), interval: Number(st.interval) || 0 }]);
      continue;
    }
    events.push(reviews.map((r, i) => ({ day: r.day, interval: i + 1 < reviews.length ? reviews[i + 1].sched : Number(st.interval) || 0 })));
  }
  const today = dayOf(new Date(now).toISOString());
  if (dayCount === null) {
    const first = events.reduce((min, list) => (list[0] && list[0].day < min ? list[0].day : min), today);
    dayCount = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86400000) + 1;
  }
  const days: { day: string; young: number; mature: number }[] = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const day = new Date(new Date(`${today}T00:00:00Z`).getTime() - i * 86400000).toISOString().slice(0, 10);
    let young = 0, mature = 0;
    for (const list of events) {
      let interval = -1;
      for (const ev of list) { if (ev.day <= day) interval = ev.interval; else break; }
      if (interval < 0) continue;
      if (interval >= 21) mature++; else young++;
    }
    days.push({ day, young, mature });
  }
  return days;
}
