/**
 * Feature Engineering
 * Technical indicators and features for ML models
 */

import { Candle } from '../types/index.js';

export class FeatureEngineering {
  /**
   * Calculate Simple Moving Average
   */
  static calculateSMA(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  }

  /**
   * Calculate Exponential Moving Average
   */
  static calculateEMA(data: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    let ema = data[0];
    result.push(ema);

    for (let i = 1; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }
    return result;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  static calculateRSI(data: number[], period: number = 14): number[] {
    const result: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;

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

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  static calculateMACD(
    data: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): { macd: number[]; signal: number[]; histogram: number[] } {
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);

    const macd: number[] = [];
    for (let i = 0; i < Math.min(fastEMA.length, slowEMA.length); i++) {
      macd.push(fastEMA[i] - slowEMA[i]);
    }

    const signal = this.calculateEMA(macd, signalPeriod);
    
    // Histogram: align MACD and signal arrays properly
    const histogram = macd.slice(macd.length - signal.length).map((m, i) => m - signal[i]);

    return { macd, signal, histogram };
  }

  /**
   * Calculate Bollinger Bands
   */
  static calculateBollingerBands(
    data: number[],
    period: number = 20,
    stdDev: number = 2
  ): { upper: number[]; middle: number[]; lower: number[] } {
    const middle = this.calculateSMA(data, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const avg = middle[i - period + 1];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / period;
      const std = Math.sqrt(variance);

      upper.push(avg + stdDev * std);
      lower.push(avg - stdDev * std);
    }

    return { upper, middle, lower };
  }

  /**
   * Calculate ATR (Average True Range)
   */
  static calculateATR(candles: Candle[], period: number = 14): number[] {
    const trueRanges: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }

    return this.calculateSMA(trueRanges, period);
  }

  /**
   * Calculate Stochastic Oscillator
   */
  static calculateStochastic(
    candles: Candle[],
    period: number = 14,
    smoothK: number = 3,
    smoothD: number = 3
  ): { k: number[]; d: number[] } {
    const k: number[] = [];

    for (let i = period - 1; i < candles.length; i++) {
      const slice = candles.slice(i - period + 1, i + 1);
      const high = Math.max(...slice.map((c) => c.high));
      const low = Math.min(...slice.map((c) => c.low));
      const close = candles[i].close;

      const stoch = ((close - low) / (high - low)) * 100;
      k.push(stoch);
    }

    const smoothedK = this.calculateSMA(k, smoothK);
    const d = this.calculateSMA(smoothedK, smoothD);

    return { k: smoothedK, d };
  }

  /**
   * Extract ML features from candle data
   */
  static extractFeatures(candles: Candle[]): number[][] {
    if (candles.length < 50) {
      throw new Error('Insufficient data for feature extraction (need at least 50 candles)');
    }

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume);

    // Calculate indicators
    const sma5 = this.calculateSMA(closes, 5);
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const ema12 = this.calculateEMA(closes, 12);
    const rsi = this.calculateRSI(closes, 14);
    const macd = this.calculateMACD(closes);
    const bb = this.calculateBollingerBands(closes, 20, 2);
    const atr = this.calculateATR(candles, 14);
    const stoch = this.calculateStochastic(candles, 14);

    // Combine features
    const features: number[][] = [];
    const startIdx = 50; // Skip first 50 candles to ensure all indicators have values

    for (let i = startIdx; i < candles.length; i++) {
      // Calculate indices for each indicator array
      const sma5Idx = i - 4; // SMA5 starts from candle 4
      const sma20Idx = i - 19; // SMA20 starts from candle 19
      const sma50Idx = i - 49; // SMA50 starts from candle 49
      const ema12Idx = i; // EMA starts from candle 0
      const rsiIdx = i - 15; // RSI starts from candle 15 (period + 1)
      const macdIdx = i; // MACD arrays start from beginning
      const bbIdx = i - 19; // BB starts from candle 19
      const atrIdx = i - 14; // ATR starts from candle 14
      const stochIdx = i - 14; // Stochastic starts from candle 14
      
      // Price-based features
      const close = closes[i];
      const open = candles[i].open;
      const high = highs[i];
      const low = lows[i];
      const volume = volumes[i];

      // Price changes
      const priceChange1 = (close - closes[i - 1]) / closes[i - 1];
      const priceChange5 = i >= 5 ? (close - closes[i - 5]) / closes[i - 5] : 0;
      const priceChange10 = i >= 10 ? (close - closes[i - 10]) / closes[i - 10] : 0;

      // Volume changes
      const volumeChange1 = i >= 1 ? (volume - volumes[i - 1]) / volumes[i - 1] : 0;

      // Candle patterns
      const bodySize = Math.abs(close - open);
      const upperWick = high - Math.max(open, close);
      const lowerWick = Math.min(open, close) - low;
      const candleRange = high - low;

      const feature = [
        // Price features
        priceChange1,
        priceChange5,
        priceChange10,
        volumeChange1,
        bodySize / (candleRange || 1),
        upperWick / (candleRange || 1),
        lowerWick / (candleRange || 1),
        
        // Moving averages (normalized by current price)
        (sma5[sma5Idx] || close) / close,
        (sma20[sma20Idx] || close) / close,
        (sma50[sma50Idx] || close) / close,
        (ema12[ema12Idx] || close) / close,
        
        // RSI
        (rsi[rsiIdx] || 50) / 100,
        
        // MACD (normalized)
        (macd.macd[macdIdx] || 0) / close,
        (macd.signal[macdIdx] || 0) / close,
        (macd.histogram[macdIdx] || 0) / close,
        
        // Bollinger Bands (normalized)
        bb.upper[bbIdx] && bb.lower[bbIdx]
          ? (close - bb.lower[bbIdx]) / (bb.upper[bbIdx] - bb.lower[bbIdx] || 1)
          : 0.5,
        
        // ATR (normalized)
        (atr[atrIdx] || 0) / close,
        
        // Stochastic
        (stoch.k[stochIdx] || 50) / 100,
        (stoch.d[stochIdx] || 50) / 100,
      ];

      features.push(feature);
    }

    return features;
  }

  /**
   * Generate labels for ML training (1 = price up, 0 = price down)
   */
  static generateLabels(candles: Candle[], lookAhead: number = 5): number[] {
    const labels: number[] = [];

    for (let i = 0; i < candles.length - lookAhead; i++) {
      const currentPrice = candles[i].close;
      const futurePrice = candles[i + lookAhead].close;
      
      // 1 if price goes up, 0 if price goes down
      labels.push(futurePrice > currentPrice ? 1 : 0);
    }

    return labels;
  }
}
