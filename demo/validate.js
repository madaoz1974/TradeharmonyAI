#!/usr/bin/env node

// TradeharmonyAI デモ・検証スクリプト
// 使用方法: node demo/validate.js

console.log('🚀 TradeharmonyAI v1.0.1 検証スクリプト\n');

// 設定値のテスト
const CONFIG = {
  MAX_DAILY_GROQ_CALLS: parseInt(process.env.MAX_DAILY_GROQ_CALLS) || 20,
  MAX_DAILY_LINE_MESSAGES: parseInt(process.env.MAX_DAILY_LINE_MESSAGES) || 50,
  CACHE_DURATION_HOURS: parseInt(process.env.CACHE_DURATION_HOURS) || 4,
  MAX_USER_REQUESTS_PER_HOUR: 5
};

console.log('📊 設定値確認:');
console.log(`・Groq API制限: ${CONFIG.MAX_DAILY_GROQ_CALLS}回/日`);
console.log(`・LINE メッセージ制限: ${CONFIG.MAX_DAILY_LINE_MESSAGES}通/日`);
console.log(`・キャッシュ保持時間: ${CONFIG.CACHE_DURATION_HOURS}時間`);
console.log(`・ユーザー制限: ${CONFIG.MAX_USER_REQUESTS_PER_HOUR}回/時間\n`);

// データ検証機能のテスト
function validateMarketData(data) {
  if (!data) return false;
  return typeof data.price === 'number' && 
         data.price > 0 &&
         typeof data.symbol === 'string' &&
         data.symbol.length > 0 &&
         typeof data.changePercent === 'string';
}

// テストデータ
const testCases = [
  { name: '正常データ', data: { symbol: '6758', price: 1000, changePercent: '+2.5' }, expected: true },
  { name: '価格が負', data: { symbol: '6758', price: -100, changePercent: '+2.5' }, expected: false },
  { name: 'シンボル空', data: { symbol: '', price: 1000, changePercent: '+2.5' }, expected: false },
  { name: 'null データ', data: null, expected: false },
  { name: '不完全データ', data: { symbol: '6758' }, expected: false }
];

console.log('🔍 データ検証テスト:');
testCases.forEach(test => {
  const result = validateMarketData(test.data);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`${status} ${test.name}: ${result ? 'PASS' : 'FAIL'}`);
});

// ユーザー制限のシミュレーション
console.log('\n⏱️ ユーザー制限シミュレーション:');
const userLimits = new Map();

function checkUserLimit(userId) {
  if (!userId) return false;
  
  const now = new Date();
  const userUsage = userLimits.get(userId) || { count: 0, lastReset: now };
  
  if (now - userUsage.lastReset > 3600000) {
    userUsage.count = 0;
    userUsage.lastReset = now;
  }
  
  if (userUsage.count >= CONFIG.MAX_USER_REQUESTS_PER_HOUR) {
    return false;
  }
  
  userUsage.count++;
  userLimits.set(userId, userUsage);
  return true;
}

const testUser = 'test-user-123';
for (let i = 1; i <= 7; i++) {
  const allowed = checkUserLimit(testUser);
  const status = allowed ? '✅' : '❌';
  console.log(`${status} リクエスト${i}: ${allowed ? '許可' : '制限'}`);
}

console.log('\n🎯 シグナルフォーマットテスト:');
const mockSignals = {
  signals: [
    { symbol: '6758', action: 'BUY', confidence: 85, reason: '上昇トレンド継続' },
    { symbol: '7203', action: 'SELL', confidence: 70, reason: '利益確定推奨' },
    { symbol: '9984', action: 'HOLD', confidence: 50, reason: '様子見が適切' }
  ]
};

function formatSignalsDemo(analysis) {
  if (!analysis?.signals) return '❌ データなし';
  
  let message = '📊 TradeharmonyAI シグナル\n\n';
  analysis.signals.forEach(signal => {
    const emoji = signal.action === 'BUY' ? '🟢' : 
                 signal.action === 'SELL' ? '🔴' : '⚪';
    const actionText = signal.action === 'BUY' ? '買い時' :
                      signal.action === 'SELL' ? '売り時' : '様子見';
    
    message += `${emoji} ${signal.symbol}: ${actionText} (${signal.confidence}%)\n`;
  });
  return message;
}

console.log(formatSignalsDemo(mockSignals));

console.log('\n🚀 検証完了！');
console.log('💡 次のステップ:');
console.log('1. 実際のAPIキーを設定');
console.log('2. Vercelにデプロイ');
console.log('3. LINE Bot接続テスト');
console.log('4. システム監視の開始');
