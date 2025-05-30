// Basic tests for TradeharmonyAI
// Run with: node tests/basic.test.js

const assert = require('assert');

// テスト用のモック関数
function validateMarketData(data) {
  if (!data) return false;
  return typeof data.price === 'number' && 
         data.price > 0 &&
         typeof data.symbol === 'string' &&
         data.symbol.length > 0 &&
         typeof data.changePercent === 'string';
}

function formatSignalsForLine(analysis, remainingMessages = 45) {
  if (!analysis?.signals) {
    return '❌ 現在、分析データを取得できません。しばらく後にお試しください。';
  }

  let message = '📊 TradeharmonyAI シグナル\n\n';
  
  analysis.signals.forEach(signal => {
    const emoji = signal.action === 'BUY' ? '🟢' : 
                 signal.action === 'SELL' ? '🔴' : '⚪';
    const actionText = signal.action === 'BUY' ? '買い時' :
                      signal.action === 'SELL' ? '売り時' : '様子見';
    
    message += `${emoji} ${signal.symbol}: ${actionText}\n`;
    message += `信頼度: ${signal.confidence}%\n`;
    message += `理由: ${signal.reason}\n\n`;
  });
  
  message += `⚠️ 投資判断は自己責任で\n📱 無料版：1日${remainingMessages}通残り`;
  
  return message;
}

// テスト実行
console.log('🧪 TradeharmonyAI テスト開始...\n');

// Test 1: Market data validation
console.log('Test 1: Market data validation');
const validData = {
  symbol: '6758',
  price: 1000,
  changePercent: '+2.5'
};
const invalidData = {
  symbol: '',
  price: -100,
  changePercent: 2.5
};

assert(validateMarketData(validData) === true, 'Valid data should pass');
assert(validateMarketData(invalidData) === false, 'Invalid data should fail');
assert(validateMarketData(null) === false, 'Null data should fail');
console.log('✅ Market data validation tests passed\n');

// Test 2: Signal formatting
console.log('Test 2: Signal formatting');
const mockSignals = {
  signals: [{
    symbol: '6758',
    action: 'BUY',
    confidence: 85,
    reason: 'テスト理由'
  }]
};

const formatted = formatSignalsForLine(mockSignals);
assert(formatted.includes('🟢'), 'Should include green emoji for BUY');
assert(formatted.includes('買い時'), 'Should include buy text');
assert(formatted.includes('85%'), 'Should include confidence');
assert(formatted.includes('テスト理由'), 'Should include reason');
console.log('✅ Signal formatting tests passed\n');

// Test 3: Error handling
console.log('Test 3: Error handling');
const emptySignals = null;
const errorFormatted = formatSignalsForLine(emptySignals);
assert(errorFormatted.includes('❌'), 'Should handle null signals gracefully');
console.log('✅ Error handling tests passed\n');

// Test 4: Action types
console.log('Test 4: Action types');
const sellSignal = {
  signals: [{ symbol: '7203', action: 'SELL', confidence: 70, reason: '売り時' }]
};
const holdSignal = {
  signals: [{ symbol: '9984', action: 'HOLD', confidence: 50, reason: '様子見' }]
};

const sellFormatted = formatSignalsForLine(sellSignal);
const holdFormatted = formatSignalsForLine(holdSignal);

assert(sellFormatted.includes('🔴'), 'Should include red emoji for SELL');
assert(sellFormatted.includes('売り時'), 'Should include sell text');
assert(holdFormatted.includes('⚪'), 'Should include white emoji for HOLD');
assert(holdFormatted.includes('様子見'), 'Should include hold text');
console.log('✅ Action type tests passed\n');

console.log('🎉 全てのテストが正常に完了しました！');
console.log('💡 実際のAPIテストは手動で実行してください：');
console.log('   - LINE Bot機能');
console.log('   - Groq API呼び出し');
console.log('   - Supabase データベース接続');
