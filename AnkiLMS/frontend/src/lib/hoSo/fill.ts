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


// ---- 단시간근로자 표준근로계약서: dựng lại theo mẫu PDF của người dùng (khổ Letter, chữ 12pt, toạ độ đo từ mẫu) ----
const BLACK = [0, 0, 0] as const;
const ymd = (iso: string) => { const [y, m, d] = iso.split("-"); return y ? [y, String(Number(m)), String(Number(d))] : ["", "", ""]; };
const hm = (t: string) => { const [h, m] = t.split(":"); return h ? [String(Number(h)), String(Number(m ?? 0)).padStart(2, "0")] : ["", ""]; };

export async function hopDong(d: XacNhanData): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  const fontBytes = await load("/forms/NotoSansKR-subset.ttf");
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: false });
  const page = doc.addPage([612, 792]);
  const H = 792, S = 12;
  // Một dòng gồm các đoạn chữ đen; [giá trị] là chữ xanh điền vào chỗ trống (trống thì chừa khoảng trắng).
  type P = string | [string, number];
  const line = (top: number, x: number, parts: P[]) => {
    for (const p of parts) {
      const t = typeof p === "string" ? p : p[0] || " ".repeat(p[1]), color: readonly [number, number, number] = typeof p === "string" ? BLACK : BLUE;
      page.drawText(t, { x, y: H - (top + 10.9), size: S, font, color: rgb(...color) });
      x += font.widthOfTextAtSize(t, S);
    }
  };
  const v = (t: string, blank = 6): P => [t.trim(), blank];
  const ul = (t: string, n: number): P => [t.trim() || "_".repeat(n), n];

  page.drawRectangle({ x: 72, y: H - 99.06, width: 468.5, height: 27.06, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
  const title = "단시간근로자 표준근로계약서", tw = font.widthOfTextAtSize(title, 18);
  for (const dx of [0, 0.45]) page.drawText(title, { x: 306.25 - tw / 2 + dx, y: H - 91, size: 18, font, color: rgb(0, 0, 0) });

  const [fy, fm, fd] = ymd(d.periodFrom), [ty, tm, td] = ymd(d.periodTo);
  const [sh, smin] = hm(d.startTime), [eh, emin] = hm(d.endTime);
  const days = DAYS.filter((k) => hoursOf(d[k]) !== null).length;
  const wage = d.wage.replace(/\D/g, "");
  line(126.3, 72, [ul(d.company, 18), " (이하 “사업주”라 함)과(와) ", v(d.name), " (이하 “근로자”라 함)"]);
  line(146.3, 72, ["은 다음과 같이 근로계약을 체결한다."]);
  line(166.3, 72, ["1. 근로계약기간 :  ", v(fy), "년 ", v(fm, 2), "월 ", v(fd, 2), "일부터  ", v(ty), "년 ", v(tm, 2), "월 ", v(td, 2), "일까지"]);
  line(185.2, 72, ["※ 근로계약기간을 정하지 않는 경우에는 “근로개시일”만 기재"]);
  line(206.2, 72, ["2. 근 무 장 소 : ", v([d.company, d.address].filter(Boolean).join(", "), 1)]);
  line(226.2, 72, ["3. 업무의 내용 : ", v(d.job, 1)]);
  line(246.2, 72, ["4. 소정근로시간 : ", v(sh, 2), "시 ", v(smin, 2), "분부터 ", v(eh, 2), "시 ", v(emin, 2), "분까지 (휴게시간 :   시   분~   시   분)"]);
  line(266.2, 72, ["5. 근무일/휴일 : 매주 ", v(days ? String(days) : "", 2), "일(또는 매일단위)근무, 주휴일 매주   요일"]);
  line(286.2, 72, ["6. 임 금"]);
  line(306.1, 78.67, ["- 시간(일, 월)급 : ", v(wage ? Number(wage).toLocaleString("en-US") : "", 9), "원(해당사항에 ○표)"]);
  line(326.1, 78.67, ["- 상여금 : 있음 (   )       원, 없음 (   )"]);
  line(346.1, 78.67, ["- 기타급여(제수당 등) : 있음 :        원(내역별 기재), 없음 (   ),"]);
  line(366.1, 78.67, ["- 초과근로에 대한 가산임금률:     %"]);
  line(386.1, 78.67, ["- 임금지급일 : 매월(매주 또는 매일)    일(휴일의 경우는 전일 지급)"]);
  line(406.0, 78.67, ["- 지급방법 : 근로자에게 직접지급(   ), 근로자 명의 예금통장에 입금(   )"]);
  line(426.0, 72, ["7. 연차유급휴가 : 통상근로자의 근로시간에 비례하여 연차유급휴가 부여"]);
  line(446.0, 72, ["8. 근로계약서 교부"]);
  line(466.0, 78.67, ["- “사업주”는 근로계약을 체결함과 동시에 본 계약서를 사본하여 “근로자”의 교부요구와 관계"]);
  line(486.0, 72, ["없이 “근로자”에게 교부함(근로기준법 제17조 이행)"]);
  line(506.0, 72, ["9. 기 타"]);
  line(525.9, 78.67, ["- 이 계약에 정함이 없는 사항은 근로기준법령에 의함"]);
  line(545.9, 88.67, ["  ", v(d.year, 4), "년  ", v(d.month ? String(Number(d.month)) : "", 2), "월  ", v(d.day ? String(Number(d.day)) : "", 2), "일"]);
  line(565.9, 72, ["(사업주) 사업체명 : ", ul(d.company, 20), " (전화 : ", ul(d.employerPhone, 14), ")"]);
  line(585.9, 102, ["주 소 : ", ul(d.address, 36)]);
  line(605.9, 102, ["대 표 자 : ", ul(d.employer, 20), " (서명)"]);
  line(625.9, 72, ["(근로자) 주 소 : ", v(d.addrKr, 1)]);
  line(645.8, 102, ["연 락 처 : ", v(d.phone, 1)]);
  line(665.8, 102, ["성 명 : ", v(d.name, 1), " (서명)"]);
  return doc.save();
}
