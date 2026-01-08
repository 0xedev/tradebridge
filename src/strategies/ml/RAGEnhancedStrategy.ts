/**
 * RAG-Enhanced Trading Strategy
 * Uses full PDF extraction, vector embeddings, and LLM reasoning
 * 
 * This strategy demonstrates the complete RAG pipeline:
 * 1. Technical analysis on market data
 * 2. Semantic search in PDF knowledge base
 * 3. LLM-powered reasoning and insights
 * 4. Enhanced trading decisions
 */

import { Strategy } from '../../core/Strategy.js';
import { MarketData, Signal } from '../../types/index.js';
import { FeatureEngineering } from '../../utils/FeatureEngineering.js';
import { AdvancedRAGKnowledgeService } from '../../services/AdvancedRAGKnowledgeService.js';

export class RAGEnhancedStrategy extends Strategy {
  private threshold: number;
  private ragService: AdvancedRAGKnowledgeService;
  private initialized = false;

  constructor(config: any) {
    super(config);
    this.threshold = config.parameters?.threshold || 0.5;
    this.ragService = new AdvancedRAGKnowledgeService(config.parameters?.docsPath || './DOCs');
  }

  async initialize(): Promise<void> {
    await super.initialize();
    
    // Initialize RAG knowledge base
    this.logger.info('Initializing RAG knowledge base (this may take a few minutes)...');
    await this.ragService.initialize();
    
    const status = this.ragService.getStatus();
    this.logger.info(`RAG Service Status: ${JSON.stringify(status)}`);
    
    this.initialized = true;
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

    if (!this.initialized) {
      this.logger.warn('RAG service not initialized, using basic analysis');
      return this.analyzeTechnicals(data);
    }

    try {
      // Step 1: Basic Technical Analysis
      const technicalSignal = await this.analyzeTechnicals(data);

      // Step 2: Build query for knowledge retrieval
      const query = this.buildKnowledgeQuery(data, technicalSignal);

      // Step 3: Retrieve relevant knowledge from PDFs
      const retrievedKnowledge = await this.ragService.retrieveRelevantKnowledge(query, 5);

      this.logger.info(`Retrieved ${retrievedKnowledge.length} relevant knowledge chunks`);

      // Step 4: Get LLM analysis
      const llmAnalysis = await this.ragService.analyzeTradingDecision(
        data,
        technicalSignal,
        retrievedKnowledge
      );

      // Step 5: Enhance signal with LLM insights
      const enhancedSignal = this.enhanceSignalWithLLM(
        technicalSignal,
        llmAnalysis,
        retrievedKnowledge
      );

      // Log the detailed analysis
      if (enhancedSignal.direction !== 'HOLD') {
        this.logger.info(`\n=== ${data.symbol} RAG Analysis ===`);
        this.logger.info(`Technical: ${technicalSignal.direction} (${(technicalSignal.conviction * 100).toFixed(1)}%)`);
        this.logger.info(`LLM Confidence: ${(llmAnalysis.confidenceScore * 100).toFixed(1)}%`);
        this.logger.info(`\nReasoning: ${llmAnalysis.reasoning.slice(0, 200)}...`);
        this.logger.info(`\nInsights: ${llmAnalysis.tradingInsights.slice(0, 2).join('; ')}`);
        this.logger.info(`\nFinal: ${enhancedSignal.direction} (${(enhancedSignal.conviction * 100).toFixed(1)}%)`);
      }

      return enhancedSignal;
    } catch (error) {
      this.logger.error(`Error in RAG analysis: ${error}`);
      return this.analyzeTechnicals(data);
    }
  }

  /**
   * Build query for knowledge retrieval
   */
  private buildKnowledgeQuery(_data: MarketData, signal: Signal): string {
    const conditions: string[] = [];

    // Add signal direction
    conditions.push(signal.direction.toLowerCase());

    // Add technical patterns
    if (signal.metadata) {
      if (signal.metadata.rsi) {
        if (signal.metadata.rsi < 30) conditions.push('oversold RSI');
        if (signal.metadata.rsi > 70) conditions.push('overbought RSI');
      }
      
      if (signal.metadata.bbPosition !== undefined) {
        if (signal.metadata.bbPosition < 0.2) conditions.push('near lower Bollinger Band');
        if (signal.metadata.bbPosition > 0.8) conditions.push('near upper Bollinger Band');
      }

      if (signal.metadata.volatility) {
        conditions.push(signal.metadata.volatility > 0.02 ? 'high volatility' : 'low volatility');
      }
    }

    // Add general trading concepts
    conditions.push('trading strategy', 'risk management', 'entry rules');

    return conditions.join(' ');
  }

  /**
   * Enhance signal with LLM analysis
   */
  private enhanceSignalWithLLM(
    technicalSignal: Signal,
    llmAnalysis: any,
    retrievedKnowledge: any[]
  ): Signal {
    // Adjust conviction based on LLM confidence
    const llmConvictionAdjustment = (llmAnalysis.confidenceScore - technicalSignal.conviction) * 0.3;
    
    const enhancedConviction = Math.max(
      0,
      Math.min(1, technicalSignal.conviction + llmConvictionAdjustment)
    );

    // Determine if LLM suggests different direction
    let finalDirection = technicalSignal.direction;
    if (llmAnalysis.reasoning.toLowerCase().includes('should not') || 
        llmAnalysis.reasoning.toLowerCase().includes('avoid')) {
      finalDirection = 'HOLD';
    }

    return {
      direction: finalDirection,
      conviction: enhancedConviction,
      metadata: {
        ...technicalSignal.metadata,
        llmReasoning: llmAnalysis.reasoning,
        llmInsights: llmAnalysis.tradingInsights,
        llmRisks: llmAnalysis.riskFactors,
        llmActions: llmAnalysis.recommendedActions,
        llmConfidence: llmAnalysis.confidenceScore,
        llmAdjustment: llmConvictionAdjustment,
        retrievedSources: retrievedKnowledge.map(k => k.source),
        knowledgeRelevance: retrievedKnowledge.map(k => k.relevanceScore),
      },
    };
  }

  /**
   * Perform basic technical analysis
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

    // 1. Trend signals
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

    // 4. Bollinger Bands
    const bbPosition = (currentPrice - latestBBLower) / (latestBBUpper - latestBBLower);
    if (bbPosition < 0.2) {
      bullishSignals += 1;
    } else if (bbPosition > 0.8) {
      bearishSignals += 1;
    }

    // 5. Stochastic
    if (latestStochK < 20 && latestStochK > latestStochD) {
      bullishSignals += 1;
    } else if (latestStochK > 80 && latestStochK < latestStochD) {
      bearishSignals += 1;
    }

    // 6. Momentum
    const momentumStrength = (currentPrice - latestSMA50) / latestSMA50;
    if (momentumStrength > 0.02) {
      bullishSignals += 1;
    } else if (momentumStrength < -0.02) {
      bearishSignals += 1;
    }

    // 7. Volatility
    const atrPercent = latestATR / currentPrice;
    const volatilityBoost = atrPercent > 0.02 ? 0.8 : 1.0;

    const bullishConviction = (bullishSignals / totalSignals) * volatilityBoost;
    const bearishConviction = (bearishSignals / totalSignals) * volatilityBoost;

    let direction: 'BUY' | 'SELL' | 'HOLD';
    let conviction: number;

    if (bullishConviction > bearishConviction && bullishConviction > this.threshold) {
      direction = 'BUY';
      conviction = bullishConviction;
    } else if (bearishConviction > bullishConviction && bearishConviction > this.threshold) {
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
