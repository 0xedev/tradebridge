/**
 * ML-Based Direction Classifier Strategy
 * Uses technical indicators and pattern recognition to predict price direction
 * (Placeholder for XGBoost - uses ensemble of technical signals)
 */

import { Strategy } from '../../core/Strategy.js';
import { MarketData, Signal } from '../../types/index.js';
import { FeatureEngineering } from '../../utils/FeatureEngineering.js';

export class MLDirectionStrategy extends Strategy {
  private threshold: number;

  constructor(config: any) {
    super(config);
    this.threshold = config.parameters?.threshold || 0.6;
  }

  async analyze(data: MarketData): Promise<Signal> {
    const { candles } = data;

    if (candles.length < 50) {
      return {
        direction: 'HOLD',
        conviction: 0,
        metadata: { reason: 'Insufficient data for ML analysis' },
      };
    }

    try {
      // Extract features
      const closes = candles.map((c) => c.close);
      const currentPrice = closes[closes.length - 1];

      // Calculate multiple technical indicators
      const sma5 = FeatureEngineering.calculateSMA(closes, 5);
      const sma20 = FeatureEngineering.calculateSMA(closes, 20);
      const sma50 = FeatureEngineering.calculateSMA(closes, 50);
      const rsi = FeatureEngineering.calculateRSI(closes, 14);
      const macd = FeatureEngineering.calculateMACD(closes);
      const bb = FeatureEngineering.calculateBollingerBands(closes, 20, 2);
      const atr = FeatureEngineering.calculateATR(candles, 14);
      const stoch = FeatureEngineering.calculateStochastic(candles, 14);

      // Get latest values
      const latestSMA5 = sma5[sma5.length - 1];
      const latestSMA20 = sma20[sma20.length - 1];
      const latestSMA50 = sma50[sma50.length - 1];
      const latestRSI = rsi[rsi.length - 1];
      const latestMACD = macd.macd[macd.macd.length - 1];
      const latestSignal = macd.signal[macd.signal.length - 1];
      const latestBBUpper = bb.upper[bb.upper.length - 1];
      const latestBBLower = bb.lower[bb.lower.length - 1];
      const latestStochK = stoch.k[stoch.k.length - 1];
      const latestStochD = stoch.d[stoch.d.length - 1];

      // Ensemble of signals (simulating ML classification)
      let bullishSignals = 0;
      let bearishSignals = 0;
      const totalSignals = 10.0; // Use float for accurate division

      // 1. Trend signals (MA alignment)
      if (latestSMA5 > latestSMA20 && latestSMA20 > latestSMA50) {
        bullishSignals += 2; // Strong bullish trend
      } else if (latestSMA5 < latestSMA20 && latestSMA20 < latestSMA50) {
        bearishSignals += 2; // Strong bearish trend
      } else if (latestSMA5 > latestSMA20) {
        bullishSignals += 1;
      } else {
        bearishSignals += 1;
      }

      // 2. RSI signal
      if (latestRSI < 30) {
        bullishSignals += 1; // Oversold
      } else if (latestRSI > 70) {
        bearishSignals += 1; // Overbought
      } else if (latestRSI > 50) {
        bullishSignals += 0.5;
      } else {
        bearishSignals += 0.5;
      }

      // 3. MACD signal
      if (latestMACD > latestSignal) {
        bullishSignals += 1;
      } else {
        bearishSignals += 1;
      }

      // 4. Bollinger Bands signal
      const bbPosition = (currentPrice - latestBBLower) / (latestBBUpper - latestBBLower);
      if (bbPosition < 0.2) {
        bullishSignals += 1; // Near lower band
      } else if (bbPosition > 0.8) {
        bearishSignals += 1; // Near upper band
      }

      // 5. Stochastic signal
      if (latestStochK < 20 && latestStochK > latestStochD) {
        bullishSignals += 1; // Oversold and turning up
      } else if (latestStochK > 80 && latestStochK < latestStochD) {
        bearishSignals += 1; // Overbought and turning down
      }

      // 6. Momentum signal (price vs MA50)
      const momentumStrength = (currentPrice - latestSMA50) / latestSMA50;
      if (momentumStrength > 0.02) {
        bullishSignals += 1;
      } else if (momentumStrength < -0.02) {
        bearishSignals += 1;
      }

      // 7. Volatility regime (ATR-based)
      const latestATR = atr[atr.length - 1];
      const atrPercent = latestATR / currentPrice;
      const volatilityBoost = atrPercent > 0.02 ? 0.8 : 1.0; // Reduce conviction in high volatility

      // Calculate conviction as percentage of signals
      const bullishConviction = (bullishSignals / totalSignals) * volatilityBoost;
      const bearishConviction = (bearishSignals / totalSignals) * volatilityBoost;

      // Determine direction
      let direction: 'BUY' | 'SELL' | 'HOLD';
      let conviction: number;

      if (bullishConviction > bearishConviction && bullishConviction > this.threshold) {
        direction = 'BUY';
        conviction = bullishConviction;
        this.logger.info(
          `ML prediction: BUY (${(conviction * 100).toFixed(1)}%) for ${data.symbol}`
        );
      } else if (bearishConviction > bullishConviction && bearishConviction > this.threshold) {
        direction = 'SELL';
        conviction = bearishConviction;
        this.logger.info(
          `ML prediction: SELL (${(conviction * 100).toFixed(1)}%) for ${data.symbol}`
        );
      } else {
        direction = 'HOLD';
        conviction = Math.abs(bullishConviction - bearishConviction);
      }

      return {
        direction,
        conviction,
        metadata: {
          bullishSignals,
          bearishSignals,
          rsi: latestRSI,
          macdHistogram: latestMACD - latestSignal,
          bbPosition,
          stochK: latestStochK,
          volatility: atrPercent,
        },
      };
    } catch (error) {
      this.logger.error(`Error in ML analysis: ${error}`);
      return {
        direction: 'HOLD',
        conviction: 0,
        metadata: { error: String(error) },
      };
    }
  }
}
