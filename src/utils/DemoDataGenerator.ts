/**
 * Demo Data Generator
 * Generates realistic-looking market data for testing
 */

import { Candle } from '../types/index.js';

export class DemoDataGenerator {
  private basePrice: number;
  private volatility: number;
  private trend: number;

  constructor(basePrice: number = 50000, volatility: number = 0.02, trend: number = 0.0001) {
    this.basePrice = basePrice;
    this.volatility = volatility;
    this.trend = trend;
  }

  /**
   * Generate sample candles with realistic price movement
   */
  generateCandles(count: number = 100, timeframe: string = '1h'): Candle[] {
    const candles: Candle[] = [];
    let currentPrice = this.basePrice;
    const now = Date.now();

    // Timeframe to milliseconds
    const intervalMap: Record<string, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '30m': 1800000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000,
      '1w': 604800000,
    };

    const interval = intervalMap[timeframe] || 3600000;

    for (let i = count - 1; i >= 0; i--) {
      const timestamp = now - i * interval;

      // Use previous close as open price
      const open = currentPrice;

      // Random walk with trend for close price
      const change = (Math.random() - 0.5) * this.volatility + this.trend;
      const close = open * (1 + change);

      // Generate high and low that respect OHLC constraints
      const volatilityRange = open * this.volatility * 0.5;
      const maxPrice = Math.max(open, close);
      const minPrice = Math.min(open, close);
      
      const high = maxPrice + Math.random() * volatilityRange;
      const low = minPrice - Math.random() * volatilityRange;
      const volume = 1000000 + Math.random() * 5000000;

      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume,
      });

      // Update current price for next iteration
      currentPrice = close;
    }

    return candles;
  }

  /**
   * Generate a single new candle based on the last price
   */
  generateNextCandle(lastClose: number, timestamp: number): Candle {
    const change = (Math.random() - 0.5) * this.volatility + this.trend;
    const open = lastClose;
    const close = open * (1 + change);

    const volatilityRange = open * this.volatility * 0.5;
    const high = Math.max(open, close) + Math.random() * volatilityRange;
    const low = Math.min(open, close) - Math.random() * volatilityRange;
    const volume = 1000000 + Math.random() * 5000000;

    return {
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    };
  }

  /**
   * Set trend direction (-1 to 1, where -1 is strong downtrend, 1 is strong uptrend)
   */
  setTrend(trend: number): void {
    this.trend = trend * 0.0005; // Scale to reasonable values
  }
}
