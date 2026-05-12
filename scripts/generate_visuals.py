"""Generate 8 diagrams for the Turkish LLM blog post.

Output: public/blog/llm-nedir/*.png  (1600x900 @ dpi=200)
Run:    python scripts/generate_visuals.py
"""
from __future__ import annotations

import os
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle, Circle, Ellipse
import numpy as np


# ----------------------------------------------------------------------
# Global style
# ----------------------------------------------------------------------
PALETTE = {
    "bg_fig": "#ffffff",
    "bg_panel": "#f8fafc",
    "primary": "#2563eb",      # blue-600
    "ink": "#0f172a",          # slate-900
    "muted": "#94a3b8",        # slate-400
    "accent": "#f97316",       # orange-500
    "positive": "#16a34a",     # green-600
    "negative": "#dc2626",     # red-600
    "grid": "#e2e8f0",         # slate-200
    "spine": "#cbd5e1",        # slate-300
    "box_fill": "#dbeafe",     # blue-100
    "lane_blue_bg": "#eff6ff", # blue-50
}

plt.rcParams.update({
    "font.family": ["DejaVu Sans"],
    "font.size": 10,
    "axes.titlesize": 16,
    "axes.titleweight": "bold",
    "axes.labelsize": 12,
    "axes.edgecolor": PALETTE["spine"],
    "axes.linewidth": 0.8,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.labelcolor": PALETTE["ink"],
    "axes.titlecolor": PALETTE["ink"],
    "xtick.color": PALETTE["ink"],
    "ytick.color": PALETTE["ink"],
    "xtick.labelsize": 10,
    "ytick.labelsize": 10,
    "text.color": PALETTE["ink"],
    "figure.facecolor": PALETTE["bg_fig"],
    "axes.facecolor": PALETTE["bg_fig"],
    "savefig.facecolor": PALETTE["bg_fig"],
    "savefig.edgecolor": "none",
    "grid.color": PALETTE["grid"],
    "grid.alpha": 0.6,
    "grid.linewidth": 0.5,
    "mathtext.fontset": "dejavusans",
    "axes.unicode_minus": False,
})

OUT_DIR = Path("C:/Users/ACER/Documents/GitHub/u-blog/public/blog/llm-nedir")
OUT_DIR.mkdir(parents=True, exist_ok=True)

FIGSIZE = (8, 4.5)
DPI = 200


def save(fig: plt.Figure, name: str) -> Path:
    out = OUT_DIR / name
    fig.savefig(out, dpi=DPI, bbox_inches="tight", facecolor="white", edgecolor="none")
    plt.close(fig)
    print(f"  wrote {out} ({out.stat().st_size/1024:.1f} KB)")
    return out


# ======================================================================
# 1. Token TR vs EN (grouped horizontal bar)
# ======================================================================
def diagram_01_token_tr_vs_en() -> None:
    print("Diagram 1: token TR vs EN")
    rows = [
        ("kahvaltı / breakfast", 1, 2),
        ("öğretmenlerimizden / from our teachers", 3, 6),
        ("evlerden / from the houses", 4, 3),
        ("anlayamadık / we could not understand", 4, 5),
        ("Türkiye / Turkey", 1, 2),
        ("çekoslovakyalılaştıramadıklarımızdanmışsınızcasına / —", 8, 17),
    ]
    labels = [r[0] for r in rows]
    en = np.array([r[1] for r in rows])
    tr = np.array([r[2] for r in rows])

    fig, ax = plt.subplots(figsize=FIGSIZE, dpi=DPI)
    y = np.arange(len(labels))
    h = 0.38
    bars_en = ax.barh(y - h/2, en, height=h, color=PALETTE["muted"], label="İngilizce")
    bars_tr = ax.barh(y + h/2, tr, height=h, color=PALETTE["accent"], label="Türkçe")

    for bar, val in zip(bars_en, en):
        ax.text(val + 0.3, bar.get_y() + bar.get_height()/2, str(val),
                va="center", ha="left", fontsize=9, color=PALETTE["ink"])
    for bar, val in zip(bars_tr, tr):
        ax.text(val + 0.3, bar.get_y() + bar.get_height()/2, str(val),
                va="center", ha="left", fontsize=9, color=PALETTE["ink"], fontweight="bold")

    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontsize=9)
    ax.invert_yaxis()
    ax.set_xlabel("Token sayısı")
    ax.set_xlim(0, max(tr.max(), en.max()) * 1.18)
    ax.set_title("Aynı kelime, kaç token? — Türkçe vs İngilizce", pad=24, loc="left")
    ax.grid(axis="x", alpha=0.5)
    ax.set_axisbelow(True)
    # legend in a white box, top-right inside axes — its frame keeps it readable over any grid
    ax.legend(loc="upper right", bbox_to_anchor=(0.995, 0.995),
              frameon=True, fontsize=10, framealpha=0.95,
              edgecolor=PALETTE["spine"], facecolor="white",
              borderpad=0.6)

    save(fig, "01-token-tr-vs-en.png")


