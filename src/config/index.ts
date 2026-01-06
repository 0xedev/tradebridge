/**
 * Configuration loader for TradeBridge
 */

import { config } from 'dotenv';
import { TradingConfig, Timeframe } from '../types/index.js';

// Load environment variables
config();

export const tradingConfig: TradingConfig = {
  paperTrading: process.env.PAPER_TRADING === 'true',
  initialCapital: Number(process.env.INITIAL_CAPITAL) || 10000,
  enabledStrategies: ['ma-crossover', 'rsi-oversold'],
  symbols: ['BTC/USDT', 'ETH/USDT'],
  timeframes: ['1h', '4h'] as Timeframe[],
  risk: {
    maxDailyLossPercent: Number(process.env.MAX_DAILY_LOSS_PERCENT) || 5,
    maxDrawdownPercent: Number(process.env.MAX_DRAWDOWN_PERCENT) || 20,
    positionSizePercent: Number(process.env.POSITION_SIZE_PERCENT) || 2,
    maxPositionSize: 1000,
    maxConsecutiveLosses: 3,
    stopLossType: 'ATR',
    stopLossValue: 2,
  },
};

export const exchangeConfig = {
  binance: {
    apiKey: process.env.BINANCE_API_KEY || '',
    secret: process.env.BINANCE_SECRET || '',
    testnet: process.env.BINANCE_TESTNET === 'true',
  },
  alpaca: {
    apiKey: process.env.ALPACA_API_KEY || '',
    secret: process.env.ALPACA_SECRET || '',
    paper: process.env.ALPACA_PAPER === 'true',
  },
};

export const serverConfig = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',
};
