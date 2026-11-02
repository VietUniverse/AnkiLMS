"""Tạo NotoSansKR-subset.ttf (TrueType) từ Noto Sans CJK có sẵn: chỉ Hangul + Latin + dấu câu."""
import sys
from fontTools.ttLib import TTCollection, TTFont, newTable
from fontTools import subset
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen

src, out = sys.argv[1], sys.argv[2]
for f in TTCollection(src).fonts:
    if "KR" in f["name"].getDebugName(1): font = f; break
else: sys.exit("không thấy bản KR")
uni = list(range(0x20, 0x7F)) + list(range(0xAC00, 0xD7A4)) + list(range(0x1100, 0x1200)) + list(range(0x3130, 0x3190)) + [0x00B7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x00D7, 0x25CB, 0x2713, 0x203B]
opts = subset.Options(); opts.layout_features = ["kern"]; opts.notdef_outline = True; opts.hinting = False; opts.name_IDs = ["*"]
s = subset.Subsetter(opts); s.populate(unicodes=uni); s.subset(font)
# CFF -> glyf
gs = font.getGlyphSet(); order = font.getGlyphOrder(); glyf = {}
for n in order:
    pen = TTGlyphPen(gs); gs[n].draw(Cu2QuPen(pen, 1.0, reverse_direction=True)); glyf[n] = pen.glyph()
font["glyf"] = newTable("glyf"); font["glyf"].glyphOrder = order; font["glyf"].glyphs = glyf
font["loca"] = newTable("loca"); font["head"].glyphDataFormat = 0
maxp = font["maxp"]; maxp.tableVersion = 0x00010000
for a in ("maxZones","maxTwilightPoints","maxStorage","maxFunctionDefs","maxInstructionDefs","maxStackElements","maxSizeOfInstructions","maxComponentElements"): setattr(maxp, a, 0)
maxp.maxZones = 1
for a in ("maxPoints","maxContours","maxCompositePoints","maxCompositeContours","maxComponentDepth"): setattr(maxp, a, 0)
font["post"].formatType = 2.0; font["post"].extraNames = []; font["post"].mapping = {}
for t in ("CFF ","VORG","CFF2"):
    if t in font: del font[t]
font.sfntVersion = "\x00\x01\x00\x00"
font.save(out)