# ======================================================================
# 2. Parametre ölçeği (horizontal bar, log x)
# ======================================================================
def diagram_02_parametre_olcegi() -> None:
    print("Diagram 2: parametre olcegi")
    rows = [
        ("Mistral 7B", 7.3, False, "7.3B"),
        ("Phi-4 (Microsoft)", 14, False, "14B"),
        ("Qwen 3.6 (dense)", 27, False, "27B"),
        ("Llama 4 Scout (MoE toplam)", 109, False, "109B"),
        ("Llama 3.1 405B (dense)", 405, False, "405B"),
        ("Mistral Large 3 (MoE)", 675, False, "675B"),
        ("DeepSeek V4 (tahmin)", 1000, True, "~1T"),
        ("GPT-4 (söylenti)", 1760, True, "~1.76T"),
        ("GPT-5.5 (tahmin)", 5000, True, "~5T"),
    ]
    # smallest on top, largest on bottom -> draw bottom-up so first row is top
    labels = [r[0] for r in rows]
    values = np.array([r[1] for r in rows])
    estimate = [r[2] for r in rows]
    bar_labels = [r[3] for r in rows]

    fig, ax = plt.subplots(figsize=FIGSIZE, dpi=DPI)
    y = np.arange(len(labels))
    colors = [PALETTE["muted"] if e else PALETTE["primary"] for e in estimate]
    hatches = ["//" if e else "" for e in estimate]
    bars = ax.barh(y, values, color=colors, edgecolor="white", linewidth=0)
    for bar, h in zip(bars, hatches):
        if h:
            bar.set_hatch(h)
            bar.set_edgecolor("white")

    for bar, lbl, val in zip(bars, bar_labels, values):
        ax.text(val * 1.05, bar.get_y() + bar.get_height()/2, lbl,
                va="center", ha="left", fontsize=9, color=PALETTE["ink"])

    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontsize=10)
    ax.invert_yaxis()
    ax.set_xscale("log")
    ax.set_xlim(3, 20000)
    ax.set_xlabel("Parametre sayısı (milyar, log ölçek)")
    ax.set_title("Modeller ne kadar büyük? — 2026 manzarası", pad=14, loc="left")
    ax.grid(axis="x", which="major", alpha=0.5)
    ax.set_axisbelow(True)

    # legend
    from matplotlib.patches import Patch
    legend_elems = [
        Patch(facecolor=PALETTE["primary"], label="Doğrulanmış"),
        Patch(facecolor=PALETTE["muted"], hatch="//", label="Tahmin / söylenti", edgecolor="white"),
    ]
    ax.legend(handles=legend_elems, loc="upper right",
              bbox_to_anchor=(0.995, 0.995),
              frameon=True, fontsize=9, framealpha=0.95,
              edgecolor=PALETTE["spine"], facecolor="white",
              borderpad=0.6)

    save(fig, "02-parametre-olcegi.png")


# ======================================================================
# 3. Dense vs MoE schematic
# ======================================================================
def _round_box(ax, xy, w, h, fc, ec, text, fs=10, fontweight="normal", text_color=None, lw=1.2):
    box = FancyBboxPatch(xy, w, h,
                         boxstyle="round,pad=0.02,rounding_size=0.08",
                         linewidth=lw, edgecolor=ec, facecolor=fc)
    ax.add_patch(box)
    cx = xy[0] + w/2
    cy = xy[1] + h/2
    ax.text(cx, cy, text, ha="center", va="center", fontsize=fs,
            color=text_color or PALETTE["ink"], fontweight=fontweight)
    return box


def _arrow(ax, x1, y1, x2, y2, color=None, linestyle="-", lw=1.2, arrowstyle="->"):
    color = color or PALETTE["ink"]
    arr = FancyArrowPatch((x1, y1), (x2, y2),
                          arrowstyle=arrowstyle, color=color,
                          linewidth=lw, linestyle=linestyle,
                          mutation_scale=12, shrinkA=2, shrinkB=2)
    ax.add_patch(arr)


