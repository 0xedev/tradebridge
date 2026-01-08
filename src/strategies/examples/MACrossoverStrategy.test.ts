import { describe, it, expect } from 'vitest';
import { MACrossoverStrategy } from './MACrossoverStrategy.js';
import { MarketData, Candle, StrategyConfig } from '../../types/index.js';

describe('MACrossoverStrategy', () => {
  const config: StrategyConfig = {
    name: 'ma-crossover-test',
    enabled: true,
    symbols: ['BTC/USDT'],
    timeframes: ['1h'],
    weight: 1.0,
    parameters: {
      fastPeriod: 5,
      slowPeriod: 10,
    },
  };

  const strategy = new MACrossoverStrategy(config);

  it('should return HOLD when insufficient data', async () => {
    const candles: Candle[] = [
      { timestamp: 1, open: 100, high: 101, low: 99, close: 100, volume: 1000 },
      { timestamp: 2, open: 100, high: 102, low: 100, close: 101, volume: 1000 },
    ];

    const data: MarketData = {
      symbol: 'BTC/USDT',
      exchange: 'binance',
      timeframe: '1h',
      candles,
      timestamp: Date.now(),
    };

    const signal = await strategy.analyze(data);
    expect(signal.direction).toBe('HOLD');
    expect(signal.conviction).toBe(0);
  });

  it('should generate BUY signal when fast SMA > slow SMA', async () => {
    // Generate uptrend data
    const candles: Candle[] = [];
    for (let i = 0; i < 20; i++) {
      candles.push({
        timestamp: i,
        open: 100 + i,
        high: 102 + i,
        low: 99 + i,
        close: 100 + i * 2, // Strong uptrend
        volume: 1000,
      });
    }

    const data: MarketData = {
      symbol: 'BTC/USDT',
      exchange: 'binance',
      timeframe: '1h',
      candles,
      timestamp: Date.now(),
    };

    const signal = await strategy.analyze(data);
    expect(signal.direction).toBe('BUY');
    expect(signal.conviction).toBeGreaterThan(0);
  });

  it('should generate SELL signal when fast SMA < slow SMA', async () => {
    // Generate downtrend data
    const candles: Candle[] = [];
    for (let i = 0; i < 20; i++) {
      candles.push({
        timestamp: i,
        open: 200 - i,
        high: 202 - i,
        low: 199 - i,
        close: 200 - i * 2, // Strong downtrend
        volume: 1000,
      });
    }

    const data: MarketData = {
      symbol: 'BTC/USDT',
      exchange: 'binance',
      timeframe: '1h',
      candles,
      timestamp: Date.now(),
    };

    const signal = await strategy.analyze(data);
    expect(signal.direction).toBe('SELL');
    expect(signal.conviction).toBeGreaterThan(0);
  });
});
