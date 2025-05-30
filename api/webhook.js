const { Client } = require('@line/bot-sdk');
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');
const crypto = require('crypto');

// 環境変数設定
const LINE_CONFIG = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const lineClient = new Client(LINE_CONFIG);

// 無料枠制限内での使用量管理
let dailyUsage = {
  groqCalls: 0,
  lineMessages: 0,
  lastReset: new Date().toDateString()
};

// ユーザー別制限管理
const userLimits = new Map();

// 設定値（環境変数から取得）
const CONFIG = {
  MAX_DAILY_GROQ_CALLS: parseInt(process.env.MAX_DAILY_GROQ_CALLS) || 20,
  MAX_DAILY_LINE_MESSAGES: parseInt(process.env.MAX_DAILY_LINE_MESSAGES) || 50,
  CACHE_DURATION_HOURS: parseInt(process.env.CACHE_DURATION_HOURS) || 4,
  MAX_USER_REQUESTS_PER_HOUR: 5
};

// 使用量リセット（日次）
function resetDailyUsage() {
  const today = new Date().toDateString();
  if (dailyUsage.lastReset !== today) {
    dailyUsage = { groqCalls: 0, lineMessages: 0, lastReset: today };
  }
}

// LINE署名検証
function validateSignature(body, signature, secret) {
  if (!signature || !secret) return false;
  
  const hash = crypto
    .createHmac('SHA256', secret)
    .update(body, 'utf8')
    .digest('base64');
  return signature === `${hash}`;
}

