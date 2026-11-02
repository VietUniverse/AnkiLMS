// Điền chồng chữ lên mẫu PDF gốc. Chạy hoàn toàn trên trình duyệt, không gửi dữ liệu đi đâu.
import type { PDFFont, PDFPage } from "pdf-lib";

export type XacNhanData = {
  name: string; arc: string; major: string; term: string; phone: string; email: string;
  company: string; bizNo: string; industry: string; address: string;
  employer: string; employerPhone: string; period: string; wage: string; weekday: string; weekend: string;
  year: string; month: string; day: string; office: string; univ: string; iequas: "" | "yes" | "no";
};

// Ô trong tọa độ điểm PDF, gốc trên-trái (đo trên mẫu CKU_시간제취업확인서_20250306.pdf)
type Cell = { x0: number; x1: number; y0: number; y1: number };
const C = {
  name: { x0: 190.5, x1: 339.3, y0: 114.5, y1: 147.7 },
  arc: { x0: 400.6, x1: 535.4, y0: 114.5, y1: 147.7 },
  major: { x0: 190.5, x1: 339.3, y0: 147.7, y1: 181.2 },
  term: { x0: 400.6, x1: 535.4, y0: 147.7, y1: 181.2 },
  phone: { x0: 190.5, x1: 339.3, y0: 181.2, y1: 208 },
  email: { x0: 400.6, x1: 535.4, y0: 181.2, y1: 208 },
  company: { x0: 190.5, x1: 535.4, y0: 208, y1: 235.5 },
  bizNo: { x0: 190.5, x1: 359.2, y0: 235.5, y1: 269.1 },
  industry: { x0: 417.6, x1: 535.4, y0: 235.5, y1: 269.1 },
  address: { x0: 190.5, x1: 535.4, y0: 269.1, y1: 296.4 },
  employer: { x0: 190.5, x1: 272, y0: 296.4, y1: 330 },
  employerPhone: { x0: 417.6, x1: 535.4, y0: 296.4, y1: 330 },
  period: { x0: 190.5, x1: 359.2, y0: 330, y1: 397.1 },
  wage: { x0: 417.6, x1: 535.4, y0: 330, y1: 397.1 },
  weekday: { x0: 250, x1: 382, y0: 397.1, y1: 423.7 },
  weekend: { x0: 448, x1: 535.4, y0: 397.1, y1: 423.7 },
  univ: { x0: 207.4, x1: 339.3, y0: 643.5, y1: 660.4 },
} satisfies Record<string, Cell>;

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
function put(page: PDFPage, font: PDFFont, rgb: (r: number, g: number, b: number) => ReturnType<typeof import("pdf-lib").rgb>, text: string, cell: Cell, size = 10.5, align: "left" | "center" = "left", pad = 6) {
  text = (text || "").trim();
  if (!text) return;
  const H = page.getHeight();
  const maxW = cell.x1 - cell.x0 - pad, maxH = cell.y1 - cell.y0 - 4;
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
  put(page, font, rgb, d.period, C.period);
  put(page, font, rgb, d.wage, C.wage);
  put(page, font, rgb, d.weekday, C.weekday, 9.5);
  put(page, font, rgb, d.weekend, C.weekend, 9.5);

  // Ngày ký: điền hai chữ số cuối của năm, tháng, ngày vào chỗ "20 . . ."
  const dateCell = (x0: number, x1: number): Cell => ({ x0, x1, y0: 503, y1: 519 });
  put(page, font, rgb, d.year.slice(-2), dateCell(283, 296), 9, "center", 0);
  put(page, font, rgb, d.month, dateCell(298, 311), 9, "center", 0);
  put(page, font, rgb, d.day, dateCell(313, 326), 9, "center", 0);

  // Dòng gửi: thay "○○" bằng tên sở xuất nhập cảnh nếu người dùng điền
  if (d.office.trim()) {
    page.drawRectangle({ x: 172, y: H - 619, width: 252, height: 24, color: white });
    put(page, font, rgb, `${d.office.trim()}장 귀하`, { x0: 172, x1: 424, y0: 598, y1: 619 }, 11, "center");
  }
  // Phần trường điền: chỉ điền sẵn nếu có dữ liệu, còn lại để trống cho nhân viên ký
  if (d.univ.trim()) {
    page.drawRectangle({ x: 270, y: H - 659, width: 60, height: 14, color: white });
    put(page, font, rgb, d.univ, C.univ, 10.5, "center");
  }
  if (d.iequas === "yes") cross(page, rgb, 252.5, 671.5, 10);
  if (d.iequas === "no") cross(page, rgb, 306.5, 671.5, 10);

  return doc.save();
}
