// Điền chồng chữ lên mẫu PDF gốc. Chạy hoàn toàn trên trình duyệt, không gửi dữ liệu đi đâu.
import type { PDFFont, PDFPage } from "pdf-lib";

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];
export type XacNhanData = {
  name: string; arc: string; major: string; term: string; phone: string; email: string;
  company: string; bizNo: string; industry: string; address: string;
  employer: string; employerPhone: string; periodFrom: string; periodTo: string; wage: string; // periodFrom/To dạng YYYY-MM-DD, wage chỉ gồm chữ số
  // số giờ làm mỗi ngày (có thể lẻ, ví dụ 4.5); để trống nếu không làm
  mon: string; tue: string; wed: string; thu: string; fri: string; sat: string; sun: string;
  year: string; month: string; day: string; office: string;
  // chỉ dùng cho hợp đồng
  addrKr: string; job: string; startTime: string; endTime: string; breakMin: string;
};

export function hoursOf(v: string): number | null {
  const n = Number(v.trim().replace(",", "."));
  return v.trim() && Number.isFinite(n) && n > 0 && n <= 24 ? n : null;
}
export function totals(d: Pick<XacNhanData, Day>) {
  const sum = (ks: Day[]) => ks.reduce((t, k) => t + (hoursOf(d[k]) ?? 0), 0);
  const fmt = (n: number) => (n ? String(Math.round(n * 10) / 10) : "");
  return { weekday: fmt(sum(["mon", "tue", "wed", "thu", "fri"])), weekend: fmt(sum(["sat", "sun"])) };
}

// Ô trong tọa độ điểm PDF, gốc trên-trái (đo trên mẫu 시간제취업확인서_bản_trống.pdf)
type Cell = { x0: number; x1: number; y0: number; y1: number };
const C = {
  name: { x0: 176, x1: 325, y0: 139.7, y1: 170.8 },
  arc: { x0: 386, x1: 522, y0: 139.7, y1: 170.8 },
  major: { x0: 176, x1: 325, y0: 170.8, y1: 201.6 },
  term: { x0: 386, x1: 522, y0: 170.8, y1: 201.6 },
  phone: { x0: 176, x1: 325, y0: 201.6, y1: 225.8 },
  email: { x0: 386, x1: 522, y0: 201.6, y1: 225.8 },
  company: { x0: 176, x1: 522, y0: 226, y1: 250.2 },
  bizNo: { x0: 176, x1: 344.7, y0: 250.2, y1: 282.4 },
  industry: { x0: 403.1, x1: 522, y0: 250.2, y1: 282.4 },
  address: { x0: 176, x1: 522, y0: 282.4, y1: 306.8 },
  employer: { x0: 176, x1: 276, y0: 306.8, y1: 338.8 },
  employerPhone: { x0: 403.1, x1: 522, y0: 306.8, y1: 338.8 },
  period: { x0: 176, x1: 344.7, y0: 338.8, y1: 374.9 },
  wage: { x0: 403.1, x1: 522, y0: 338.8, y1: 374.9 },
  weekdayTotal: { x0: 316, x1: 341, y0: 380.3, y1: 390.3 },
  weekendTotal: { x0: 460, x1: 480, y0: 380.3, y1: 390.3 },
} satisfies Record<string, Cell>;
const DAY_X: Record<Day, [number, number]> = { mon: [216, 255], tue: [255, 293], wed: [293, 332], thu: [332, 370], fri: [370, 408], sat: [409, 458], sun: [458, 508] };

const BLUE = [0.05, 0.2, 0.8] as const;

