const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    // 平日の市場時間のみ実行
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    if (day === 0 || day === 6 || hour < 9 || hour > 15) {
      return res.status(200).json({ message: 'Outside market hours' });
    }

    // バックグラウンド分析実行
    const symbols = ['6758', '7203', '9984'];
    const marketData = await fetchMarketData(symbols);
    const analysis = await generateAnalysis(marketData);
    
    // 結果をキャッシュに保存
    await cacheAnalysis(analysis);
    
    res.status(200).json({ 
      message: 'Analysis completed',
      timestamp: new Date().toISOString(),
      symbols: symbols.length,
      signals: analysis.signals?.length || 0
    });
  } catch (error) {
    console.error('Cron error:', error);
    res.status(500).json({ error: 'Cron failed' });
  }
}

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

async function generateAnalysis(marketData) {
  const prompt = `
日本株の定期分析を実行します。

現在のデータ:
${marketData.map(stock => 
  `${stock.symbol}: ¥${stock.price} (${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent}%)`
).join('\n')}

以下のJSON形式で分析結果を返してください：
{
  "signals": [
    {
      "symbol": "6758",
      "action": "BUY|SELL|HOLD",
      "confidence": 85,
      "reason": "分析理由"
    }
  ],
  "market_summary": "市場全体の状況",
  "timestamp": "${new Date().toISOString()}"
}
`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-70b-versatile",
      max_tokens: 600,
      temperature: 0.3
    });

    const response = completion.choices[0]?.message?.content;
    return JSON.parse(response);
    
  } catch (error) {
    console.error('Analysis generation error:', error);
    return {
      signals: [],
      market_summary: "分析エラーが発生しました",
      timestamp: new Date().toISOString()
    };
  }
}

async function cacheAnalysis(analysis) {
  try {
    await supabase
      .from('signal_cache')
      .upsert({
        id: 'latest',
        data: analysis,
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Cache save error:', error);
  }
}