import Foundation

// 画面の文言の翻訳。
//
// キーは日本語の原文そのもの。訳は bundle/<言語>.lproj/Localizable.strings に置き、
// Makefile が .app の Resources へ入れる。
//
// SwiftUI の Text("…") / Button("…") / .help("…") などに文字列リテラルを
// 直接渡した場合は、SwiftUI が自動で訳を引く。String を返す箇所（モデルの
// メッセージ、.help(String) など）はそれが効かないため、ここを通す。

/// 原文（日本語）をキーに、いまの言語の文言を返す。
/// 書式を埋めない。% を含む原文でもキーはそのまま一致する。
func localized(_ key: String) -> String {
    Bundle.main.localizedString(forKey: key, value: nil, table: nil)
}
