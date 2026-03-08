# ClipTranslate

macOS 常駐型の翻訳アプリ。グローバルショートカットでウィンドウを呼び出し、クリップボードのテキストを英語⇔日本語に即座に翻訳します。

## 機能

- グローバルショートカット（デフォルト: `Shift+Alt+T`、設定で変更可能）でウィンドウをトグル表示
- クリップボードのテキストを自動読み取り・自動翻訳
- 英語 → 日本語 / 日本語 → 英語 の自動判定
- 翻訳結果の自動クリップボードコピー（ON/OFF 切替可能）
- ソーステキスト・翻訳結果ともに編集可能
- 逆方向翻訳ボタン（日→英→日 のトグル）
- 翻訳履歴（最大100件 / 90日間保持）＋ キーワード検索＋ハイライト
- DeepL API 使用量モニタリング（設定画面内）
- ダークモード対応
- ウィンドウ外クリックで自動非表示
- メニューバー（トレイ）常駐

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Tauri v2 + Rust |
| フロントエンド | React 18 + TypeScript + Vite |
| スタイル | Tailwind CSS 3 |
| 翻訳 API | DeepL API (Free / Pro) |
| ストレージ | JSON ファイル (`~/Library/Application Support/com.cliptranslate.app/store.json`) |

## 前提条件

以下がインストールされている macOS 環境が必要です。

### 1. Xcode Command Line Tools

```bash
xcode-select --install
```

### 2. Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

### 3. Node.js + pnpm

```bash
# Node.js (v18以上推奨)
# https://nodejs.org/ からインストール、または:
brew install node

# pnpm
npm install -g pnpm
```

## セットアップ

```bash
# プロジェクトディレクトリに移動
cd ~/dev/clip-translate

# フロントエンド依存関係インストール
pnpm install
```

> Rust の依存関係（Cargo.toml）は初回ビルド時に自動でダウンロードされます。

## 開発

```bash
cd ~/dev/clip-translate

# 開発サーバー起動（ホットリロード対応）
pnpm tauri dev
```

開発モードでは Vite の HMR が有効になり、フロントエンドの変更は即座に反映されます。Rust 側のコード変更時は自動で再コンパイルされます。

## ビルド（リリース用）

**重要: 必ずプロジェクトルートで実行してください。**

```bash
cd ~/dev/clip-translate

# プロダクションビルド
pnpm tauri build
```

### ビルド出力パス

ビルドが成功すると、以下のパスに成果物が生成されます：

```
~/dev/clip-translate/
└── src-tauri/
    └── target/
        └── release/
            ├── bundle/
            │   ├── macos/
            │   │   └── ClipTranslate.app          ← macOS アプリバンドル
            │   └── dmg/
            │       └── ClipTranslate_1.0.0_aarch64.dmg  ← 配布用 DMG
            └── clip-translate                      ← バイナリ本体
```

| ファイル | パス | 用途 |
|---------|------|------|
| `.app` | `src-tauri/target/release/bundle/macos/ClipTranslate.app` | 直接実行可能。`/Applications` にコピーして使用 |
| `.dmg` | `src-tauri/target/release/bundle/dmg/ClipTranslate_*.dmg` | 配布用ディスクイメージ。他のユーザーに渡す場合はこちら |

> **注意**: `src-tauri/target/release/bundle/dmg/` などのパスは、`~/dev/clip-translate/` からの相対パスです。ホームディレクトリ (`~`) から直接 `cd src-tauri/target/...` とすると見つかりません。

## インストール（ビルド後）

### 自分の Mac にインストール

```bash
cd ~/dev/clip-translate

# .app を Applications にコピー
cp -r src-tauri/target/release/bundle/macos/ClipTranslate.app /Applications/

# 起動
open /Applications/ClipTranslate.app
```

### Finder から直接開く

```bash
cd ~/dev/clip-translate

# ビルド成果物のフォルダを Finder で開く
open src-tauri/target/release/bundle/macos/
```

`ClipTranslate.app` を `/Applications` にドラッグしてください。

### 他のユーザーに配布

1. `src-tauri/target/release/bundle/dmg/` 内の `.dmg` ファイルを共有
2. 受け取った側は DMG を開いて `ClipTranslate.app` を `/Applications` にドラッグ

> **署名について**: Apple Developer ID で署名していない場合、初回起動時に「開発元を検証できません」と表示されます。
> `システム設定 → プライバシーとセキュリティ → セキュリティ` から「このまま開く」を選択するか、以下を実行：
> ```bash
> xattr -cr /Applications/ClipTranslate.app
> ```

## 初回設定

