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
function put(page: PDFPage, font: PDFFont, rgb: (r: number, g: number, b: number) => ReturnType<typeof import("pdf-lib").rgb>, text: string, cell: Cell, size = 10.5, align: "left" | "center" = "left", pad = 6, vpad = 4) {
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
    page.drawText(l, { x, y: H - (top + i * lh + s * 0.95), size: s, font, color: rgb(...BLUE) });
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

  // Bỏ băng "붙임 4-1 ... 대학 작성" (nhãn đính kèm nội bộ của trường đăng mẫu, không thuộc mẫu gốc)
  page.drawRectangle({ x: 38, y: H - 92, width: 490, height: 40, color: white });

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