def diagram_03_dense_vs_moe() -> None:
    print("Diagram 3: dense vs MoE")
    fig, (axL, axR) = plt.subplots(1, 2, figsize=FIGSIZE, dpi=DPI,
                                    gridspec_kw={"wspace": 0.18})
    fig.suptitle("İki tasarım: Dense vs Mixture of Experts",
                 fontsize=16, fontweight="bold", color=PALETTE["ink"], y=0.99)

    # --- LEFT: dense ---
    for ax in (axL, axR):
        ax.set_xlim(0, 10)
        ax.set_ylim(0, 10)
        ax.set_aspect("equal")
        ax.axis("off")

    # badge
    axL.text(5.0, 9.7, "Dense — her token, tüm parametreler",
             ha="center", va="center", fontsize=10, fontweight="bold",
             color=PALETTE["primary"],
             bbox=dict(boxstyle="round,pad=0.4", fc="white", ec=PALETTE["primary"], lw=1))
    # input
    _round_box(axL, (3.7, 8.4), 2.6, 0.7, "white", PALETTE["spine"], "Giriş Token", fs=9)
    _arrow(axL, 5.0, 8.4, 5.0, 7.85)

    # 4 layers, 8 neurons each
    layer_y = [7.05, 5.85, 4.65, 3.45]
    for ly in layer_y:
        rect = FancyBboxPatch((1.6, ly), 6.8, 0.85,
                              boxstyle="round,pad=0.02,rounding_size=0.08",
                              linewidth=1, edgecolor=PALETTE["primary"],
                              facecolor=PALETTE["box_fill"])
        axL.add_patch(rect)
        for i in range(8):
            cx = 2.0 + i * 0.86
            c = Circle((cx, ly + 0.42), 0.18, facecolor=PALETTE["primary"],
                       edgecolor="white", linewidth=0.8)
            axL.add_patch(c)
    # arrows between layers
    for ly_top, ly_bot in zip(layer_y[:-1], layer_y[1:]):
        _arrow(axL, 5.0, ly_top, 5.0, ly_bot + 0.85)
    # arrow to output
    _arrow(axL, 5.0, layer_y[-1], 5.0, 2.45)
    _round_box(axL, (3.7, 1.7), 2.6, 0.7, "white", PALETTE["spine"], "Çıkış", fs=9)

    axL.text(5.0, 1.05, "Örnek: Llama 3.1 405B", ha="center", va="center",
             fontsize=9, color=PALETTE["muted"], style="italic")

    # --- RIGHT: MoE ---
    axR.text(5.0, 9.7, "MoE — sadece seçilen uzmanlar",
             ha="center", va="center", fontsize=10, fontweight="bold",
             color=PALETTE["accent"],
             bbox=dict(boxstyle="round,pad=0.4", fc="white", ec=PALETTE["accent"], lw=1))
    _round_box(axR, (3.7, 8.4), 2.6, 0.7, "white", PALETTE["spine"], "Giriş Token", fs=9)
    _arrow(axR, 5.0, 8.4, 5.0, 7.55)
    # Router
    _round_box(axR, (3.4, 6.8), 3.2, 0.75, "white", PALETTE["accent"],
               "Router", fs=11, fontweight="bold", text_color=PALETTE["accent"], lw=1.4)

    # 8 experts in two rows of 4
    active = {3, 6}
    expert_positions = []
    cols = 4
    x_left = 0.5
    x_step = 2.4
    row_y = [4.6, 2.7]
    for idx in range(8):
        row = idx // cols
        col = idx % cols
        x = x_left + col * x_step
        y = row_y[row]
        expert_positions.append((x + 0.85, y + 0.4))
        is_active = idx in active
        fc = PALETTE["accent"] if is_active else PALETTE["grid"]
        ec = PALETTE["accent"] if is_active else PALETTE["muted"]
        text_color = "white" if is_active else PALETTE["muted"]
        _round_box(axR, (x, y), 1.7, 0.8, fc, ec, f"Uzman {idx+1}",
                   fs=9, fontweight="bold", text_color=text_color, lw=1)

    # arrows from router to all experts (dim for inactive, bold for active)
    router_bottom = (5.0, 6.8)
    for idx, (ex, ey) in enumerate(expert_positions):
        is_active = idx in active
        c = PALETTE["accent"] if is_active else PALETTE["grid"]
        lw = 1.2 if is_active else 0.6
        _arrow(axR, router_bottom[0], router_bottom[1], ex, ey + 0.4,
               color=c, lw=lw)

    # arrows from active experts down to output (merge point ~ y 1.5)
    merge_y = 1.6
    _round_box(axR, (3.7, 0.9), 2.6, 0.7, "white", PALETTE["spine"], "Çıkış", fs=9)
    for idx, (ex, ey) in enumerate(expert_positions):
        if idx in active:
            _arrow(axR, ex, ey - 0.4, 5.0, merge_y + 0.0,
                   color=PALETTE["accent"], lw=1.2)
    _arrow(axR, 5.0, merge_y, 5.0, 1.6 + 0.0)

    axR.text(5.0, 0.25, "Örnek: DeepSeek V3 — 671B toplam, ~37B aktif",
             ha="center", va="center",
             fontsize=9, color=PALETTE["muted"], style="italic")

    save(fig, "03-dense-vs-moe.png")