1. アプリを起動するとメニューバーにアイコンが表示されます
2. `Shift+Alt+T` でウィンドウを表示
3. 右上の歯車アイコン（⚙）から設定を開く
4. [DeepL API キー](https://www.deepl.com/ja/your-account/keys) を入力して保存
5. テキストをコピーして `Shift+Alt+T` で翻訳

> DeepL Free プランでは月間50万文字まで無料で翻訳できます。設定画面で現在の使用量を確認できます。

## 使い方

### メニューバー（トレイ）アイコン

アプリを起動すると macOS のメニューバー（画面右上のアイコン群）に ClipTranslate のアイコンが表示されます。

| 操作 | 動作 |
|------|------|
| **左クリック** | 翻訳ウィンドウの表示/非表示をトグル |
| **右クリック** | コンテキストメニューを表示（「表示」「終了」） |

### キーボードショートカット

| ショートカット | 動作 |
|--------------|------|
| `Shift+Alt+T`（デフォルト） | 翻訳ウィンドウの表示/非表示をトグル |

ショートカットキーは設定画面（⚙）から変更できます。

### 翻訳ウィンドウ

| 操作 | 動作 |
|------|------|
| ウィンドウ表示時 | クリップボードのテキストを自動取得し翻訳 |
| ソーステキスト編集 | 入力テキストを変更すると自動で再翻訳（デバウンス付き） |
| 翻訳結果テキスト編集 | 翻訳結果を手動で修正可能 |
| 🔄 ボタン | 翻訳方向を逆転（英→日 ⇔ 日→英） |
| コピーボタン | 翻訳結果をクリップボードにコピー（緑のフラッシュで確認） |
| 📋 履歴ボタン | 過去の翻訳履歴パネルを表示 |
| 🌙/☀ ボタン | ダークモードのトグル |
| ⚙ ボタン | 設定画面を表示 |
| ウィンドウ外をクリック | ウィンドウを自動的に非表示 |
| ヘッダー部分をドラッグ | ウィンドウを移動 |

### 履歴パネル

翻訳履歴は最大100件、90日間保持されます。キーワード検索で過去の翻訳を素早く見つけられます。一致するテキスト部分は黄色でハイライト表示されます。

### 設定画面

| 項目 | 説明 |
|------|------|
| DeepL API キー | 翻訳に使用する DeepL API キーを設定 |
| ショートカットキー | グローバルショートカットを変更 |
| 自動コピー | 翻訳結果を自動でクリップボードにコピーするか |
| API 使用量 | DeepL API の使用文字数・上限・残り文字数をリアルタイム表示 |

### DeepL API キーの取得

1. [DeepL](https://www.deepl.com/ja/your-account/keys) でアカウントを作成
2. API キーを取得（Free プランで月50万文字まで利用可能）
3. アプリの設定画面にキーを入力

> API キーの末尾が `:fx` の場合は Free プラン、それ以外は Pro プランとして自動判定されます。

## 設定ファイル

アプリの設定と翻訳履歴は以下に保存されます：

```
~/Library/Application Support/com.cliptranslate.app/store.json
```

設定をリセットしたい場合はこのファイルを削除してください。

## プロジェクト構成

```
clip-translate/
├── package.json              # npm / pnpm 設定
├── vite.config.ts            # Vite 設定
├── tailwind.config.js        # Tailwind CSS 設定（darkMode: "class"）
├── tsconfig.json             # TypeScript 設定
├── index.html                # エントリー HTML
├── src/                      # React フロントエンド
│   ├── main.tsx
│   ├── App.tsx               # メインUI・ダークモード・ドラッグ領域
│   ├── App.css               # カスタムスタイル・アニメーション
│   ├── lib/
│   │   └── tauri.ts          # Tauri invoke ラッパー
│   ├── components/
│   │   ├── TranslationView.tsx
│   │   ├── HistoryPanel.tsx  # 履歴パネル + キーワード検索
│   │   └── SettingsModal.tsx # 設定 + API使用量モニター
│   ├── hooks/
│   │   ├── useTranslation.ts # 翻訳ワークフロー
│   │   └── useHistory.ts    # 履歴管理
│   └── types/
│       └── index.ts
└── src-tauri/                # Rust バックエンド
    ├── Cargo.toml
    ├── tauri.conf.json       # ウィンドウ設定・バンドル設定
    ├── capabilities/
    │   └── default.json      # Tauri v2 権限設定
    └── src/
        ├── main.rs           # エントリーポイント
        ├── lib.rs            # Tauri 初期化・ショートカット・トレイアイコン
        ├── commands.rs       # Tauri コマンド定義
        ├── deepl.rs          # DeepL API クライアント（翻訳 + 使用量取得）
        ├── detect.rs         # Unicode ベースの言語自動検出
        └── storage.rs        # JSON ストレージ（履歴 + 設定）
```

## トラブルシューティング

### `xcrun: error: invalid active developer path`

Xcode Command Line Tools が未インストール：

```bash
xcode-select --install
```

### Rust コンパイルエラー

ツールチェインが古い可能性：

```bash
rustup update
```

### 「壊れている」「開発元を検証できません」と表示される

署名されていないアプリへの macOS の警告です：

```bash
xattr -cr /Applications/ClipTranslate.app
```

### メニューバーにアイコンが複数表示される

開発中に `pnpm tauri dev` を複数回実行すると、古いプロセスが残りトレイアイコンが重複することがあります：

```bash
# ClipTranslate のプロセスをすべて終了
pkill -f clip-translate

# もしくは
killall ClipTranslate
```

すべてのアイコンが消えたら、改めて `pnpm tauri dev` で起動してください。

### トレイアイコンをクリックしても反応しない

トレイアイコンの操作方法：

- **左クリック** → 翻訳ウィンドウの表示/非表示
- **右クリック** → メニュー表示（「表示」「終了」）

左クリックしてもウィンドウが表示されない場合、ウィンドウが画面外に配置されている可能性があります。右クリック → 「表示」を選択するか、ショートカットキー（`Shift+Alt+T`）で表示してください。

### ショートカットが反応しない

他のアプリが同じキーを使用している可能性があります。設定画面（⚙）でショートカットキーを変更してください。

### ビルド成果物が見つからない

ビルドは **必ずプロジェクトルートで** 実行してください：

```bash
# ✅ 正しい
cd ~/dev/clip-translate
pnpm tauri build

# 確認
ls src-tauri/target/release/bundle/macos/
ls src-tauri/target/release/bundle/dmg/
```

```bash
# ❌ 間違い（ホームディレクトリから直接パスを指定）
cd ~
cd src-tauri/target/release/bundle/dmg/   # → エラー
```

## ライセンス

MIT
