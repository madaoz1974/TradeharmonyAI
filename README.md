# TradeharmonyAI

## 📋 セットアップガイド**

### **🎯 作成する8ファイル**
```
tradeharmony-ai/
├── package.json          ← パッケージ定義
├── .gitignore           ← Git除外設定  
├── .env.example         ← 環境変数テンプレート
├── vercel.json          ← Vercel設定
├── README.md            ← ドキュメント
└── api/
    ├── webhook.js       ← LINE Bot メイン機能
    ├── status.js        ← システム状態確認
    └── cron-analysis.js ← 定期分析実行
```

### **🔑 取得する4つのAPIキー**
1. **Groq AI** → 無料AIエンジン
2. **LINE Developers** → 無料Bot作成
3. **Supabase** → 無料データベース  
4. **Vercel** → 無料ホスティング

---

## 🔑 **ステップ3: 無料アカウント取得（並行実行）**

### **3.1 Groq AI（無料AIエンジン）**
1. [console.groq.com](https://console.groq.com) にアクセス
2. 「Sign Up」でアカウント作成
3. 「API Keys」→「Create API Key」
4. **APIキーをコピー保存**

### **3.2 Supabase（無料データベース）**
1. [supabase.com](https://supabase.com) にアクセス
2. 「Start your project」でアカウント作成
3. 「New Project」作成（名前: tradeharmony-db）
4. **Settings** → **API** から以下をコピー：
   - Project URL
   - anon public key

### **3.3 LINE Developers（無料Bot）**
1. [developers.line.biz](https://developers.line.biz/ja/) にアクセス
2. LINEアカウントでログイン
3. 「プロバイダー作成」→ 名前入力
4. 「Messaging API チャネル」作成
5. 以下をコピー：
   - チャネルシークレット
   - チャネルアクセストークン

### **3.4 Vercel（無料ホスティング）**
1. [vercel.com](https://vercel.com) にアクセス
2. GitHubアカウントで登録

---

## ⚙️ **ステップ4: 環境変数設定**

### **4.1 ローカル環境変数**
```bash
# .env.example を .env にコピー
cp .env.example .env

# .env ファイルを編集
# 取得したAPIキーを該当箇所に貼り付け
```

### **4.2 Supabaseテーブル作成**
```sql
-- Supabase SQL Editor で実行
CREATE TABLE signal_cache (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🚀 **ステップ5: デプロイとテスト**

### **5.1 GitHubにプッシュ**
```bash
git init
git add .
git commit -m "🎉 TradeharmonyAI initial setup"

# GitHubでリポジトリ作成後
git remote add origin https://github.com/your-username/tradeharmony-ai.git
git push -u origin main
```

### **5.2 Vercelデプロイ**
```bash
# Vercel CLI インストール
npm i -g vercel

# デプロイ実行
vercel

# 環境変数設定（Vercel Dashboard）
# 🔑 .env の内容をVercel環境変数に設定
```

### **5.3 LINE Bot設定**
```bash
# LINE Developers で設定
Webhook URL: https://your-app.vercel.app/api/webhook
Webhookの利用: ON
応答設定: 全てOFF（Webhookのみ）
```

---

## ✅ **ステップ6: 動作確認**

### **6.1 システム状態確認**
```bash
# ブラウザでアクセス
https://your-app.vercel.app/api/status

# 正常なら以下が表示される
{
  "service": "TradeharmonyAI",
  "status": "running",
  "usage": {...},
  "monthly_cost": 0
}
```

### **6.2 LINE Bot テスト**
```bash
1. QRコードで友だち追加
2. 「ヘルプ」と送信 → 使い方が表示される
3. 「シグナル」と送信 → 株式分析が表示される
```

### **6.3 定期実行確認**
```bash
# 平日9:00, 12:00, 15:00に自動分析実行
# Vercel Dashboard > Functions > Logs で確認
```

---

## 🎯 **成功の確認チェックリスト**

- [ ] **ファイル8個作成完了**
- [ ] **無料アカウント4個取得完了**  
- [ ] **環境変数設定完了**
- [ ] **Vercelデプロイ成功**
- [ ] **LINE Bot応答正常**
- [ ] **システム状態確認OK**
- [ ] **定期分析実行確認**

---

## 🚫 **よくあるエラーと解決法**

### **LINE Botが反応しない**
```
原因: Webhook URL設定ミス
解決: https://your-app.vercel.app/api/webhook を再確認
```

### **「Too Many Requests」エラー**
```
原因: 無料枠超過（Groq API 1日20回）
解決: 24時間待機 or 「シグナル」連発を避ける
```

### **Supabaseエラー**
```
原因: テーブル未作成
解決: signal_cache テーブルを作成
```

### **環境変数エラー**
```
原因: Vercel環境変数未設定
解決: Vercel Dashboard で .env の内容を設定
```

---

## 🎉 **完了！**

**🆓 完全無料でTradeharmonyAIが動作開始！**

- ✅ **月額$0**で運用
- ✅ **AI分析**による株式シグナル
- ✅ **LINE通知**で手軽確認
- ✅ **自動更新**で常に最新

**📈 効果を実感したらContext7やgitmcp統合で更なる高精度化に挑戦！**

---

## 📞 **サポート情報**

### **問題が発生した場合**
1. 上記エラー解決法を確認
2. Vercel Function ログを確認
3. 環境変数設定を再確認
4. セットアップ手順を最初から再実行

### **成功したら**
- SNSでシェア: #TradeharmonyAI
- 効果測定: 投資成果の記録
- 将来拡張: 高度機能の検討

---

## 🧪 **テスト実行**

### **基本テスト**
```bash
# 基本機能テスト実行
npm test

# 期待される出力:
# ✅ Market data validation tests passed
# ✅ Signal formatting tests passed  
# ✅ Error handling tests passed
# ✅ Action type tests passed
```

---

## 🔧 **v1.0.1 セキュリティ強化版**

### **新機能**
- ✅ **LINE署名検証** - 不正リクエスト防止
- ✅ **ユーザー制限** - 1時間5回まで利用制限
- ✅ **詳細ログ** - エラー詳細記録
- ✅ **システムヘルス** - 自動状態監視
- ✅ **設定の外部化** - 環境変数での制御
- ✅ **データ検証** - 入力値の厳密チェック
- ✅ **基本テスト** - 自動品質チェック

### **セキュリティ強化**
```bash
# システム状態確認
https://your-app.vercel.app/api/status

# 正常なら以下が表示される
{
  "service": "TradeharmonyAI",
  "version": "1.0.1", 
  "status": "healthy",
  "system_health": {
    "checks": {
      "database": true,
      "external_api": true, 
      "cache": true
    },
    "overall": "healthy",
    "score": "3/3"
  }
}
```

### **環境変数設定**
```bash
# .env ファイルで設定可能
MAX_DAILY_GROQ_CALLS=20
MAX_DAILY_LINE_MESSAGES=50
CACHE_DURATION_HOURS=4
```