# ======================================================================
# 4. Embedding 2D
# ======================================================================
def diagram_04_embedding_2d() -> None:
    print("Diagram 4: embedding 2D")
    groups = [
        ("cinsiyet", PALETTE["primary"], [
            ("kral", 2.0, 5.5),
            ("erkek", 1.0, 4.2),
            ("kadın", 1.0, 6.2),
            ("kraliçe", 2.0, 7.5),
        ]),
        ("başkent", PALETTE["accent"], [
            ("Fransa", 6.0, 3.5),
            ("Paris", 7.5, 4.8),
            ("İtalya", 6.0, 6.0),
            ("Roma", 7.5, 7.3),
        ]),
        ("yiyecek", PALETTE["positive"], [
            ("elma", 3.5, 1.5),
            ("portakal", 4.0, 1.2),
            ("muz", 3.2, 1.8),
        ]),
    ]
    pt_lookup = {p[0]: (p[1], p[2]) for g in groups for p in g[2]}

    fig, ax = plt.subplots(figsize=FIGSIZE, dpi=DPI)
    for name, color, points in groups:
        xs = [p[1] for p in points]
        ys = [p[2] for p in points]
        ax.scatter(xs, ys, s=110, color=color, edgecolor="white",
                   linewidth=1.2, zorder=3, label=name)
        for lbl, x, y in points:
            ax.annotate(lbl, (x, y), xytext=(7, 6), textcoords="offset points",
                        fontsize=10, color=PALETTE["ink"], fontweight="bold")

    # vector arrows
    arrows = [
        ("kral", "kraliçe", PALETTE["primary"]),
        ("erkek", "kadın", PALETTE["primary"]),
        ("Fransa", "Paris", PALETTE["accent"]),
        ("İtalya", "Roma", PALETTE["accent"]),
    ]
    for a, b, color in arrows:
        x1, y1 = pt_lookup[a]
        x2, y2 = pt_lookup[b]
        arr = FancyArrowPatch((x1, y1), (x2, y2),
                              arrowstyle="->", color=color,
                              linewidth=1.4, linestyle="--",
                              mutation_scale=14, shrinkA=8, shrinkB=8, alpha=0.85)
        ax.add_patch(arr)

    # annotation box
    ax.text(8.95, 1.6,
            "kral − erkek + kadın ≈ kraliçe\nParis − Fransa + İtalya ≈ Roma",
            ha="right", va="bottom", fontsize=10, color=PALETTE["ink"],
            bbox=dict(boxstyle="round,pad=0.5", fc="white",
                      ec=PALETTE["spine"], lw=1))

    ax.set_xlabel("Boyut 1")
    ax.set_ylabel("Boyut 2")
    ax.set_xlim(0, 9.2)
    ax.set_ylim(0.5, 8.5)
    ax.set_title("Anlam uzayında yönler — embedding sezgisi", pad=14, loc="left")
    ax.grid(alpha=0.3)
    ax.set_axisbelow(True)
    ax.legend(loc="upper left", frameon=False, fontsize=10)

    save(fig, "04-embedding-2d-projeksiyon.png")


