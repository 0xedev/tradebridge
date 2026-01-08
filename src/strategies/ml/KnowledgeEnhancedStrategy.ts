/**
 * Knowledge-Enhanced ML Strategy
 * Combines technical analysis with document knowledge from trading PDFs
 * 
 * This strategy demonstrates how AI can learn from both:
 * 1. Historical price movements (technical indicators)
 * 2. Trading knowledge from documents (patterns, strategies, psychology)
 */

import { Strategy } from '../../core/Strategy.js';
import { MarketData, Signal } from '../../types/index.js';
import { FeatureEngineering } from '../../utils/FeatureEngineering.js';
import { DocumentKnowledgeService } from '../../services/DocumentKnowledgeService.js';

export class KnowledgeEnhancedStrategy extends Strategy {
  private threshold: number;
  private knowledgeService: DocumentKnowledgeService;

  constructor(config: any) {
    super(config);
    this.threshold = config.parameters?.threshold || 0.5;
    this.knowledgeService = new DocumentKnowledgeService();
    
    // Log knowledge base stats
    const stats = this.knowledgeService.getKnowledgeStats();
    this.logger.info(
      `Loaded ${stats.totalInsights} trading insights from ${stats.sources.length} documents`
    );
  }

  async analyze(data: MarketData): Promise<Signal> {
    const { candles } = data;

    if (candles.length < 50) {
      return {
        direction: 'HOLD',
        conviction: 0,
        metadata: { reason: 'Insufficient data for analysis' },
      };
    }

    try {
      // Step 1: Technical Analysis (same as MLDirectionStrategy)
      const technicalSignal = await this.analyzeTechnicals(data);

      // Step 2: Enhance with Document Knowledge
      const { enhancedSignal, reasoning } =
        this.knowledgeService.analyzeWithKnowledge(data, technicalSignal);

      // Log the reasoning
      if (enhancedSignal.direction !== 'HOLD') {
        this.logger.info(`\n${data.symbol} Analysis:\n${reasoning}`);
      }

      return enhancedSignal;
    } catch (error) {
      this.logger.error(`Error in knowledge-enhanced analysis: ${error}`);
      return {
        direction: 'HOLD',
        conviction: 0,
        metadata: { error: String(error) },
      };
    }
  }

  /**
   * Perform technical analysis (base ML signals)
   */
  private async analyzeTechnicals(data: MarketData): Promise<Signal> {
    const { candles } = data;
    const closes = candles.map((c) => c.close);
    const currentPrice = closes[closes.length - 1];

    // Calculate technical indicators
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
    const latestATR = atr[atr.length - 1];

    // Signal scoring
    let bullishSignals = 0;
    let bearishSignals = 0;
    const totalSignals = 10.0;

    // 1. Trend signals (MA alignment)
    if (latestSMA5 > latestSMA20 && latestSMA20 > latestSMA50) {
      bullishSignals += 2;
    } else if (latestSMA5 < latestSMA20 && latestSMA20 < latestSMA50) {
      bearishSignals += 2;
    } else if (latestSMA5 > latestSMA20) {
      bullishSignals += 1;
    } else {
      bearishSignals += 1;
    }

    // 2. RSI signal
    if (latestRSI < 30) {
      bullishSignals += 1;
    } else if (latestRSI > 70) {
      bearishSignals += 1;
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
    const bbPosition =
      (currentPrice - latestBBLower) / (latestBBUpper - latestBBLower);
    if (bbPosition < 0.2) {
      bullishSignals += 1;
    } else if (bbPosition > 0.8) {
      bearishSignals += 1;
    }

    // 5. Stochastic signal
    if (latestStochK < 20 && latestStochK > latestStochD) {
      bullishSignals += 1;
    } else if (latestStochK > 80 && latestStochK < latestStochD) {
      bearishSignals += 1;
    }

    // 6. Momentum signal
    const momentumStrength = (currentPrice - latestSMA50) / latestSMA50;
    if (momentumStrength > 0.02) {
      bullishSignals += 1;
    } else if (momentumStrength < -0.02) {
      bearishSignals += 1;
    }

    // 7. Volatility regime
    const atrPercent = latestATR / currentPrice;
    const volatilityBoost = atrPercent > 0.02 ? 0.8 : 1.0;

    // Calculate conviction
    const bullishConviction = (bullishSignals / totalSignals) * volatilityBoost;
    const bearishConviction = (bearishSignals / totalSignals) * volatilityBoost;

    // Determine direction
    let direction: 'BUY' | 'SELL' | 'HOLD';
    let conviction: number;

    if (bullishConviction > bearishConviction && bullishConviction > this.threshold) {
      direction = 'BUY';
      conviction = bullishConviction;
    } else if (
      bearishConviction > bullishConviction &&
      bearishConviction > this.threshold
    ) {
      direction = 'SELL';
      conviction = bearishConviction;
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
  }
}
