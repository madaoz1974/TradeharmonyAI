const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 設定値
const CONFIG = {
  MAX_DAILY_GROQ_CALLS: parseInt(process.env.MAX_DAILY_GROQ_CALLS) || 20,
  MAX_DAILY_LINE_MESSAGES: parseInt(process.env.MAX_DAILY_LINE_MESSAGES) || 50,
  CACHE_DURATION_HOURS: parseInt(process.env.CACHE_DURATION_HOURS) || 4
};

let dailyUsage = {
  groqCalls: 0,
  lineMessages: 0,
  lastReset: new Date().toDateString()
};

function resetDailyUsage() {
  const today = new Date().toDateString();
  if (dailyUsage.lastReset !== today) {
    dailyUsage = { groqCalls: 0, lineMessages: 0, lastReset: today };
  }
}

export default async function handler(req, res) {
  try {
    resetDailyUsage();
    
    const systemHealth = await checkSystemHealth();
    
    const freeQuotaStatus = {
      service: "TradeharmonyAI",
      version: "1.0.1",
      status: systemHealth.overall,
      usage: {
        groq_api: {
          used: dailyUsage.groqCalls,
          limit: CONFIG.MAX_DAILY_GROQ_CALLS,
          percentage: Math.round((dailyUsage.groqCalls / CONFIG.MAX_DAILY_GROQ_CALLS) * 100)
        },
        line_messages: {
          used: dailyUsage.lineMessages,
          limit: CONFIG.MAX_DAILY_LINE_MESSAGES,
          percentage: Math.round((dailyUsage.lineMessages / CONFIG.MAX_DAILY_LINE_MESSAGES) * 100)
        }
      },
      system_health: systemHealth,
      database_size: await getDatabaseSize(),
      monthly_cost: 0,
      last_updated: new Date().toISOString()
    };
    
    res.status(200).json(freeQuotaStatus);
  } catch (error) {
    console.error('Status check error:', {
      timestamp: new Date().toISOString(),
      error: error.message
    });
    
    res.status(500).json({
      service: "TradeharmonyAI",
      status: "error",
      error: "System health check failed"
    });
  }
}

async function getDatabaseSize() {
  try {
    const { data, error } = await supabase
      .from('signal_cache')
      .select('*');
    
    if (error) throw error;
    
    const sizeKB = JSON.stringify(data).length / 1024;
    return `${Math.round(sizeKB)}KB`;
  } catch (error) {
    console.error('Database size check error:', error);
    return "0KB";
  }
}

async function checkSystemHealth() {
  const checks = {
    database: false,
    external_api: false,
    cache: false
  };

  try {
    // データベース接続チェック
    const { error: dbError } = await supabase
      .from('signal_cache')
      .select('id')
      .limit(1);
    checks.database = !dbError;

    // Yahoo Finance API チェック
    try {
      const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/6758.T');
      checks.external_api = response.ok;
    } catch {
      checks.external_api = false;
    }

    // キャッシュ状態チェック
    const { data: cacheData } = await supabase
      .from('signal_cache')
      .select('updated_at')
      .eq('id', 'latest')
      .single();
    
    if (cacheData) {
      const cacheAge = new Date() - new Date(cacheData.updated_at);
      const maxAge = CONFIG.CACHE_DURATION_HOURS * 60 * 60 * 1000;
      checks.cache = cacheAge < maxAge;
    }

  } catch (error) {
    console.error('Health check error:', error);
  }

  const healthyChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;
  
  return {
    checks,
    overall: healthyChecks === totalChecks ? 'healthy' : 
             healthyChecks > 0 ? 'degraded' : 'unhealthy',
    score: `${healthyChecks}/${totalChecks}`
  };
}