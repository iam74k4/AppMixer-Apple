// shots.js の中身から 1 枚ぶんの画面を組み立てる。
// ポップオーバーの構造は ContentView / AppRowView をそのまま写している。
// アプリ側のレイアウトや文言を変えたら、ここも合わせること。

(() => {
  const params = new URLSearchParams(location.search);
  const lang = params.get("lang") === "en" ? "en" : "ja";
  const shot = window.SHOTS.find((s) => s.id === params.get("shot")) || window.SHOTS[0];
  const copy = shot.copy[lang];
  const version = (window.META && window.META.version) || "1.0";

  document.documentElement.lang = lang;

  /** { ja, en } の値をいまの言語で取り出す。それ以外はそのまま。 */
  const t = (v) => (v && typeof v === "object" && ("ja" in v || "en" in v) ? v[lang] : v);

  // AppMixer 自身の文言。bundle/<言語>.lproj/Localizable.strings と同じにする。
  const UI = {
    ja: {
      all: "すべて",
      search: "アプリを検索",
      showAll: "全アプリ",
      muted: "ミュート",
      defaultOutput: "既定の出力",
      settings: "設定",
      quit: "終了",
      ducking: (name) => `${name} のため音量を下げています`,
      duckToggle: "通話中は自動で音量を下げる",
      duckLevel: "下げる音量",
      duckMic: "マイクの使用も引き金にする",
      login: "ログイン時に起動",
    },
    en: {
      all: "All",
      search: "Search apps",
      showAll: "Show all",
      muted: "Muted",
      defaultOutput: "Default Output",
      settings: "Settings",
      quit: "Quit",
      ducking: (name) => `${name} — other apps lowered`,
      duckToggle: "Lower other apps during calls",
      duckLevel: "Lower to",
      duckMic: "Also when the mic is in use",
      login: "Launch at login",
    },
  }[lang];

  // 背景のウインドウの中身（架空の動画・曲・通話相手）。
  const SCENE = {
    ja: {
      video: "夕焼けの湖を空から — 4K 空撮",
      channel: "Skyline Films",
      views: "12万 回視聴 ・ 3 日前",
      song: "Night Drive",
      artist: "Lumen Coast",
      people: [
        { name: "佐藤 美咲", mono: "佐", hue: 18 },
        { name: "Ken", mono: "K", hue: 205 },
        { name: "高橋 蓮", mono: "高", hue: 150 },
        { name: "あなた", mono: "", hue: 265 },
      ],
    },
    en: {
      video: "Sunset over the lake — 4K aerial",
      channel: "Skyline Films",
      views: "120K views · 3 days ago",
      song: "Night Drive",
      artist: "Lumen Coast",
      people: [
        { name: "Sarah", mono: "S", hue: 18 },
        { name: "Ken", mono: "K", hue: 205 },
        { name: "Mika", mono: "M", hue: 150 },
        { name: "You", mono: "", hue: 265 },
      ],
    },
  }[lang];

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
      } else if (key === "text") el.textContent = value;
      else if (key === "html") el.innerHTML = value;
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

  /** 倍率 z で描く要素を、キャンバス上の (x, y) に置く。 */
  function place(el, x, y, z) {
    el.style.position = "absolute";
    el.style.setProperty("--z", z);
    el.style.left = `${x / z}px`;
    el.style.top = `${y / z}px`;
    return el;
  }

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
      h("div", { class: "mi" }, h("span", { class: "tick" }), UI.defaultOutput),
      h("div", { class: "sep" }),
      items.map((item) => {
        const name = t(item);
        const on = name === t(checked);
        return h("div", { class: `mi ${on ? "hl" : ""}` },
          h("span", { class: "tick" }, on ? sym("checkmark", 11) : null),
          name,
        );
      }),
    );
  }

  function row(r) {
    const showsControls = r.hover || r.muted || r.output || r.volume < 0.999;

    const output = showsControls
      ? h("span", { class: `hstack output ${r.output ? "routed" : ""}` },
          sym(r.output ? "hifispeaker.fill" : "hifispeaker", 10),
          r.output ? h("span", { text: t(r.output) }) : null,
        )
      : null;

    if (r.menu && output) {
      // 出力先ボタンの真下に開く。画面の端にかかる分は layoutSide で押し戻す。
      output.style.position = "relative";
      output.append(menu(r.menu, r.output));
    }

    const titleline = h("div", { class: "hstack titleline" },
      h("span", { class: "name", text: t(r.name) }),
      r.ducked ? h("span", { class: "badge" }, sym("arrow.down.right.circle.fill", 9.5)) : null,
      h("span", { class: "spacer", style: { minWidth: "6px" } }),
      output,
      h("span", { class: `pct vol ${r.muted ? "muted" : ""}`, text: r.muted ? UI.muted : pct(r.volume) }),
    );

    const controlline = h("div", { class: "hstack controlline" },
      h("span", { class: `mute ${r.muted ? "on" : ""} ${showsControls ? "" : "hidden"}` },
        sym(r.muted ? "speaker.slash.fill" : "speaker.wave.2.fill", 12),
      ),
      h("div", { class: "stack" },
        slider(r.volume, { disabled: r.muted }),
        meter(r.level),
      ),
    );

    return h("div", { class: "row" },
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
        h("span", { class: "name", text: t(p.device) }),
        sym("chevron.down", 8),
      ),
    );

    const master = h("div", { class: "hstack master" },
      h("span", { class: "speaker" }, sym("speaker.wave.3.fill", 12.5)),
      h("span", { class: "label", text: UI.all }),
      slider(p.master),
      h("span", { class: "pct", style: { width: "38px" }, text: pct(p.master) }),
    );

    const search = h("div", { class: "hstack search" },
      h("span", { style: { color: "var(--secondary)", display: "flex" } }, sym("magnifyingglass", 10)),
      h("span", { class: "placeholder", text: UI.search }),
      h("span", { class: "hstack check" }, checkbox(false), UI.showAll),
    );

    const list = h("div", { class: "list" }, p.rows.map(row));

    const banner = p.banner
      ? h("div", { class: "hstack banner" },
          sym("waveform.badge.mic", 10.5),
          h("span", { text: UI.ducking(t(p.banner)) }),
        )
      : null;

    const s = p.settings;
    const settings = s
      ? h("div", { class: "settings" },
          h("div", { class: "group" },
            h("span", { class: "hstack check big" }, checkbox(s.ducking), UI.duckToggle),
            h("div", { class: "hstack level" },
              h("span", { text: UI.duckLevel }),
              slider(s.level),
              h("span", { class: "pct", text: pct(s.level) }),
            ),
            h("span", { class: "hstack check small" }, checkbox(s.mic), UI.duckMic),
          ),
          h("div", { class: "group" },
            h("span", { class: "hstack check big" }, checkbox(s.login), UI.login),
          ),
        )
      : null;

    const footer = h("div", { class: "hstack footer" },
      h("span", { class: "hstack settings-button" },
        sym(s ? "chevron.down" : "gearshape", s ? 8 : 10.5),
        UI.settings,
      ),
      h("span", { class: "spacer" }),
      h("span", { class: "pct", text: `v${version}` }),
      h("span", { class: "spacer" }),
      h("span", { text: UI.quit }),
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

  // ─── 背景（壁紙と、音を出しているアプリのウインドウ） ─────

  function wallpaper(dim) {
    // 光の帯が流れる抽象的な壁紙。macOS の壁紙は使わない（Apple の著作物のため）。
    return h("div", { class: "wallpaper" },
      h("div", { class: "blob b1" }),
      h("div", { class: "blob b2" }),
      h("div", { class: "blob b3" }),
      h("div", { class: "blob b4" }),
      h("div", { class: "blob b5" }),
      h("div", {
        class: "ribbons",
        html: `<svg viewBox="0 0 1440 900" preserveAspectRatio="none" width="1440" height="900">
          <defs>
            <linearGradient id="rb1" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#bcd4ff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
            <linearGradient id="rb2" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".6" stop-color="#ffc2e6" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
          </defs>
          <path d="M-100 560 C 300 420, 700 760, 1100 430 S 1500 260, 1600 300" fill="none" stroke="url(#rb1)" stroke-width="3"/>
          <path d="M-100 620 C 320 470, 720 820, 1120 480 S 1500 320, 1600 360" fill="none" stroke="url(#rb2)" stroke-width="2"/>
          <path d="M-100 690 C 360 540, 760 880, 1160 540 S 1500 400, 1600 430" fill="none" stroke="url(#rb1)" stroke-width="1.5"/>
        </svg>`,
      }),
      dim ? h("div", { class: "dim", style: { background: `rgba(5, 7, 18, ${dim})` } }) : null,
    );
  }

  const lights = () => h("span", { class: "lights" }, h("i"), h("i"), h("i"));

  /** 動画を流しているブラウザ（ミキサーの「Google Chrome」）。 */
  function browserWindow(s, z) {
    const video = h("div", { class: "video" },
      h("div", { class: "landscape", html: LANDSCAPE }),
      h("div", { class: "controls" },
        h("div", { class: "progress" }, h("div", { class: "played" }), h("div", { class: "scrub" })),
        h("div", { class: "hstack buttons" },
          sym("pause.fill", 15),
          sym("forward.fill", 13),
          sym("speaker.wave.2.fill", 14),
          h("span", { class: "time", text: "8:24 / 21:37" }),
          h("span", { class: "spacer" }),
          sym("arrow.up.left.and.arrow.down.right", 13),
        ),
      ),
    );
    const win = h("div", { class: "win browser", style: { width: `${s.w}px` } },
      h("div", { class: "hstack tabbar" },
        lights(),
        h("div", { class: "hstack tab" },
          h("span", { class: "favicon" }, sym("play.fill", 7)),
          h("span", { class: "tabtitle", text: SCENE.video }),
        ),
        sym("plus", 11, { color: "rgba(255,255,255,0.5)" }),
      ),
      h("div", { class: "hstack toolbar" },
        sym("chevron.left", 12), sym("chevron.right", 12, { opacity: 0.4 }), sym("arrow.clockwise", 12),
        h("div", { class: "hstack omnibox" }, sym("lock.fill", 9), h("span", { text: SCENE.video })),
      ),
      video,
      h("div", { class: "info" },
        h("div", { class: "vtitle", text: SCENE.video }),
        h("div", { class: "hstack channel" },
          h("span", { class: "avatar" }),
          h("span", { class: "cname", text: SCENE.channel }),
          h("span", { class: "views", text: SCENE.views }),
        ),
      ),
    );
    return place(win, s.x, s.y, z);
  }

  /** 曲を流しているミュージックのミニプレーヤー。 */
  function musicPlayer(s, z) {
    const win = h("div", { class: "win mini" },
      h("div", { class: "art" }),
      h("div", { class: "meta" },
        h("div", { class: "song", text: SCENE.song }),
        h("div", { class: "artist", text: SCENE.artist }),
        h("div", { class: "hstack transport" },
          sym("backward.fill", 12), sym("pause.fill", 16), sym("forward.fill", 12),
        ),
        h("div", { class: "hstack prog" },
          h("span", { text: "1:42" }),
          h("div", { class: "bar" }, h("div")),
          h("span", { text: "-2:31" }),
        ),
      ),
    );
    return place(win, s.x, s.y, z);
  }

  /** FaceTime のグループ通話。 */
  function callWindow(s, z) {
    const tiles = SCENE.people.map((p, i) =>
      h("div", {
        class: `tile ${i === 0 ? "speaking" : ""}`,
        style: {
          background: `radial-gradient(120% 90% at 30% 20%, hsl(${p.hue} 55% 42%), hsl(${p.hue + 30} 45% 18%) 70%)`,
        },
      },
        p.mono
          ? h("span", { class: "mono", style: { background: `hsl(${p.hue} 35% 62%)` }, text: p.mono })
          : h("span", { class: "self" }, sym("person.fill", 34)),
        h("span", { class: "who", text: p.name }),
      ),
    );
    const win = h("div", { class: "win call", style: { width: `${s.w}px` } },
      h("div", { class: "hstack titlebar" }, lights(), h("span", { class: "wtitle", text: "FaceTime" })),
      h("div", { class: "tiles" }, tiles),
      h("div", { class: "hstack callbar" },
        h("span", { class: "cb" }, sym("mic.fill", 14)),
        h("span", { class: "cb" }, sym("video.fill", 14)),
        h("span", { class: "cb end" }, sym("phone.down.fill", 15)),
      ),
    );
    return place(win, s.x, s.y, z);
  }

  const SCENES = { browser: browserWindow, music: musicPlayer, call: callWindow };

  // 動画の中身。架空の風景（夕焼けの湖）を SVG で描く。
  const LANDSCAPE = `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#18194a"/><stop offset=".35" stop-color="#4a2a7c"/>
        <stop offset=".58" stop-color="#c24f7d"/><stop offset=".72" stop-color="#ff8f5e"/>
        <stop offset=".8" stop-color="#ffc98a"/>
      </linearGradient>
      <radialGradient id="sun" cx=".6" cy=".7" r=".35">
        <stop offset="0" stop-color="#fff1c9" stop-opacity=".95"/><stop offset=".25" stop-color="#ffc27a" stop-opacity=".6"/>
        <stop offset="1" stop-color="#ff8f5e" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6b3a74"/><stop offset="1" stop-color="#140d2a"/>
      </linearGradient>
      <linearGradient id="glint" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffd9a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#sky)"/>
    <rect width="1600" height="900" fill="url(#sun)"/>
    <circle cx="960" cy="610" r="58" fill="#fff4d6"/>
    <path d="M0 600 L140 520 L260 570 L420 470 L560 560 L700 500 L820 590 L980 540 L1120 600 L1260 500 L1420 560 L1600 480 L1600 680 L0 680 Z" fill="#8a4a86" opacity=".75"/>
    <path d="M0 640 L180 560 L330 620 L470 540 L640 640 L780 600 L900 660 L1060 610 L1230 660 L1380 580 L1600 640 L1600 700 L0 700 Z" fill="#4b2a6a"/>
    <rect y="680" width="1600" height="220" fill="url(#lake)"/>
    <rect x="900" y="680" width="120" height="200" fill="url(#glint)" opacity=".7"/>
    <rect x="930" y="700" width="60" height="4" fill="#fff0cf" opacity=".8"/>
    <rect x="910" y="730" width="100" height="3" fill="#ffe1ad" opacity=".55"/>
    <rect x="940" y="765" width="46" height="3" fill="#ffe1ad" opacity=".45"/>
    <path d="M0 720 L60 700 L90 640 L110 700 L150 690 L175 610 L200 690 L250 700 L290 650 L320 705 L380 715 L0 760 Z" fill="#0e0a1e"/>
    <path d="M1600 730 L1540 700 L1510 630 L1490 700 L1440 690 L1415 600 L1390 690 L1330 705 L1300 660 L1270 712 L1220 720 L1600 770 Z" fill="#0e0a1e"/>
  </svg>`;

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

  /** 左に文字、右にメニューバーから開いたポップオーバー。背景は音を出しているアプリ。 */
  function layoutSide() {
    const z = shot.z;
    canvas.append(wallpaper());
    for (const s of shot.scene || []) canvas.append(SCENES[s.type](s, SCENE_Z));
    // 文字の下だけ暗くする。右側の壁紙とウインドウはそのまま見せる。
    canvas.append(h("div", { class: "scrim" }));

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
    pop.style.top = `${24 + 5}px`;

    // 文字は左の余白の縦中央に。
    const textWidth = Math.max(400, left - 80 - 48);
    text.style.width = `${textWidth}px`;
    fit(text.querySelector(".headline"), textWidth);
    const th = text.getBoundingClientRect().height;
    text.style.top = `${Math.round((900 - th) / 2 + 12)}px`;

    // メニューは画面からはみ出さないよう、macOS と同じく内側へ押し戻す。
    for (const m of pop.querySelectorAll(".menu")) {
      const over = m.getBoundingClientRect().right - (1440 - 24);
      if (over > 0) m.style.left = `${-6 - over / z}px`;
    }
  }

  function layoutCompare() {
    const z = shot.z;
    canvas.append(wallpaper(0.5));

    const head = h("div", { class: "center-copy" },
      h("div", { class: "eyebrow", text: copy.eyebrow }),
      h("div", { class: "headline", text: copy.headline }),
      h("div", { class: "sub", text: copy.sub }),
    );
    canvas.append(head);

    const sides = shot.sides.map((side) =>
      h("div", { class: "side" },
        h("div", { class: "caption" }, sym(side.symbol, 20), h("span", { text: t(side.caption) })),
        popover(side.popover, z),
      ),
    );
    const swap = h("div", { class: "swapbox" },
      h("div", { class: "swap" }, sym("arrow.left.arrow.right", 24)),
      h("div", { class: "swaplabel", text: copy.swap }),
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
    canvas.append(wallpaper(0.58));

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
      copy.trust.map((c) => h("div", { class: "pill" }, sym(c.symbol, 21), h("span", { text: c.text }))),
    );
    canvas.append(trust);

    const req = h("div", { class: "requirement", text: copy.requirement });
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