// ユーザー別制限チェック
function checkUserLimit(userId) {
  if (!userId) return false;
  
  const now = new Date();
  const userUsage = userLimits.get(userId) || { count: 0, lastReset: now };
  
  // 1時間ごとにリセット
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

// データ検証
function validateMarketData(data) {
  if (!data) return false;
  return typeof data.price === 'number' && 
         data.price > 0 &&
         typeof data.symbol === 'string' &&
         data.symbol.length > 0 &&
         typeof data.changePercent === 'string';
}

// メイン処理
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // LINE署名検証
    const signature = req.headers['x-line-signature'];
    const body = JSON.stringify(req.body);
    
    if (!validateSignature(body, signature, LINE_CONFIG.channelSecret)) {
      console.error('Invalid signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    resetDailyUsage();
    
    const events = req.body.events || [];
    
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        await handleMessage(event);
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleMessage(event) {
  const message = event.message.text.toLowerCase();
  const userId = event.source.userId;
  
  // ユーザー制限チェック
  if (!checkUserLimit(userId)) {
    await replyToUser(event.replyToken, 
      '⏰ 1時間に5回までご利用いただけます。しばらく時間をおいてからお試しください。');
    return;
  }
  
  // 無料枠制限チェック
  if (dailyUsage.lineMessages >= CONFIG.MAX_DAILY_LINE_MESSAGES) {
    return;
  }

  try {
    if (message.includes('シグナル') || message.includes('分析')) {
      const signals = await generateTradingSignals();
      const response = formatSignalsForLine(signals);
      
      await replyToUser(event.replyToken, response);
      dailyUsage.lineMessages++;
      
    } else if (message.includes('ヘルプ')) {
      await replyToUser(event.replyToken, getHelpMessage());
      dailyUsage.lineMessages++;
      
    } else {
      await replyToUser(event.replyToken, 
        '「シグナル」または「ヘルプ」と入力してください。');
      dailyUsage.lineMessages++;
    }
  } catch (error) {
    console.error('Message handling error:', {
      timestamp: new Date().toISOString(),
      userId: userId,
      message: message,
      error: error.message,
      stack: error.stack
    });
    
    await replyToUser(event.replyToken, 
      '❌ 申し訳ございません。一時的なエラーが発生しました。しばらく後にお試しください。');
  }
}

// 超軽量AI分析（Groq無料枠活用）
async function generateTradingSignals() {
  // 無料枠制限チェック
  if (dailyUsage.groqCalls >= CONFIG.MAX_DAILY_GROQ_CALLS) {
    return getCachedSignals();
  }

  try {
    // 株価データ取得（Yahoo Finance無料API）
    const symbols = ['6758', '7203', '9984'];
    const marketData = await fetchMarketData(symbols);
    
    // データ検証
    const validData = marketData.filter(validateMarketData);
    if (validData.length === 0) {
      throw new Error('No valid market data received');
    }
    
    // AI分析（Groq）
    const analysis = await callGroqAPI(validData);
    
    // 結果をキャッシュ
    await cacheSignals(analysis);
    
    dailyUsage.groqCalls++;
    return analysis;
    
  } catch (error) {
    console.error('Signal generation error:', {
      timestamp: new Date().toISOString(),
      error: error.message,
      groqCalls: dailyUsage.groqCalls
    });
    return getCachedSignals();
  }
}

// Yahoo Finance データ取得（完全無料）
async function fetchMarketData(symbols) {
  const results = [];
  
  for (const symbol of symbols) {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.T`
      );
      const data = await response.json();
      
      if (data.chart?.result?.[0]) {
        const result = data.chart.result[0];
        const meta = result.meta;
        
        results.push({
          symbol,
          price: meta.regularMarketPrice,
          change: meta.regularMarketPrice - meta.previousClose,
          changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100).toFixed(2),
          volume: meta.regularMarketVolume
        });
      }
    } catch (error) {
      console.error(`Failed to fetch ${symbol}:`, error);
    }
  }
  
  return results;
}

// Groq API呼び出し（無料枠）
async function callGroqAPI(marketData) {
  const prompt = `
日本株の簡易分析をお願いします。

データ:
${marketData.map(stock => 
  `${stock.symbol}: ¥${stock.price} (${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent}%)`
).join('\n')}

以下のJSON形式で3つの銘柄の判断を返してください：
{
  "signals": [
    {
      "symbol": "6758",
      "action": "BUY|SELL|HOLD",
      "confidence": 85,
      "reason": "簡潔な理由"
    }
  ]
}

判断基準：
- BUY: 上昇トレンドかつ出来高増加
- SELL: 下落トレンドかつ過熱感
- HOLD: 判断材料不足または中立
`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-70b-versatile",
      max_tokens: 500,
      temperature: 0.3
    });

    const response = completion.choices[0]?.message?.content;
    return JSON.parse(response);
    
  } catch (error) {
    console.error('Groq API error:', error);
    throw error;
  }
}

// Supabaseキャッシュ
async function cacheSignals(signals) {
  try {
    await supabase
      .from('signal_cache')
      .upsert({
        id: 'latest',
        data: signals,
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Cache error:', error);
  }
}

async function getCachedSignals() {
  try {
    const { data } = await supabase
      .from('signal_cache')
      .select('*')
      .eq('id', 'latest')
      .single();
    
    // 設定された時間以内のキャッシュのみ使用
    const cacheMaxAge = CONFIG.CACHE_DURATION_HOURS * 60 * 60 * 1000;
    if (data && new Date() - new Date(data.updated_at) < cacheMaxAge) {
      return data.data;
    }
  } catch (error) {
    console.error('Cache retrieval error:', {
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
  
  return {
    signals: [
      { symbol: '6758', action: 'HOLD', confidence: 50, reason: 'データ取得中' },
      { symbol: '7203', action: 'HOLD', confidence: 50, reason: 'データ取得中' },
      { symbol: '9984', action: 'HOLD', confidence: 50, reason: 'データ取得中' }
    ]
  };
}

// LINE返信
async function replyToUser(replyToken, message) {
  try {
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: message
    });
  } catch (error) {
    console.error('LINE reply error:', error);
  }
}

// シグナルフォーマット
function formatSignalsForLine(analysis) {
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
  
  const remainingMessages = CONFIG.MAX_DAILY_LINE_MESSAGES - dailyUsage.lineMessages;
  message += `⚠️ 投資判断は自己責任で\n📱 無料版：1日${remainingMessages}通残り`;
  
  return message;
}

function getHelpMessage() {
  return `🤖 TradeharmonyAI - 無料版

📊 コマンド:
• "シグナル" - 最新分析結果
• "ヘルプ" - この画面

🆓 無料版制限:
• 1日20回AI分析
• 1日50通LINE通知
• 3銘柄監視
• 4時間キャッシュ

💡 データ更新: 平日9:00-15:00
⚠️ 投資は自己責任でお願いします`;
}