# ======================================================================
# 5. Attention heatmap
# ======================================================================
def diagram_05_attention_heatmap() -> None:
    print("Diagram 5: attention heatmap")
    tokens = ["Kıyı", "da", "ki", "banka", "dik"]
    matrix = np.array([
        [0.55, 0.10, 0.05, 0.20, 0.10],
        [0.30, 0.40, 0.15, 0.10, 0.05],
        [0.20, 0.25, 0.35, 0.15, 0.05],
        [0.35, 0.05, 0.05, 0.25, 0.30],   # banka -- highlight
        [0.10, 0.05, 0.05, 0.45, 0.35],
    ])
    highlight_idx = 3

    fig, ax = plt.subplots(figsize=FIGSIZE, dpi=DPI)
    im = ax.imshow(matrix, cmap="Blues", vmin=0, vmax=0.6, aspect="auto")

    # tick labels
    ax.set_xticks(range(len(tokens)))
    ax.set_yticks(range(len(tokens)))
    ax.set_xticklabels(tokens, fontsize=11)
    ax.set_yticklabels(tokens, fontsize=11)

    # bold + orange for highlighted row label
    for i, lbl in enumerate(ax.get_yticklabels()):
        if i == highlight_idx:
            lbl.set_fontweight("bold")
            lbl.set_color(PALETTE["accent"])
            lbl.set_fontsize(12)

    # x labels on top too
    ax.tick_params(top=True, labeltop=True, bottom=False, labelbottom=False)

    # annotate every cell
    for i in range(matrix.shape[0]):
        for j in range(matrix.shape[1]):
            v = matrix[i, j]
            color = "white" if v > 0.3 else PALETTE["ink"]
            ax.text(j, i, f"{v:.2f}", ha="center", va="center",
                    fontsize=10, color=color, fontweight="bold" if i == highlight_idx else "normal")

    # orange rectangle around highlight row
    rect = Rectangle((-0.5, highlight_idx - 0.5), len(tokens), 1,
                     fill=False, edgecolor=PALETTE["accent"], linewidth=2.2, zorder=5)
    ax.add_patch(rect)

    ax.set_title("Attention: her token diğerlerine ne kadar bakar?",
                 pad=42, loc="left")

    cbar = fig.colorbar(im, ax=ax, fraction=0.04, pad=0.04)
    cbar.set_label("Dikkat ağırlığı", fontsize=10)
    cbar.outline.set_edgecolor(PALETTE["spine"])

    # caption under figure
    fig.text(0.5, -0.04,
             "\"banka\" token'ı 'Kıyı' (0.35) ve 'dik' (0.30) token'larına ağırlık veriyor — bağlam böyle çözülüyor.",
             ha="center", va="top", fontsize=9, color=PALETTE["muted"], style="italic")

    save(fig, "05-attention-isi-haritasi.png")


# ======================================================================
# 6. Context window
# ======================================================================
def diagram_06_context_window() -> None:
    print("Diagram 6: context window")
    rows = [
        ("Phi-4", 16_000, "16K", False),
        ("Mistral Large 3", 256_000, "256K", False),
        ("GPT-5.5 Codex", 400_000, "400K", False),
        ("Claude Opus 4.7", 1_000_000, "1M", False),
        ("GPT-5.5 (API)", 1_000_000, "1M", False),
        ("Grok 4.3", 1_000_000, "1M", False),
        ("DeepSeek V4", 1_000_000, "1M", False),
        ("Gemini 3.1 Pro", 2_000_000, "2M", False),
        ("Llama 4 Scout (iddia)", 10_000_000, "10M (iddia)", True),
    ]
    labels = [r[0] for r in rows]
    values = np.array([r[1] for r in rows])
    bar_labels = [r[2] for r in rows]
    disputed = [r[3] for r in rows]

    fig, ax = plt.subplots(figsize=FIGSIZE, dpi=DPI)
    y = np.arange(len(labels))
    colors = [PALETTE["negative"] if d else PALETTE["primary"] for d in disputed]
    bars = ax.barh(y, values, color=colors, edgecolor="white", linewidth=0)
    for bar, d in zip(bars, disputed):
        if d:
            bar.set_hatch("//")
            bar.set_edgecolor("white")

    for bar, lbl, val in zip(bars, bar_labels, values):
        ax.text(val * 1.08, bar.get_y() + bar.get_height()/2, lbl,
                va="center", ha="left", fontsize=9, color=PALETTE["ink"])

    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontsize=10)
    ax.invert_yaxis()
    ax.set_xscale("log")
    ax.set_xlim(8_000, 40_000_000)
    ax.set_xlabel("Context window (token, log ölçek)")
    ax.set_title("Modelin bir oturumda görebildiği token sayısı", pad=14, loc="left")
    ax.grid(axis="x", which="major", alpha=0.5)
    ax.set_axisbelow(True)

    from matplotlib.patches import Patch
    legend_elems = [
        Patch(facecolor=PALETTE["primary"], label="Doğrulanmış"),
        Patch(facecolor=PALETTE["negative"], hatch="//", label="Tartışmalı (iddia)", edgecolor="white"),
    ]
    ax.legend(handles=legend_elems, loc="upper right",
              bbox_to_anchor=(0.995, 0.995),
              frameon=True, fontsize=9, framealpha=0.95,
              edgecolor=PALETTE["spine"], facecolor="white",
              borderpad=0.6)

    save(fig, "06-context-window.png")


