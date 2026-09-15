"""Read exported artwork, check image integrity, and write a brand-only report."""
from pathlib import Path
import json
import xml.etree.ElementTree as ET
from PIL import Image, ImageChops

root = Path(__file__).resolve().parent.parent
report = {"svg_checks": [], "png_checks": [], "contrast_ratios": {}, "result": "pass"}
allowed = {(37,99,235), (14,165,233), (99,102,241), (17,24,39), (249,250,251), (96,165,250), (255,255,255), (0,0,0)}
for f in sorted((root / "logo").glob("*.svg")):
    doc = ET.parse(f).getroot()
    tags = {el.tag.split("}")[-1] for el in doc.iter()}
    assert not tags.intersection({"text", "image", "script", "foreignObject"}), f
    assert all("href" not in key for el in doc.iter() for key in el.attrib), f
    assert doc.get("viewBox") and doc.find("{http://www.w3.org/2000/svg}title") is not None, f
    report["svg_checks"].append({"file": f.relative_to(root).as_posix(), "self_contained_paths": True})

for f in sorted((root / "png").glob("*.png")):
    im = Image.open(f)
    assert im.mode == "RGBA", (f, im.mode)
    im.load()
    alpha = im.getchannel("A")
    box = alpha.getbbox()
    assert box, f
    assert alpha.getextrema()[0] < 255, f
    if "favicon" not in f.name:
        assert alpha.getextrema()[0] == 0, f
        assert box[0] > 0 and box[1] > 0 and box[2] < im.width and box[3] < im.height, (f, box)
    pixels = im.get_flattened_data() if hasattr(im, "get_flattened_data") else im.getdata()
    opaque_colors = {pixel[:3] for pixel in pixels if pixel[3] == 255}
    if "favicon" in f.name:
        # White symbol antialiases onto an opaque blue field, producing blends.
        assert (37,99,235) in opaque_colors and (255,255,255) in opaque_colors, f
        for r,g,b in opaque_colors:
            t = (r-37)/218
            assert 0 <= t <= 1 and abs(g-(99+156*t)) <= 2 and abs(b-(235+20*t)) <= 2, (f,(r,g,b))
    else:
        assert opaque_colors.issubset(allowed), (f, opaque_colors - allowed)
    if "monochrome" in f.name:
        assert opaque_colors == {(0,0,0)}, f
    if "white" in f.name:
        assert opaque_colors == {(255,255,255)}, f
    if "favicon-" in f.name:
        size = int(f.stem.split("-")[-1])
        assert im.size == (size,size), f
    report["png_checks"].append({"file": f.relative_to(root).as_posix(), "size": list(im.size), "mode": im.mode, "alpha_bbox": list(box), "palette_valid": True, "opaque_color_count": len(opaque_colors)})

black = Image.open(root / "png/sciledger-logo-monochrome.png").getchannel("A")
white = Image.open(root / "png/sciledger-logo-white.png").getchannel("A")
alpha_delta = ImageChops.difference(black, white).getextrema()[1]
assert alpha_delta <= 1  # Chromium rounding at antialiased contours, out of 255.
def geometry(file):
    return [(el.tag, {k:v for k,v in el.attrib.items() if k not in {"fill", "aria-label"}}) for el in ET.parse(file).getroot().iter() if not el.tag.endswith("title")]
assert geometry(root / "logo/sciledger-logo-monochrome.svg") == geometry(root / "logo/sciledger-logo-white.svg")
assert Image.open(root / "png/sciledger-logo.png").tobytes() == Image.open(root / "png/sciledger-logo-light.png").tobytes()
report["monochrome_geometry_equal"] = True
report["monochrome_max_alpha_rounding_difference_255"] = alpha_delta
report["light_alias_equal"] = True

def luminance(rgb):
    v = [a / 255 for a in rgb]
    v = [a / 12.92 if a <= .04045 else ((a + .055) / 1.055)**2.4 for a in v]
    return sum(a*b for a,b in zip(v, [.2126,.7152,.0722]))

for name, a, b in [("primary_on_white",(37,99,235),(255,255,255)), ("primary_on_light",(37,99,235),(249,250,251)), ("dark_on_white",(17,24,39),(255,255,255)), ("reverse_blue_on_dark",(96,165,250),(17,24,39)), ("white_on_dark",(255,255,255),(17,24,39))]:
    hi,lo = sorted([luminance(a),luminance(b)],reverse=True)
    report["contrast_ratios"][name] = round((hi+.05)/(lo+.05),2)

(root / "source/quality-check.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"result":report["result"],"svgs":len(report["svg_checks"]),"pngs":len(report["png_checks"]),"contrast":report["contrast_ratios"]}))