async function load(path: string) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Không tải được ${path}`);
  return new Uint8Array(await r.arrayBuffer());
}

function wrapLines(font: PDFFont, text: string, size: number, maxW: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const ch of para) {
      if (line && font.widthOfTextAtSize(line + ch, size) > maxW) { out.push(line); line = ch; } else line += ch;
    }
    out.push(line);
  }
  return out;
}

// Chữ vừa ô: co cỡ chữ tới 5pt, hết cỡ thì tách dòng.
function put(page: PDFPage, font: PDFFont, rgb: (r: number, g: number, b: number) => ReturnType<typeof import("pdf-lib").rgb>, text: string, cell: Cell, size = 10.5, align: "left" | "center" = "left", pad = 6, vpad = 4, color: readonly [number, number, number] = BLUE) {
  text = (text || "").trim();
  if (!text) return;
  const H = page.getHeight();
  const maxW = cell.x1 - cell.x0 - pad, maxH = cell.y1 - cell.y0 - vpad;
  let s = size, lines = wrapLines(font, text, s, maxW);
  const fits = () => lines.length * s * 1.25 <= maxH;
  while (s > 5 && (!fits() || (lines.length === 1 && font.widthOfTextAtSize(lines[0], s) > maxW))) {
    s -= 0.5;
    lines = font.widthOfTextAtSize(text, s) <= maxW ? [text] : wrapLines(font, text, s, maxW);
  }
  const lh = s * 1.25, total = lines.length * lh, top = (cell.y0 + cell.y1) / 2 - total / 2;
  lines.forEach((l, i) => {
    const w = font.widthOfTextAtSize(l, s);
    const x = align === "center" ? (cell.x0 + cell.x1) / 2 - w / 2 : cell.x0 + (pad ? 3 : 0);
    page.drawText(l, { x, y: H - (top + i * lh + s * 0.95), size: s, font, color: rgb(...color) });
  });
}

function cross(page: PDFPage, rgb: (r: number, g: number, b: number) => ReturnType<typeof import("pdf-lib").rgb>, x0: number, y0: number, size: number) {
  const H = page.getHeight();
  const c = rgb(...BLUE);
  page.drawLine({ start: { x: x0, y: H - y0 }, end: { x: x0 + size, y: H - (y0 + size) }, thickness: 1.2, color: c });
  page.drawLine({ start: { x: x0 + size, y: H - y0 }, end: { x: x0, y: H - (y0 + size) }, thickness: 1.2, color: c });
}

export async function xacNhan(d: XacNhanData): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  const [tpl, fontBytes] = await Promise.all([load("/forms/xac_nhan_trong.pdf"), load("/forms/NotoSansKR-subset.ttf")]);
  const doc = await PDFDocument.load(tpl);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: false });
  // Chỉ giữ trang 1 (bản tiếng Hàn). Trang 2 tiếng Anh chưa làm.
  doc.removePage(1);
  const page = doc.getPage(0);
  const H = page.getHeight();
  const white = rgb(1, 1, 1);

  put(page, font, rgb, d.name, C.name);
  put(page, font, rgb, d.arc, C.arc);
  put(page, font, rgb, d.major, C.major);
  put(page, font, rgb, d.term ? `${d.term}학기` : "", C.term);
  put(page, font, rgb, d.phone, C.phone);
  put(page, font, rgb, d.email, C.email, 9);
  put(page, font, rgb, d.company, C.company);
  put(page, font, rgb, d.bizNo, C.bizNo);
  put(page, font, rgb, d.industry, C.industry);
  put(page, font, rgb, d.address, C.address, 10);
  put(page, font, rgb, d.employer, C.employer);
  put(page, font, rgb, d.employerPhone, C.employerPhone);
  const dot = (iso: string) => iso.replace(/-/g, ".");
  put(page, font, rgb, d.periodFrom && d.periodTo ? `${dot(d.periodFrom)} ~ ${dot(d.periodTo)}` : "", C.period);
  const wage = d.wage.replace(/\D/g, "");
  put(page, font, rgb, wage ? `${Number(wage).toLocaleString("en-US")}원` : "", C.wage);
  // Bảng giờ làm: mỗi ngày một ô, và tổng giờ ngày thường, cuối tuần
  const t = totals(d);
  put(page, font, rgb, t.weekday, C.weekdayTotal, 9, "center", 0, 0);
  put(page, font, rgb, t.weekend, C.weekendTotal, 9, "center", 0, 0);
  for (const k of DAYS) {
    const h = hoursOf(d[k]);
    put(page, font, rgb, h ? String(h) : "", { x0: DAY_X[k][0], x1: DAY_X[k][1], y0: 411.5, y1: 438 }, 11, "center", 2);
  }

  // Ngày ký: hai chữ số cuối của năm, tháng, ngày vào chỗ "20 . . ."
  const dateCell = (x0: number, x1: number): Cell => ({ x0, x1, y0: 500, y1: 516 });
  put(page, font, rgb, d.year.slice(-2), dateCell(269.5, 281), 9, "center", 0);
  put(page, font, rgb, d.month, dateCell(284.5, 296), 9, "center", 0);
  put(page, font, rgb, d.day, dateCell(299.5, 310.5), 9, "center", 0);

  // Dòng gửi: thay "○ ○ ...출입국·외국인청(사무소·출장소)장 귀하" bằng tên sở nếu người dùng điền
  if (d.office.trim()) {
    page.drawRectangle({ x: 100, y: H - 664, width: 366, height: 26, color: white });
    put(page, font, rgb, `${d.office.trim()}장 귀하`, { x0: 100, x1: 466, y0: 638, y1: 664 }, 12, "center");
  }
  return doc.save();
}


// ---- 표준근로계약서 (시간제근로자용): dựng bằng code theo mẫu của Bộ Lao động ----
const BLACK = [0, 0, 0] as const;
const KO_DAY: Record<Day, string> = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" };
const ymd = (iso: string) => { const [y, m, d] = iso.split("-"); return y ? `${y}년 ${Number(m)}월 ${Number(d)}일` : ""; };

export async function hopDong(d: XacNhanData): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  const fontBytes = await load("/forms/NotoSansKR-subset.ttf");
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: false });
  const page = doc.addPage([595, 842]);
  const H = 842;
  const line = rgb(0, 0, 0);
  const box = (c: Cell, w = 0.8) => page.drawRectangle({ x: c.x0, y: H - c.y1, width: c.x1 - c.x0, height: c.y1 - c.y0, borderColor: line, borderWidth: w });
  const label = (t: string, c: Cell, size = 10.5) => { box(c); put(page, font, rgb, t, c, size, "center", 4, 4, BLACK); };
  const val = (t: string, c: Cell, size = 10.5) => { box(c); put(page, font, rgb, t, c, size, "left", 8, 6); };
  const center = (t: string, y: number, size: number, bold = false) => {
    const w = font.widthOfTextAtSize(t, size);
    for (const dx of bold ? [0, 0.45] : [0]) page.drawText(t, { x: 297.5 - w / 2 + dx, y: H - y, size, font, color: line });
  };
  const text = (t: string, x: number, y: number, size = 10.5, color: readonly [number, number, number] = BLACK) => page.drawText(t, { x, y: H - y, size, font, color: rgb(...color) });

  center("표 준 근 로 계 약 서", 78, 22, true);
  center("(시간제근로자용)", 100, 12);
  text("1. 당사자", 56, 130, 11.5);

  const L = 56, R = 539, row = 32;
  let y = 138;
  const r = (n: number): [number, number] => [y + row * n, y + row * (n + 1)];
  // 사용자 (3 dòng) + 근로자 (2 dòng)
  const cell = (x0: number, x1: number, n: number, span = 1): Cell => ({ x0, x1, y0: r(n)[0], y1: r(n + span - 1)[1] });
  label("사용자", cell(L, 96, 0, 3));
  label("성 명", cell(96, 156, 0)); val(d.employer, cell(156, 290, 0));
  label("주민(외국인)\n등록번호", cell(290, 372, 0), 9); val("", cell(372, R, 0));
  label("사업체 명칭", cell(96, 156, 1), 9.5); val(d.company, cell(156, R, 1));
  label("사업장\n소재지", cell(96, 156, 2), 9.5); val(d.address, cell(156, R, 2));
  label("근로자", cell(L, 96, 3, 2));
  label("성 명", cell(96, 156, 3)); val(d.name, cell(156, 290, 3));
  label("외국인등록번호", cell(290, 372, 3), 9); val(d.arc, cell(372, R, 3));
  label("주 소", cell(96, 156, 4)); val(d.addrKr, cell(156, 372, 4), 10);
  label("전 화", cell(372, 410, 4)); val(d.phone, cell(410, R, 4));

  // 2 ~ 5
  y = 138 + row * 5 + 14;
  const sec = (t: string, n: number, v: string, rows = 1) => { const c = cell(L, 180, n, rows); label(t, c, 10.5); val(v, cell(180, R, n, rows)); };
  sec("2. 근로계약기간", 0, d.periodFrom && d.periodTo ? `${ymd(d.periodFrom)} ~ ${ymd(d.periodTo)}` : "");
  sec("3. 업무의 내용", 1, d.job);
  sec("4. 근 로 장 소", 2, [d.company, d.address].filter(Boolean).join(", "));
  // 5. 근로조건
  const days = DAYS.filter((k) => hoursOf(d[k]) !== null);
  const t = totals(d);
  const weekTotal = (Number(t.weekday) || 0) + (Number(t.weekend) || 0);
  const brk = d.breakMin.trim() ? `, 휴게시간 ${d.breakMin.trim()}분` : "";
  const time = d.startTime && d.endTime ? `${d.startTime} ~ ${d.endTime}${brk}` : "";
  const hourText = [time, days.length ? `${days.map((k) => `${KO_DAY[k]} ${hoursOf(d[k])}시간`).join(", ")} (주 ${Math.round(weekTotal * 10) / 10}시간)` : ""].filter(Boolean).join("\n");
  const y5 = r(3)[0], h1 = 44, h2 = 32;
  const rows5: [number, number][] = [[y5, y5 + h1], [y5 + h1, y5 + h1 + h2], [y5 + h1 + h2, y5 + h1 + 2 * h2]];
  label("5. 근로조건", { x0: L, x1: 120, y0: y5, y1: rows5[2][1] }, 10.5);
  label("가. 근로시간", { x0: 120, x1: 180, y0: rows5[0][0], y1: rows5[0][1] }, 9); val(hourText, { x0: 180, x1: R, y0: rows5[0][0], y1: rows5[0][1] }, 10);
  label("나. 근로요일", { x0: 120, x1: 180, y0: rows5[1][0], y1: rows5[1][1] }, 9); val(days.length ? `매주 ${days.map((k) => KO_DAY[k]).join(", ")}요일 (주 ${days.length}일)` : "", { x0: 180, x1: R, y0: rows5[1][0], y1: rows5[1][1] });
  const wage = d.wage.replace(/\D/g, "");
  label("다. 임금\n(제수당포함)", { x0: 120, x1: 180, y0: rows5[2][0], y1: rows5[2][1] }, 8.5);
  val(wage ? `${Number(wage).toLocaleString("en-US")}` : "", { x0: 180, x1: 400, y0: rows5[2][0], y1: rows5[2][1] });
  label("원 / 시간", { x0: 400, x1: R, y0: rows5[2][0], y1: rows5[2][1] }, 10.5);

  const yTail = rows5[2][1] + 56;
  text("이 계약에 정함이 없는 근로조건은 취업규칙, 근로기준법 기타 노동관계법령에 따른다.", 56, yTail, 10.5);
  text("위와 같이 근로계약을 체결함.", 56, yTail + 34, 10.5);
  center(`${d.year || "    "}년 ${d.month ? Number(d.month) : "   "}월 ${d.day ? Number(d.day) : "   "}일`, yTail + 80, 11.5);
  const sign = (who: string, name: string, yy: number) => {
    text(who, 300, yy, 11);
    put(page, font, rgb, name, { x0: 350, x1: 470, y0: yy - 14, y1: yy + 6 }, 11, "left", 0, 0);
    text("(인)", 480, yy, 10.5);
  };
  sign("사용자", d.employer, yTail + 130);
  sign("근로자", d.name, yTail + 164);
  return doc.save();
}