# ======================================================================
# 7. RAG flow
# ======================================================================
def diagram_07_rag_akis() -> None:
    print("Diagram 7: RAG flow")
    fig, ax = plt.subplots(figsize=(9, 5.0), dpi=DPI)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 60)
    ax.axis("off")
    ax.set_title("RAG akışı — bilgiyi modelin dışında tutmak",
                 fontsize=16, fontweight="bold", pad=10, loc="left", x=0.0)

    # lane backgrounds
    lane_top = Rectangle((1.5, 32), 97, 21, facecolor=PALETTE["bg_panel"],
                         edgecolor=PALETTE["spine"], linewidth=0.8, zorder=0)
    lane_bot = Rectangle((1.5, 3), 97, 23, facecolor=PALETTE["lane_blue_bg"],
                         edgecolor=PALETTE["spine"], linewidth=0.8, zorder=0)
    ax.add_patch(lane_top)
    ax.add_patch(lane_bot)

    # lane badges (slightly inside top edge of each lane)
    ax.text(3, 51, "Hazırlık (bir kez)", fontsize=9.5, fontweight="bold",
            color=PALETTE["muted"], va="top",
            bbox=dict(boxstyle="round,pad=0.25", fc="white",
                      ec=PALETTE["muted"], lw=0.7))
    ax.text(3, 24, "Sorgu (her seferinde)", fontsize=9.5, fontweight="bold",
            color=PALETTE["primary"], va="top",
            bbox=dict(boxstyle="round,pad=0.25", fc="white",
                      ec=PALETTE["primary"], lw=0.7))

    # ---- top lane: 4 boxes ----
    # Boxes are 19 wide, gaps of 3 between, starting after 4 unit margin
    # 4*19 + 3*3 = 76+9 = 85, leaves 15 margin (split). Use widths so total = 97-4 = 93 -> 4 boxes need width
    # Use box_w=21, gap=3 -> 4*21+3*3 = 84+9 = 93, start at x=3
    top_y = 36
    top_h = 9
    top_w = 21
    top_gap = 3
    top_x_start = 3
    top_xs = [top_x_start + i * (top_w + top_gap) for i in range(4)]
    top_labels = [
        "Belgeler\n(PDF, web, notlar)",
        "Parçala\n(chunk)",
        "Embedding modeli\nvektöre çevir",
        "Vektör DB\n(Pinecone, Qdrant,\npgvector)",
    ]
    for i, (x, lbl) in enumerate(zip(top_xs, top_labels)):
        ec = PALETTE["accent"] if i == 3 else PALETTE["primary"]
        fc = "white" if i == 3 else PALETTE["box_fill"]
        _round_box(ax, (x, top_y), top_w, top_h, fc, ec, lbl, fs=9,
                   fontweight="bold" if i == 3 else "normal",
                   text_color=PALETTE["ink"], lw=1.4 if i == 3 else 1.2)
    for i in range(3):
        x_start = top_xs[i] + top_w
        x_end = top_xs[i+1]
        _arrow(ax, x_start, top_y + top_h/2, x_end, top_y + top_h/2,
               color=PALETTE["ink"], lw=1.3)

    # ---- bottom lane: 5 boxes ----
    # 5 boxes, narrower. box_w=16, gap=3, total = 5*16 + 4*3 = 80+12 = 92, start x=3.5
    bot_y = 8
    bot_h = 9
    bot_w = 16.6
    bot_gap = 2.5
    bot_x_start = 3.5
    bot_xs = [bot_x_start + i * (bot_w + bot_gap) for i in range(5)]
    bot_labels = [
        "Kullanıcı\nsorusu",
        "Sorunun\nembedding'i",
        "Vektör DB'den\nen yakın\n5-10 parça",
        "Prompt'a yapıştır\n+ LLM'e ver",
        "Cevap\n(kaynaklı)",
    ]
    edges_bot = [PALETTE["primary"]]*4 + [PALETTE["positive"]]
    for i, (x, lbl, ec) in enumerate(zip(bot_xs, bot_labels, edges_bot)):
        fc = "white" if i == 4 else PALETTE["box_fill"]
        lw = 1.5 if i == 4 else 1.2
        fw = "bold" if i == 4 else "normal"
        _round_box(ax, (x, bot_y), bot_w, bot_h, fc, ec, lbl, fs=8.5,
                   fontweight=fw, lw=lw)
    for i in range(4):
        x_start = bot_xs[i] + bot_w
        x_end = bot_xs[i+1]
        _arrow(ax, x_start, bot_y + bot_h/2, x_end, bot_y + bot_h/2,
               color=PALETTE["ink"], lw=1.3)

    # cross-lane dashed: from VektörDB (top, idx 3) down to Retrieve (bot, idx 2)
    src_x = top_xs[3] + top_w/2
    src_y = top_y                          # bottom edge of top box
    dst_x = bot_xs[2] + bot_w/2
    dst_y = bot_y + bot_h                  # top edge of bot box
    arr = FancyArrowPatch((src_x, src_y), (dst_x, dst_y),
                          arrowstyle="->", color=PALETTE["muted"],
                          linewidth=1.3, linestyle="--",
                          mutation_scale=12, shrinkA=4, shrinkB=4,
                          connectionstyle="arc3,rad=0.0")
    ax.add_patch(arr)
    ax.text((src_x + dst_x)/2 + 1.5, (src_y + dst_y)/2 + 1.5, "arama",
            fontsize=8.5, color=PALETTE["muted"], style="italic",
            bbox=dict(boxstyle="round,pad=0.15", fc="white",
                      ec="none", alpha=0.85))

    save(fig, "07-rag-akis.png")


