/**
 * Simple Moving Average (SMA) Crossover Strategy
 * Buy when fast SMA crosses above slow SMA
 * Sell when fast SMA crosses below slow SMA
 */

import { Strategy } from '../../core/Strategy.js';
import { MarketData, Signal } from '../../types/index.js';

export class MACrossoverStrategy extends Strategy {
  private fastPeriod: number;
  private slowPeriod: number;

  constructor(config: any) {
    super(config);
    this.fastPeriod = config.parameters?.fastPeriod || 20;
    this.slowPeriod = config.parameters?.slowPeriod || 50;
  }

  async analyze(data: MarketData): Promise<Signal> {
    const closes = data.candles.map((c) => c.close);

    // Need enough data for calculation
    if (closes.length < this.slowPeriod) {
      return {
        direction: 'HOLD',
        conviction: 0,
        metadata: { reason: 'Insufficient data' },
      };
    }

    // Calculate SMAs
    const fastSMA = this.calculateSMA(closes, this.fastPeriod);
    const slowSMA = this.calculateSMA(closes, this.slowPeriod);

    // Get last two values to detect crossover
    const currentFast = fastSMA[fastSMA.length - 1];
    const previousFast = fastSMA[fastSMA.length - 2];
    const currentSlow = slowSMA[slowSMA.length - 1];
    const previousSlow = slowSMA[slowSMA.length - 2];

    // Detect crossover
    const bullishCrossover = previousFast <= previousSlow && currentFast > currentSlow;
    const bearishCrossover = previousFast >= previousSlow && currentFast < currentSlow;

    // Calculate conviction based on distance between SMAs
    const distance = Math.abs(currentFast - currentSlow);
    const avgPrice = (currentFast + currentSlow) / 2;
    const conviction = Math.min(distance / avgPrice / 0.02, 1); // Normalize to 0-1

    if (bullishCrossover) {
      this.logger.info(`Bullish crossover detected on ${data.symbol}`);
      return {
        direction: 'BUY',
        conviction: conviction * 0.8, // Scale down for conservative approach
        metadata: {
          fastSMA: currentFast,
          slowSMA: currentSlow,
          type: 'crossover',
        },
      };
    } else if (bearishCrossover) {
      this.logger.info(`Bearish crossover detected on ${data.symbol}`);
      return {
        direction: 'SELL',
        conviction: conviction * 0.8,
        metadata: {
          fastSMA: currentFast,
          slowSMA: currentSlow,
          type: 'crossover',
        },
      };
    } else if (currentFast > currentSlow) {
      // Uptrend but no crossover
      return {
        direction: 'BUY',
        conviction: conviction * 0.5,
        metadata: { fastSMA: currentFast, slowSMA: currentSlow, type: 'trend' },
      };
    } else {
      // Downtrend but no crossover
      return {
        direction: 'SELL',
        conviction: conviction * 0.5,
        metadata: { fastSMA: currentFast, slowSMA: currentSlow, type: 'trend' },
      };
    }
  }

  private calculateSMA(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  }
}
