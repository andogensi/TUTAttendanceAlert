# 授業出席リマインダー Chrome拡張機能

東京工科大学のサイト（https://service.cloud.teu.ac.jp/）で、各授業の開始時間に出席登録を促すバナーを表示するChrome拡張機能です。

## 機能

### 主要機能
- **リマインダーバナー**: 授業時間に大学サイト上でリマインダーバナーを表示
- **出席登録記録**: 出席登録済みボタンで、その日の該当時限を記録
- **新規タブリマインダー**: 授業時間中に新しいタブを開くとリマインダーページを表示（設定可能）
- **カスタマイズ可能な設定**: 表示時間帯、マイページリンク、スケジュールなどを設定

### 設定オプション
- リマインダー表示時間帯（開始前・開始後の分数を調整可能）
- マイページへのリンクボタン表示/非表示
- 新規タブでのリマインダー表示 ON/OFF
- 設定の自動保存 ON/OFF
- 授業スケジュール（曜日・時限ごとに設定可能）

### 対応時間帯（デフォルト設定）

| 時限 | 開始時刻 | デフォルト表示時間帯 |
|------|---------|---------------------|
| 1限  | 8:50    | 8:40-9:10          |
| 2限  | 10:45   | 10:35-11:05        |
| 3限  | 13:15   | 13:05-13:35        |
| 4限  | 15:10   | 15:00-15:30        |
| 5限  | 17:05   | 16:55-17:25        |

※表示時間帯は設定画面から変更できます

## インストール方法

1. Chromeブラウザで `chrome://extensions/` を開きます
2. 右上の「デベロッパーモード」を有効にします
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. この `attendance-reminder-extension` フォルダを選択します

## 使い方

1. **拡張機能アイコンをクリック**: 設定画面を開いて、お好みの設定を行います
2. **大学サイトにアクセス**: https://service.cloud.teu.ac.jp/ にアクセスすると、設定した時間帯にバナーが表示されます
3. **出席登録**: 出席登録が完了したら「✓ 出席登録しました」ボタンをクリックすると、その日は再表示されません

## プロジェクト構造

```
attendance-reminder-extension/
├── manifest.json          # 拡張機能の設定ファイル
├── shared/                # 共通モジュール（リファクタリング後）
│   ├── constants.js       # 共通定数（授業時刻、デフォルト値など）
│   ├── utils.js           # 共通ユーティリティ関数
│   └── storage.js         # ストレージ操作の抽象化
├── content.js             # バナー表示ロジック
├── background.js          # バックグラウンド処理（新規タブ検出など）
├── popup.html             # 設定画面HTML
├── popup.js               # 設定画面ロジック
├── popup.css              # 設定画面スタイル
├── reminder.html          # 新規タブ用リマインダーページ
├── reminder.js            # リマインダーページロジック
├── styles.css             # バナーのスタイル
├── icons/                 # アイコンファイル
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # このファイル
```

## アーキテクチャ（リファクタリング後）

このプロジェクトは保守性と拡張性を考慮してリファクタリングされています:

### 共通モジュール（`shared/`）

#### `constants.js`
- 授業開始時刻データ（`CLASS_START_TIMES`）
- デフォルト設定値
- ストレージキー定義

#### `utils.js`
- 日付処理関数（`getDateKey`, `getDayOfWeekKey`）
- 授業時限計算関数（`getCurrentClassPeriod`, `generateClassPeriods`）
- 共通ロジック

#### `storage.js`
- Chrome Storage APIのPromiseラッパー
- 設定の取得・保存
- 出席記録の管理

### 利点
- **DRY原則**: コードの重複を排除
- **単一責任の原則**: 各モジュールが明確な責務を持つ
- **保守性向上**: データ定義が一箇所に集約され、変更が容易
- **型安全性**: ES6モジュールによる依存関係の明確化

## カスタマイズ

### 時間帯の変更
設定画面（拡張機能アイコンをクリック）から、表示時間を調整できます:
- **開始前（分）**: 授業開始の何分前から表示するか
- **開始後（分）**: 授業開始の何分後まで表示するか

### 授業時刻の変更
授業の実際の開始時刻を変更したい場合は、`shared/constants.js` の `CLASS_START_TIMES` を編集してください。

```javascript
export const CLASS_START_TIMES = [
    { period: 1, hour: 8, minute: 50, label: '1限' },
    { period: 2, hour: 10, minute: 45, label: '2限' },
    // ...
];
```

## 開発者向け情報

### 技術スタック
- **Manifest V3**: 最新のChrome拡張機能仕様
- **ES6 Modules**: モジュラーなコード構成
- **Async/Await**: 非同期処理の可読性向上
- **Chrome Storage API**: 設定とデータの永続化

### 主な実装パターン
- **Promise-based Storage**: コールバック地獄を回避
- **Debounced Auto-save**: ユーザー体験の向上
- **Error Handling**: Extension context invalidated への対策

## 注意事項

- この拡張機能は https://service.cloud.teu.ac.jp/ でのみ動作します
- 出席記録は自動的にクリーンアップされ、古いデータは削除されます

## 開発者情報

- **開発者**: andogensi
- **連絡先**: tekitpu@ggmalii.com / andogensi@gmail.com
- **バージョン**: beta v 0.6

## ライセンス

このプロジェクトは個人使用を目的としています。

attendance-reminder-extension/
    attendance-reminder-extension/
        ├── manifest.json  