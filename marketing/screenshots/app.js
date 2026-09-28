// shots.js の中身から 1 枚ぶんの画面を組み立てる。
// ポップオーバーの構造は ContentView / AppRowView をそのまま写している。
// アプリ側のレイアウトを変えたら、ここも合わせること。

(() => {
  const params = new URLSearchParams(location.search);
  const lang = params.get("lang") === "en" ? "en" : "ja";
  const shot = window.SHOTS.find((s) => s.id === params.get("shot")) || window.SHOTS[0];
  const copy = shot.copy[lang];
  const version = (window.META && window.META.version) || "1.0";

  document.documentElement.lang = lang;

  // ─── 小さな道具 ───────────────────────────────────────────

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value == null || value === false) continue;
      if (key === "style") {
        for (const [prop, v] of Object.entries(value)) {
          if (prop.startsWith("--")) el.style.setProperty(prop, v);
          else el.style[prop] = v;
        }
      }
      else if (key === "text") el.textContent = value;
      else el.setAttribute(key, value);
    }
    for (const child of children.flat(Infinity)) {
      if (child == null || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(child));
    }
    return el;
  }

  /** SF Symbol を文字の大きさ（pt）で置く。色は currentColor。 */
  function sym(name, size, style) {
    const info = window.SYMBOLS[name];
    if (!info) throw new Error(`SF Symbol が書き出されていません: ${name}`);
    return h("span", {
      class: "sym",
      style: {
        width: `${info.w * size}px`,
        height: `${info.h * size}px`,
        webkitMaskImage: `url(${info.src})`,
        maskImage: `url(${info.src})`,
        ...style,
      },
    });
  }

  const icon = (key) => h("img", { src: `build/assets/icons/${key}.png`, alt: "" });
  const divider = (cls) => h("div", { class: `divider ${cls || ""}` });
  const pct = (v) => `${Math.round(v * 100)}%`;

  // ─── ポップオーバー ───────────────────────────────────────

  function slider(value, { disabled = false } = {}) {
    // つまみはトラックの内側を動く。塗りはつまみの中心まで。
    const knobLeft = `calc((100% - 18px) * ${value})`;
    return h("div", { class: `slider ${disabled ? "disabled" : ""}` },
      h("div", { class: "track" }),
      h("div", { class: "fill", style: { width: `calc(${knobLeft} + 9px)` } }),
      h("div", { class: "knob", style: { left: knobLeft } }),
    );
  }

  function checkbox(on) {
    return h("span", { class: `checkbox ${on ? "on" : ""}` }, on ? sym("checkmark", 8.5) : null);
  }

  function meter(level) {
    const color = level < 0.7 ? "var(--green)" : level < 0.9 ? "var(--yellow)" : "var(--red)";
    return h("div", { class: "meter" },
      h("div", { class: "level", style: { width: `${Math.min(1, Math.max(0, level)) * 100}%`, background: color } }),
    );
  }

  function menu(items, checked) {
    // AppRowView.outputMenu と同じ並び: 既定の出力 / 区切り / デバイス名順
    return h("div", { class: "menu" },
      h("div", { class: "mi" }, h("span", { class: "tick" }), "既定の出力"),
      h("div", { class: "sep" }),
      items.map((name) =>
        h("div", { class: `mi ${name === checked ? "hl" : ""}` },
          h("span", { class: "tick" }, name === checked ? sym("checkmark", 11) : null),
          name,
        ),
      ),
    );
  }

  function row(r) {
    const showsControls = r.hover || r.muted || r.output || r.volume < 0.999;
    const idle = r.idle === true;

    const output = showsControls
      ? h("span", { class: `hstack output ${r.output ? "routed" : ""}` },
          sym(r.output ? "hifispeaker.fill" : "hifispeaker", 10),
          r.output ? h("span", { text: r.output }) : null,
        )
      : null;

    if (r.menu && output) {
      // 出力先ボタンの真下に開く。画面の端にかかる分は layoutSide で押し戻す。
      output.style.position = "relative";
      output.append(menu(r.menu, r.output));
    }

    const titleline = h("div", { class: "hstack titleline" },
      h("span", { class: "name", text: r.name }),
      r.ducked ? h("span", { class: "badge" }, sym("arrow.down.right.circle.fill", 9.5)) : null,
      h("span", { class: "spacer", style: { minWidth: "6px" } }),
      output,
      h("span", { class: `pct vol ${r.muted ? "muted" : ""}`, text: r.muted ? "ミュート" : pct(r.volume) }),
    );

    const controlline = h("div", { class: "hstack controlline" },
      h("span", { class: `mute ${r.muted ? "on" : ""} ${showsControls ? "" : "hidden"}` },
        sym(r.muted ? "speaker.slash.fill" : "speaker.wave.2.fill", 12),
      ),
      h("div", { class: "stack" },
        slider(r.volume, { disabled: r.muted }),
        meter(idle ? 0 : r.level),
      ),
    );

    return h("div", { class: `row ${idle ? "idle" : ""}` },
      h("div", { class: "hstack body" },
        h("div", { class: "icon" }, icon(r.icon)),
        h("div", { class: "col" }, titleline, controlline),
      ),
      divider("rowdivider"),
    );
  }

  function popover(p, z) {
    const header = h("div", { class: "hstack header" },
      h("span", { style: { color: "var(--accent)", display: "flex" } }, sym("slider.vertical.3", 13)),
      h("span", { class: "title", text: "AppMixer" }),
      h("span", { class: "spacer" }),
      h("span", { class: "hstack device" },
        sym("hifispeaker", 12),
        h("span", { class: "name", text: p.device }),
        sym("chevron.down", 8),
      ),
    );

    const master = h("div", { class: "hstack master" },
      h("span", { class: "speaker" }, sym("speaker.wave.3.fill", 12.5)),
      h("span", { class: "label", text: "すべて" }),
      slider(p.master),
      h("span", { class: "pct", style: { width: "38px" }, text: pct(p.master) }),
    );

    const search = h("div", { class: "hstack search" },
      h("span", { style: { color: "var(--secondary)", display: "flex" } }, sym("magnifyingglass", 10)),
      h("span", { class: "placeholder", text: "アプリを検索" }),
      h("span", { class: "hstack check" }, checkbox(false), "全アプリ"),
    );

    const list = h("div", { class: "list" }, p.rows.map(row));

    const banner = p.banner
      ? h("div", { class: "hstack banner" },
          sym("waveform.badge.mic", 10.5),
          h("span", { text: `${p.banner} のため音量を下げています` }),
        )
      : null;

    const s = p.settings;
    const settings = s
      ? h("div", { class: "settings" },
          h("div", { class: "group" },
            h("span", { class: "hstack check big" }, checkbox(s.ducking), "通話中は自動で音量を下げる"),
            h("div", { class: "hstack level" },
              h("span", { text: "下げる音量" }),
              slider(s.level),
              h("span", { class: "pct", text: pct(s.level) }),
            ),
            h("span", { class: "hstack check small" }, checkbox(s.mic), "マイクの使用も引き金にする"),
          ),
          h("div", { class: "group" },
            h("span", { class: "hstack check big" }, checkbox(s.login), "ログイン時に起動"),
          ),
        )
      : null;

    const footer = h("div", { class: "hstack footer" },
      h("span", { class: "hstack settings-button" },
        sym(s ? "chevron.down" : "gearshape", s ? 8 : 10.5),
        "設定",
      ),
      h("span", { class: "spacer" }),
      h("span", { class: "pct", text: `v${version}` }),
      h("span", { class: "spacer" }),
      h("span", { text: "終了" }),
    );

    return h("div", { class: "popover", style: { "--z": z } },
      header, master, search, divider(), list, banner,
      settings ? [divider(), settings] : null,
      divider(), footer,
    );
  }

  // ─── メニューバー ────────────────────────────────────────

  function menubar(z) {
    const clock = lang === "ja" ? "9月29日(月)  9:41" : "Mon Sep 29  9:41 AM";
    const appmixer = h("span", { class: "item selected" }, sym("slider.vertical.3", 14));
    const bar = h("div", { class: "menubar", style: { "--z": z } },
      appmixer,
      h("span", { class: "item" }, sym("battery.75percent", 13)),
      h("span", { class: "item" }, sym("wifi", 13)),
      h("span", { class: "item" }, sym("switch.2", 13)),
      h("span", { class: "item", text: clock }),
    );
    return { bar, appmixer };
  }

  // ─── 文字組み ────────────────────────────────────────────

  function points(list) {
    return h("div", { class: "points" },
      list.map((p) =>
        h("div", { class: "point" },
          p.icon ? icon(p.icon) : h("span", { class: "dot" }, sym(p.symbol, 19)),
          h("span", { text: p.text }),
          p.chip ? h("span", { class: `chip ${p.gray ? "gray" : ""}`, text: p.chip }) : null,
        ),
      ),
    );
  }

  function copyBlock(c) {
    return h("div", { class: "copy" },
      c.eyebrow ? h("div", { class: "eyebrow", text: c.eyebrow }) : null,
      h("div", { class: "headline", text: c.headline }),
      c.sub ? h("div", { class: "sub", text: c.sub }) : null,
      c.points ? points(c.points) : null,
    );
  }

  /** 見出しが幅に収まるまで文字を小さくする。改行は文言どおりのまま。 */
  function fit(el, maxWidth) {
    // 箱の幅ではなく文字そのものの幅で比べる。scrollWidth は整数に丸められ、
    // 箱の幅（小数）と比べると常に「はみ出し」になってしまう。
    el.style.width = "max-content";
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.getBoundingClientRect().width > maxWidth && size > 30) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
    el.style.width = "";
  }

  // ─── レイアウト ──────────────────────────────────────────

  const canvas = document.getElementById("canvas");

  function layoutSide() {
    const z = shot.z;
    canvas.append(h("div", { class: "wallpaper" }));

    const { bar, appmixer } = menubar(z);
    canvas.append(bar);

    const pop = popover(shot.popover, z);
    pop.style.position = "absolute";
    canvas.append(pop);

    const text = copyBlock(copy);
    canvas.append(text);

    // メニューバーのアイコンの真下に開く（画面の右端に収まるよう押し戻す）。
    const item = appmixer.getBoundingClientRect();
    const width = pop.getBoundingClientRect().width;
    const margin = 56;
    const left = Math.min(item.left - 8 * z, 1440 - margin - width);
    pop.style.left = `${left / z}px`;
    pop.style.top = `${(24 + 5) }px`;

    // 文字は左の余白の縦中央に。
    const th = text.getBoundingClientRect().height;
    text.style.top = `${Math.round((900 - th) / 2 + 12)}px`;
    const textWidth = Math.max(400, left - 80 - 48);
    text.style.width = `${textWidth}px`;
    fit(text.querySelector(".headline"), textWidth);
    // 幅を変えると高さも変わるので測り直す。
    const th2 = text.getBoundingClientRect().height;
    text.style.top = `${Math.round((900 - th2) / 2 + 12)}px`;

    // メニューは画面からはみ出さないよう、macOS と同じく内側へ押し戻す。
    for (const m of pop.querySelectorAll(".menu")) {
      const over = m.getBoundingClientRect().right - (1440 - 24);
      if (over > 0) m.style.left = `${-6 - over / z}px`;
    }
  }

  function layoutCompare() {
    const z = shot.z;
    canvas.append(h("div", { class: "wallpaper center" }));

    const head = h("div", { class: "center-copy" },
      h("div", { class: "eyebrow", text: copy.eyebrow }),
      h("div", { class: "headline", text: copy.headline }),
      h("div", { class: "sub", text: copy.sub }),
    );
    canvas.append(head);

    const sides = shot.sides.map((side) =>
      h("div", { class: "side" },
        h("div", { class: "caption" }, sym(side.symbol, 20), h("span", { text: side.caption })),
        popover(side.popover, z),
      ),
    );
    const swap = h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", alignSelf: "center", marginTop: "48px" } },
      h("div", { class: "swap" }, sym("arrow.left.arrow.right", 24)),
      h("div", {
        style: { whiteSpace: "pre-line", textAlign: "center", fontSize: "16px", fontWeight: 700, color: "rgba(160,205,255,0.9)", lineHeight: 1.4 },
        text: copy.swap,
      }),
    );
    const row = h("div", { class: "compare" }, sides[0], swap, sides[1]);
    canvas.append(row);

    const hh = head.getBoundingClientRect().height;
    const rh = row.getBoundingClientRect().height;
    const gap = 44;
    const top = Math.round((900 - (hh + gap + rh)) / 2);
    head.style.top = `${top}px`;
    row.style.top = `${top + hh + gap}px`;
  }

  function layoutGrid() {
    canvas.append(h("div", { class: "wallpaper center" }));

    const head = h("div", { class: "center-copy" },
      h("div", { class: "brand" }, icon("appmixer"), h("span", { class: "name", text: "AppMixer" })),
      h("div", { class: "headline", style: { fontSize: lang === "ja" ? "54px" : "58px" }, text: copy.headline }),
    );
    canvas.append(head);

    const grid = h("div", { class: "grid" },
      copy.features.map((f) =>
        h("div", { class: "card" },
          h("span", { class: "dot" }, sym(f.symbol, 28)),
          h("span", { style: { whiteSpace: "pre-line" }, text: f.text }),
        ),
      ),
    );
    canvas.append(grid);

    const trust = h("div", { class: "trust" },
      copy.trust.map((t) => h("div", { class: "pill" }, sym(t.symbol, 21), h("span", { text: t.text }))),
    );
    canvas.append(trust);

    const req = h("div", {
      style: { position: "absolute", left: 0, right: 0, textAlign: "center", fontSize: "19px", fontWeight: 600, color: "rgba(225,232,245,0.55)" },
      text: copy.requirement,
    });
    canvas.append(req);

    const heights = [head, grid, trust, req].map((el) => el.getBoundingClientRect().height);
    const gaps = [46, 40, 22];
    const total = heights.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
    let y = Math.round((900 - total) / 2);
    [head, grid, trust, req].forEach((el, i) => {
      el.style.top = `${y}px`;
      y += heights[i] + (gaps[i] || 0);
    });
  }

  // 画像とフォントの読み込みは、render.sh が Chrome に渡す --virtual-time-budget で待つ。
  ({ side: layoutSide, compare: layoutCompare, grid: layoutGrid })[shot.layout]();
})();
