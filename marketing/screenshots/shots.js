// スクリーンショット 1 枚ごとの中身。画面の状態（アプリの UI）と文言を置く。
//
// 画面の状態は、アプリが実際にその状況で出す表示に合わせること。
//   - 一覧の並びは「再生中 → 名前順」（AudioAppEnumerator.enumerate と同じ）
//   - 音量が 100% 未満・ミュート・出力先の振り分けがある行は、ミュートボタンと
//     出力先ボタンが常に見える（AppRowView.showsControls）
//   - メーターは音量を掛けた後のレベル（ProcessTap の displayPeak）。
//     30% の行は 100% の行より短く、ミュート中は伸びない
//   - ダッキング中も表示する音量は利用者が決めた値のまま。行に橙の印が付く
//
// UI の文言はアプリ本体が日本語のみのため、英語版でも日本語のまま見せる。

const DEVICE_SPEAKER = "MacBook Air のスピーカー";
const DEVICE_AIRPODS = "AirPods Pro";
const DEVICE_USB = "USB Audio Device";

window.SHOTS = [
  {
    id: "01-per-app-volume",
    layout: "side",
    z: 1.9,
    popover: {
      device: DEVICE_SPEAKER,
      master: 0.62,
      rows: [
        { name: "Discord", icon: "discord", volume: 1.0, muted: true, level: 0 },
        { name: "Google Chrome", icon: "chrome", volume: 0.3, level: 0.21 },
        { name: "ミュージック", icon: "music", volume: 0.8, level: 0.56 },
      ],
    },
    copy: {
      ja: {
        eyebrow: "Mac のための音量ミキサー",
        headline: "動画は小さく。\n音楽はそのまま。",
        sub: "Windows の音量ミキサーのように、アプリごとに音量を変えられます。メニューバーからすぐ。",
        points: [
          { icon: "chrome", text: "YouTube は控えめに", chip: "30%" },
          { icon: "music", text: "BGM はそのまま", chip: "80%" },
          { icon: "discord", text: "通知音だけ消す", chip: "ミュート", gray: true },
        ],
      },
      en: {
        eyebrow: "A volume mixer for your Mac",
        headline: "Turn the video down.\nKeep the music up.",
        sub: "Give every app its own volume — just like the Volume Mixer on Windows, right in your menu bar.",
        points: [
          { icon: "chrome", text: "YouTube, a little quieter", chip: "30%" },
          { icon: "music", text: "Music, right where it was", chip: "80%" },
          { icon: "discord", text: "Notification pings, gone", chip: "Muted", gray: true },
        ],
      },
    },
  },

  {
    id: "02-auto-ducking",
    layout: "side",
    z: 1.75,
    popover: {
      device: DEVICE_SPEAKER,
      master: 0.62,
      rows: [
        { name: "FaceTime", icon: "facetime", volume: 1.0, level: 0.48 },
        { name: "Google Chrome", icon: "chrome", volume: 0.3, level: 0.05, ducked: true },
        { name: "ミュージック", icon: "music", volume: 0.8, level: 0.12, ducked: true },
      ],
      banner: "FaceTime",
      settings: { ducking: true, level: 0.2, mic: true, login: true },
    },
    copy: {
      ja: {
        eyebrow: "通話中の自動ダッキング",
        headline: "通話が始まったら、\n音楽は自動で小さく。",
        sub: "FaceTime・Zoom・Teams などの通話や、マイクの使用を検知。通話が終われば元の音量に戻ります。",
        points: [
          { symbol: "phone.fill", text: "相手の声は小さくしない" },
          { symbol: "slider.horizontal.3", text: "下げる量は自分で決められる" },
          { symbol: "arrow.triangle.2.circlepath", text: "通話が終われば元どおり" },
        ],
      },
      en: {
        eyebrow: "Automatic ducking",
        headline: "A call starts.\nThe music steps back.",
        sub: "AppMixer notices FaceTime, Zoom, Teams and other calls — or your mic going live — and lowers everything else. When the call ends, it all comes back.",
        points: [
          { symbol: "phone.fill", text: "The other person stays loud" },
          { symbol: "slider.horizontal.3", text: "You choose how far it drops" },
          { symbol: "arrow.triangle.2.circlepath", text: "Restored when you hang up" },
        ],
      },
    },
  },

  {
    id: "03-per-device-memory",
    layout: "compare",
    z: 1.26,
    sides: [
      {
        symbol: "headphones",
        caption: DEVICE_AIRPODS,
        popover: {
          device: DEVICE_AIRPODS,
          master: 0.45,
          rows: [
            { name: "Google Chrome", icon: "chrome", volume: 0.2, level: 0.14 },
            { name: "ミュージック", icon: "music", volume: 0.35, level: 0.25 },
          ],
        },
      },
      {
        symbol: "hifispeaker.fill",
        caption: DEVICE_SPEAKER,
        popover: {
          device: DEVICE_SPEAKER,
          master: 0.7,
          rows: [
            { name: "Google Chrome", icon: "chrome", volume: 0.5, level: 0.35 },
            { name: "ミュージック", icon: "music", volume: 0.85, level: 0.6 },
          ],
        },
      },
    ],
    copy: {
      ja: {
        eyebrow: "出力デバイスごとに記憶",
        headline: "イヤホンでは控えめに、\nスピーカーでは大きめに。",
        sub: "同じアプリでも、デバイスごとに別の音量を覚えます。\nつなぎ替えるだけで、自動で切り替わります。",
        swap: "つなぎ替えると\n自動で切り替え",
      },
      en: {
        eyebrow: "Remembered per output device",
        headline: "Quieter in your AirPods.\nLouder on the speakers.",
        sub: "Every app keeps a separate volume for each output device.\nSwitch devices and the volumes switch with you.",
        swap: "Switches\nautomatically",
      },
    },
  },

  {
    id: "04-per-app-output",
    layout: "side",
    z: 1.8,
    // 既定の出力は AirPods（通話はそのまま AirPods）、ミュージックだけスピーカーへ振る。
    popover: {
      device: DEVICE_AIRPODS,
      master: 0.5,
      rows: [
        { name: "FaceTime", icon: "facetime", volume: 1.0, level: 0.5 },
        {
          name: "ミュージック", icon: "music", volume: 0.7, level: 0.48, output: DEVICE_SPEAKER,
          menu: [DEVICE_AIRPODS, DEVICE_SPEAKER, DEVICE_USB],
        },
      ],
    },
    copy: {
      ja: {
        eyebrow: "アプリごとの出力先",
        headline: "音楽はスピーカー、\n通話はイヤホン。",
        sub: "アプリごとに、音を出すデバイスを選べます。アプリの再起動も、システム設定を開く必要もありません。",
        points: [
          { icon: "music", text: "ミュージック", chip: "スピーカー" },
          { icon: "facetime", text: "FaceTime", chip: "AirPods Pro", gray: true },
        ],
      },
      en: {
        eyebrow: "Per-app output",
        headline: "Music on the speakers.\nCalls in your AirPods.",
        sub: "Send each app to the output device you want. No restarting apps, no trip to System Settings.",
        points: [
          { icon: "music", text: "Music", chip: "Speakers" },
          { icon: "facetime", text: "FaceTime", chip: "AirPods Pro", gray: true },
        ],
      },
    },
  },

  {
    id: "05-features",
    layout: "grid",
    copy: {
      ja: {
        headline: "Mac に足りなかった音量調整を、\nメニューバーに。",
        features: [
          { symbol: "slider.horizontal.3", text: "アプリ別の\n音量・ミュート" },
          { symbol: "waveform", text: "リアルタイムの\nレベルメーター" },
          { symbol: "phone.fill", text: "通話中の\n自動ダッキング" },
          { symbol: "headphones", text: "デバイスごとに\n音量を記憶" },
          { symbol: "hifispeaker.2.fill", text: "アプリ別の\n出力先" },
          { symbol: "menubar.rectangle", text: "メニューバー常駐\nログイン時に起動" },
        ],
        trust: [
          { symbol: "checkmark.seal.fill", text: "買い切り・サブスクなし" },
          { symbol: "lock.shield", text: "データ収集なし" },
          { symbol: "mic.slash", text: "音声の録音・送信なし" },
        ],
        requirement: "macOS 14.4 以降",
      },
      en: {
        headline: "The volume controls macOS left out,\nright in your menu bar.",
        features: [
          { symbol: "slider.horizontal.3", text: "Per-app\nvolume & mute" },
          { symbol: "waveform", text: "Live\nlevel meters" },
          { symbol: "phone.fill", text: "Auto-ducking\nduring calls" },
          { symbol: "headphones", text: "Volume remembered\nper device" },
          { symbol: "hifispeaker.2.fill", text: "Per-app\noutput device" },
          { symbol: "menubar.rectangle", text: "Lives in the menu bar\nLaunches at login" },
        ],
        trust: [
          { symbol: "checkmark.seal.fill", text: "One-time purchase" },
          { symbol: "lock.shield", text: "No data collected" },
          { symbol: "mic.slash", text: "Never records or sends audio" },
        ],
        requirement: "macOS 14.4 or later",
      },
    },
  },
];