# ======================================================================
# 8. Decision tree
# ======================================================================
def diagram_08_karar_agaci() -> None:
    print("Diagram 8: karar agaci")
    fig, ax = plt.subplots(figsize=(10, 5.6), dpi=DPI)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 60)
    ax.axis("off")
    ax.set_title("Hangi LLM'i seçeyim? — pratik karar ağacı",
                 fontsize=16, fontweight="bold", pad=10, loc="left", x=0.0)

    ink = PALETTE["ink"]
    blue = PALETTE["primary"]
    green = PALETTE["positive"]
    orange = PALETTE["accent"]
    muted = PALETTE["muted"]

    # Root
    root_w, root_h = 26, 5
    root_xy = (37, 51)
    _round_box(ax, root_xy, root_w, root_h, "white", ink,
               "Ne yapacaksın?", fs=11, fontweight="bold", lw=1.6)
    root_bot = (root_xy[0] + root_w/2, root_xy[1])

    # 3 main branches — column centers spread across 100 units
    # Columns: left=14, middle=50, right=86 (centers)
    col_centers = [14, 50, 86]
    branch_y = 41
    branch_h = 5.5
    branch_w = 24
    branch_labels = ["Bedava,\nhızlı sohbet",
                     "En iyi kalite\n(ödemeye razıyım)",
                     "Yerelde, gizli,\nücretsiz çalışsın"]
    branch_x_lefts = [c - branch_w/2 for c in col_centers]
    for cx, x, lbl in zip(col_centers, branch_x_lefts, branch_labels):
        _round_box(ax, (x, branch_y), branch_w, branch_h, PALETTE["box_fill"],
                   blue, lbl, fs=10, fontweight="bold", lw=1.3)
        ax.plot([root_bot[0], cx],
                [root_bot[1], branch_y + branch_h],
                color=muted, linewidth=1, zorder=1)

    # ----- Left branch: 1 leaf -----
    left_leaf_w = 24
    left_leaf_x = col_centers[0] - left_leaf_w/2
    left_leaf_y = 28
    _round_box(ax, (left_leaf_x, left_leaf_y), left_leaf_w, 5.5, "white", green,
               "ChatGPT free /\nClaude.ai free / Gemini", fs=9.5, lw=1.4)
    ax.plot([col_centers[0], col_centers[0]],
            [branch_y, left_leaf_y + 5.5],
            color=muted, linewidth=1, zorder=1)

    # ----- Middle branch: sub-question -> 3 leaves stacked vertically -----
    mid_sub_w = 22
    mid_sub_xy = (col_centers[1] - mid_sub_w/2, 32)
    _round_box(ax, mid_sub_xy, mid_sub_w, 4, "white", ink,
               "Hangi işte?", fs=10, fontweight="bold", lw=1.2)
    ax.plot([col_centers[1], col_centers[1]],
            [branch_y, mid_sub_xy[1] + 4],
            color=muted, linewidth=1, zorder=1)

    sub_bot_mid = (col_centers[1], mid_sub_xy[1])
    # 3 leaves vertically — each row has condition label on left, leaf box on right
    mid_leaf_data = [
        ("Kod / uzun yazı", "Claude Opus 4.7"),
        ("Genel / akıl yürütme", "GPT-5.5 Thinking"),
        ("Multimodal\n(resim + video)", "Gemini 3 Pro"),
    ]
    mid_leaf_w = 22
    mid_leaf_h = 4.5
    leaf_ys = [22, 14.5, 7]
    for (cond, ans), ly in zip(mid_leaf_data, leaf_ys):
        # connector from sub-question to this leaf
        ax.plot([sub_bot_mid[0], col_centers[1]],
                [sub_bot_mid[1], ly + mid_leaf_h],
                color=muted, linewidth=1, zorder=1)
        # condition label inline above the leaf
        ax.text(col_centers[1], ly + mid_leaf_h + 1.0, cond,
                ha="center", va="bottom", fontsize=8,
                color=muted, style="italic")
        _round_box(ax, (col_centers[1] - mid_leaf_w/2, ly),
                   mid_leaf_w, mid_leaf_h, "white", green,
                   ans, fs=9.5, fontweight="bold", lw=1.4)

    # ----- Right branch: sub-question -> 2 leaves stacked -----
    right_sub_w = 22
    right_sub_xy = (col_centers[2] - right_sub_w/2, 32)
    _round_box(ax, right_sub_xy, right_sub_w, 4, "white", ink,
               "Donanım?", fs=10, fontweight="bold", lw=1.2)
    ax.plot([col_centers[2], col_centers[2]],
            [branch_y, right_sub_xy[1] + 4],
            color=muted, linewidth=1, zorder=1)

    right_sub_bot = (col_centers[2], right_sub_xy[1])
    right_leaf_data = [
        ("16 GB RAM dizüstü", "Qwen 3.6 7B (Ollama)"),
        ("24+ GB VRAM GPU", "Llama 4 Scout / Mistral 7B"),
    ]
    right_leaf_w = 26
    right_leaf_h = 4.5
    right_leaf_ys = [22, 14.5]
    for (cond, ans), ly in zip(right_leaf_data, right_leaf_ys):
        ax.plot([right_sub_bot[0], col_centers[2]],
                [right_sub_bot[1], ly + right_leaf_h],
                color=muted, linewidth=1, zorder=1)
        ax.text(col_centers[2], ly + right_leaf_h + 1.0, cond,
                ha="center", va="bottom", fontsize=8,
                color=muted, style="italic")
        _round_box(ax, (col_centers[2] - right_leaf_w/2, ly),
                   right_leaf_w, right_leaf_h, "white", green,
                   ans, fs=9.5, fontweight="bold", lw=1.4)

    # ----- Turkish-focused side note (centered bottom strip) -----
    note_w = 94
    note_h = 5
    note_xy = (3, 0.5)
    _round_box(ax, note_xy, note_w, note_h, "white", orange,
               "Türkçe ağırlıklı iş   "
               "→ Kapalı: Gemini 3 Pro / GPT-5.5    "
               "→ Açık: Qwen 3.6 / Trendyol-LLM",
               fs=9.5, lw=1.4, fontweight="bold")

    save(fig, "08-model-secim-karar-agaci.png")


# ----------------------------------------------------------------------
# Entrypoint
# ----------------------------------------------------------------------
def main() -> None:
    print(f"Output dir: {OUT_DIR}")
    diagram_01_token_tr_vs_en()
    diagram_02_parametre_olcegi()
    diagram_03_dense_vs_moe()
    diagram_04_embedding_2d()
    diagram_05_attention_heatmap()
    diagram_06_context_window()
    diagram_07_rag_akis()
    diagram_08_karar_agaci()
    print("Done.")


if __name__ == "__main__":
    main()
