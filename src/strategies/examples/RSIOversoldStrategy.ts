/**
 * RSI Oversold/Overbought Strategy
 * Buy when RSI is oversold (< 30)
 * Sell when RSI is overbought (> 70)
 */

import { Strategy } from '../../core/Strategy.js';
import { MarketData, Signal } from '../../types/index.js';

export class RSIOversoldStrategy extends Strategy {
  private period: number;
  private oversoldLevel: number;
  private overboughtLevel: number;
  private neutralConviction: number; // Conviction when RSI is in neutral zone (30-70)

  constructor(config: any) {
    super(config);
    this.period = config.parameters?.period || 14;
    this.oversoldLevel = config.parameters?.oversoldLevel || 30;
    this.overboughtLevel = config.parameters?.overboughtLevel || 70;
    // Lower conviction (30%) when RSI is in neutral zone
    this.neutralConviction = config.parameters?.neutralConviction || 0.3;
  }

  async analyze(data: MarketData): Promise<Signal> {
    const closes = data.candles.map((c) => c.close);

    if (closes.length < this.period + 1) {
      return {
        direction: 'HOLD',
        conviction: 0,
        metadata: { reason: 'Insufficient data' },
      };
    }

    const rsi = this.calculateRSI(closes, this.period);
    const currentRSI = rsi[rsi.length - 1];

    // Calculate conviction based on how extreme the RSI is
    let conviction = 0;
    let direction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

    if (currentRSI < this.oversoldLevel) {
      // Oversold - potential buy
      direction = 'BUY';
      conviction = (this.oversoldLevel - currentRSI) / this.oversoldLevel;
      this.logger.info(`RSI oversold (${currentRSI.toFixed(2)}) on ${data.symbol}`);
    } else if (currentRSI > this.overboughtLevel) {
      // Overbought - potential sell
      direction = 'SELL';
      conviction = (currentRSI - this.overboughtLevel) / (100 - this.overboughtLevel);
      this.logger.info(`RSI overbought (${currentRSI.toFixed(2)}) on ${data.symbol}`);
    } else {
      // Neutral zone - lower conviction, direction based on which side of 50
      conviction = this.neutralConviction;
      if (currentRSI > 50) {
        direction = 'BUY';
      } else {
        direction = 'SELL';
      }
    }

    return {
      direction,
      conviction: Math.min(conviction, 1),
      metadata: {
        rsi: currentRSI,
        oversoldLevel: this.oversoldLevel,
        overboughtLevel: this.overboughtLevel,
      },
    };
  }

  private calculateRSI(data: number[], period: number): number[] {
    const result: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate RSI for each point
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain =
        gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss =
        losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;

      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - 100 / (1 + rs);
        result.push(rsi);
      }
    }

    return result;
  }
}
