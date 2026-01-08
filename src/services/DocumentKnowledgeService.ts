/**
 * Document Knowledge Service
 * Extracts and indexes trading knowledge from PDFs
 * Integrates document insights with market analysis
 */

import pino from 'pino';
import { MarketData, Signal } from '../types/index.js';

export interface DocumentInsight {
  source: string;
  concept: string;
  description: string;
  applicableConditions: string[];
  examples: string[];
}

export interface KnowledgeBase {
  patterns: DocumentInsight[];
  strategies: DocumentInsight[];
  indicators: DocumentInsight[];
  riskManagement: DocumentInsight[];
  marketPsychology: DocumentInsight[];
}

/**
 * Document Knowledge Service
 * 
 * This service ingests trading knowledge from PDF documents and makes it
 * available for AI analysis. In production, this would use:
 * - PDF text extraction (pdf-parse, pdfjs)
 * - Vector embeddings (OpenAI, sentence-transformers)
 * - Vector database (Pinecone, Chroma, Weaviate)
 * - LLM integration (GPT-4, Claude) for reasoning
 * 
 * Current implementation provides a knowledge base structure and
 * demonstrates how to integrate document knowledge with market analysis.
 */
export class DocumentKnowledgeService {
  private logger: pino.Logger;
  private knowledgeBase: KnowledgeBase;

  constructor() {
    this.logger = pino({ name: 'document-knowledge' });
    this.knowledgeBase = this.initializeKnowledgeBase();
    this.logger.info('Document Knowledge Service initialized');
  }

  /**
   * Initialize knowledge base from trading documents
   * 
   * In production, this would:
   * 1. Extract text from all PDFs in DOCs folder
   * 2. Parse and structure the content
   * 3. Create embeddings for semantic search
   * 4. Store in vector database
   * 
   * For now, we manually encode key concepts from the PDFs
   */
  private initializeKnowledgeBase(): KnowledgeBase {
    return {
      // Chart Pattern Recognition (from Core_Point_and_Figure_Chart_Patterns.pdf)
      patterns: [
        {
          source: 'Core_Point_and_Figure_Chart_Patterns.pdf',
          concept: 'Double Top Pattern',
          description: 'A bearish reversal pattern formed when price reaches a resistance level twice and fails to break through, indicating distribution and potential downtrend.',
          applicableConditions: ['uptrend', 'at resistance', 'decreasing volume'],
          examples: ['Two peaks at similar price levels', 'Neckline support break triggers sell'],
        },
        {
          source: 'Core_Point_and_Figure_Chart_Patterns.pdf',
          concept: 'Double Bottom Pattern',
          description: 'A bullish reversal pattern formed when price reaches a support level twice and bounces, indicating accumulation and potential uptrend.',
          applicableConditions: ['downtrend', 'at support', 'increasing volume on second bounce'],
          examples: ['Two troughs at similar price levels', 'Neckline resistance break triggers buy'],
        },
        {
          source: 'Eleven_Elliott_Wave_Patterns.pdf',
          concept: 'Elliott Wave Impulse',
          description: 'A five-wave pattern (1-2-3-4-5) moving in the direction of the main trend, with wave 3 typically the longest and most powerful.',
          applicableConditions: ['trending market', 'wave 3 longest', 'wave 4 does not overlap wave 1'],
          examples: ['Strong wave 3 with high volume', 'Wave 5 divergence signals reversal'],
        },
      ],

      // Trading Strategies (from various strategy PDFs)
      strategies: [
        {
          source: 'Bollinger_Bandit_Trading_Strategy.pdf',
          concept: 'Bollinger Band Squeeze',
          description: 'When Bollinger Bands narrow significantly, it indicates low volatility and precedes a large price move. Trade the breakout direction.',
          applicableConditions: ['bands narrowing', 'low ATR', 'consolidation'],
          examples: ['Wait for bands to squeeze', 'Enter on strong breakout with volume', 'Place stop at opposite band'],
        },
        {
          source: 'Dynamic_Breakout_II_Strategy.pdf',
          concept: 'Dynamic Breakout',
          description: 'Trade breakouts from consolidation zones using dynamic support/resistance levels based on recent price action.',
          applicableConditions: ['range-bound market', 'volume increase on breakout', 'retest of breakout level'],
          examples: ['Identify consolidation range', 'Enter on breakout with 1.5x average volume', 'Use previous resistance as support'],
        },
        {
          source: 'Money_Manager_Trading_Strategy.pdf',
          concept: 'Position Sizing by Volatility',
          description: 'Adjust position size inversely to market volatility - larger positions in low volatility, smaller in high volatility.',
          applicableConditions: ['calculate ATR', 'risk per trade constant', 'volatility regime identified'],
          examples: ['Risk 1% per trade', 'Position size = risk / (ATR * multiplier)', 'Reduce size when ATR spikes'],
        },
      ],

      // Technical Indicators (from indicator manuals)
      indicators: [
        {
          source: 'cci_manual.pdf',
          concept: 'CCI Divergence',
          description: 'Commodity Channel Index divergence occurs when price makes new highs/lows but CCI does not, signaling momentum weakness and potential reversal.',
          applicableConditions: ['trending market', 'CCI above +100 or below -100', 'price makes new extreme'],
          examples: ['Price higher high + CCI lower high = bearish divergence', 'Price lower low + CCI higher low = bullish divergence'],
        },
        {
          source: 'The_Sharpe_Ratio.pdf',
          concept: 'Risk-Adjusted Returns',
          description: 'Sharpe ratio measures return per unit of risk. Above 1.0 is good, above 2.0 is excellent. Compare strategies using this metric.',
          applicableConditions: ['backtesting', 'strategy comparison', 'portfolio optimization'],
          examples: ['Sharpe = (Return - RiskFree) / StdDev', 'Higher Sharpe preferred', 'Adjust leverage to optimize Sharpe'],
        },
        {
          source: 'Market_Profile_Basics.pdf',
          concept: 'Value Area Trading',
          description: 'Market Profile Value Area contains 70% of trading activity. Price above VA is bullish, below is bearish. VA acts as support/resistance.',
          applicableConditions: ['established VA from previous day', 'price approaching VA boundaries', 'volume profile available'],
          examples: ['Buy when price returns to VA from below', 'Sell when price returns to VA from above', 'VA migration signals trend'],
        },
      ],

      // Risk Management (from discipline and risk PDFs)
      riskManagement: [
        {
          source: '25_Rules_Of_Forex_Trading_Discipline.pdf',
          concept: 'Maximum Daily Loss Limit',
          description: 'Set a maximum loss limit per day (e.g., 2-3% of capital). Stop trading if hit. Prevents revenge trading and emotional decisions.',
          applicableConditions: ['daily trading', 'active management', 'emotional control needed'],
          examples: ['3 consecutive losses = stop for day', 'Daily loss limit = 3% of account', 'Review and reset next day'],
        },
        {
          source: 'The_7_Deadly_Sins_of_Forex.pdf',
          concept: 'Overtrading Prevention',
          description: 'Overtrading from boredom or revenge destroys accounts. Trade only high-quality setups that meet all criteria.',
          applicableConditions: ['multiple tempting setups', 'after losses', 'boredom'],
          examples: ['Maximum 3 trades per day', 'Require 3 confirmations before entry', 'Walk away after stop-limit hit'],
        },
        {
          source: 'a-new-interprtation-of-information-rate-kelly.pdf',
          concept: 'Kelly Criterion Position Sizing',
          description: 'Optimal position size = (Win Rate * Avg Win - (1 - Win Rate) * Avg Loss) / Avg Win. Use fractional Kelly (25-50%) for safety.',
          applicableConditions: ['known win rate', 'known avg win/loss', 'sufficient trade history'],
          examples: ['Win rate 60%, avg win 2R = Kelly 20%', 'Use half-Kelly = 10% position', 'Recalculate monthly'],
        },
      ],

      // Market Psychology (from psychology and behavior PDFs)
      marketPsychology: [
        {
          source: 'How_George_Soros_Knows_What_He_Knows.pdf',
          concept: 'Reflexivity Theory',
          description: 'Market participants\' biased views influence fundamentals, which in turn influence participants\' views, creating feedback loops.',
          applicableConditions: ['trending market', 'narrative-driven moves', 'bubble/crash conditions'],
          examples: ['Rising prices attract buyers → more buying → higher prices', 'Self-reinforcing trends', 'Identify when reflexivity breaks'],
        },
        {
          source: 'trade_behavior.pdf',
          concept: 'Order Flow Imbalance',
          description: 'Aggressive buying/selling pressure shown in bid-ask spread and order book depth. Indicates institutional activity and potential continuation.',
          applicableConditions: ['liquid markets', 'significant volume', 'order book data available'],
          examples: ['Large bids stacked = support', 'Bid/ask ratio > 2:1 = bullish', 'Iceberg orders hide true demand'],
        },
        {
          source: 'Calming_The_Mind.pdf',
          concept: 'Emotional Discipline',
          description: 'Maintain emotional equilibrium regardless of wins/losses. Fear and greed cause deviation from trading plan.',
          applicableConditions: ['after big win/loss', 'during drawdown', 'volatile markets'],
          examples: ['Same position size win or loss', 'Take breaks after 2 losses', 'Journal emotional state'],
        },
      ],
    };
  }

  /**
   * Query knowledge base for relevant insights
   * 
   * In production with RAG:
   * 1. Convert query to embedding vector
   * 2. Semantic search in vector DB
   * 3. Retrieve top-k relevant documents
   * 4. Use LLM to synthesize insights
   */
  queryKnowledge(query: string, category?: keyof KnowledgeBase): DocumentInsight[] {
    const searchTerms = query.toLowerCase().split(' ');
    const allInsights = category
      ? this.knowledgeBase[category]
      : Object.values(this.knowledgeBase).flat();

    // Simple keyword matching (would use embeddings in production)
    return allInsights.filter((insight) => {
      const searchableText = `${insight.concept} ${insight.description} ${insight.applicableConditions.join(' ')}`.toLowerCase();
      return searchTerms.some((term) => searchableText.includes(term));
    });
  }

  /**
   * Analyze market data with document knowledge
   * 
   * Combines technical analysis with documented trading wisdom
   */
  analyzeWithKnowledge(data: MarketData, technicalSignal: Signal): {
    enhancedSignal: Signal;
    insights: DocumentInsight[];
    reasoning: string;
  } {
    const { candles } = data;
    const latestCandle = candles[candles.length - 1];
    const closes = candles.map((c) => c.close);
    
    // Identify market conditions
    const conditions: string[] = [];
    const insights: DocumentInsight[] = [];
    
    // Check for volatility squeeze (Bollinger Band concept)
    const recentRange = Math.max(...closes.slice(-20)) - Math.min(...closes.slice(-20));
    const avgRange = closes.slice(-50, -20).reduce((sum, c, i, arr) => {
      if (i === 0) return 0;
      return sum + Math.abs(c - arr[i - 1]);
    }, 0) / 29;
    
    if (recentRange < avgRange * 0.6) {
      conditions.push('low volatility');
      conditions.push('consolidation');
      insights.push(...this.queryKnowledge('squeeze consolidation breakout'));
    }

    // Check for trend
    const sma20 = closes.slice(-20).reduce((a, b) => a + b) / 20;
    const sma50 = closes.slice(-50).reduce((a, b) => a + b) / 50;
    
    if (latestCandle.close > sma20 && sma20 > sma50) {
      conditions.push('uptrend');
      insights.push(...this.queryKnowledge('uptrend momentum'));
    } else if (latestCandle.close < sma20 && sma20 < sma50) {
      conditions.push('downtrend');
      insights.push(...this.queryKnowledge('downtrend reversal'));
    }

    // Check for divergence potential
    if (technicalSignal.conviction < 0.5 && technicalSignal.direction !== 'HOLD') {
      insights.push(...this.queryKnowledge('divergence reversal'));
    }

    // Check volume
    const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;
    if (latestCandle.volume > avgVolume * 1.5) {
      conditions.push('high volume');
      insights.push(...this.queryKnowledge('volume breakout'));
    }

    // Query relevant knowledge based on conditions
    if (conditions.length > 0) {
      insights.push(...this.queryKnowledge(conditions.join(' ')));
    }

    // Deduplicate insights
    const uniqueInsights = Array.from(
      new Map(insights.map((i) => [i.concept, i])).values()
    );

    // Generate reasoning based on knowledge
    const reasoning = this.generateReasoning(
      technicalSignal,
      uniqueInsights,
      conditions
    );

    // Adjust conviction based on knowledge alignment
    let convictionAdjustment = 0;
    
    // Increase conviction if knowledge supports the signal
    const supportingInsights = uniqueInsights.filter((insight) => {
      const bullishKeywords = ['bullish', 'buy', 'uptrend', 'accumulation'];
      const bearishKeywords = ['bearish', 'sell', 'downtrend', 'distribution'];
      
      const text = `${insight.concept} ${insight.description}`.toLowerCase();
      
      if (technicalSignal.direction === 'BUY') {
        return bullishKeywords.some((kw) => text.includes(kw));
      } else if (technicalSignal.direction === 'SELL') {
        return bearishKeywords.some((kw) => text.includes(kw));
      }
      return false;
    });

    convictionAdjustment = supportingInsights.length * 0.05; // 5% per supporting insight
    convictionAdjustment = Math.min(convictionAdjustment, 0.2); // Cap at 20%

    const enhancedConviction = Math.min(
      technicalSignal.conviction + convictionAdjustment,
      1.0
    );

    return {
      enhancedSignal: {
        ...technicalSignal,
        conviction: enhancedConviction,
        metadata: {
          ...technicalSignal.metadata,
          documentInsights: uniqueInsights.length,
          knowledgeBoost: convictionAdjustment,
          conditions,
        },
      },
      insights: uniqueInsights.slice(0, 5), // Top 5 most relevant
      reasoning,
    };
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    signal: Signal,
    insights: DocumentInsight[],
    conditions: string[]
  ): string {
    const parts: string[] = [];

    parts.push(
      `Technical analysis suggests ${signal.direction} with ${(signal.conviction * 100).toFixed(1)}% conviction.`
    );

    if (conditions.length > 0) {
      parts.push(`Market conditions: ${conditions.join(', ')}.`);
    }

    if (insights.length > 0) {
      parts.push('\nRelevant trading knowledge:');
      insights.slice(0, 3).forEach((insight) => {
        parts.push(`- ${insight.concept} (${insight.source}): ${insight.description}`);
      });
    }

    if (insights.length > 0) {
      parts.push(
        `\nThis aligns with ${insights.length} documented trading concepts, suggesting the signal has strong theoretical backing.`
      );
    }

    return parts.join(' ');
  }

  /**
   * Get all knowledge in a category
   */
  getKnowledgeCategory(category: keyof KnowledgeBase): DocumentInsight[] {
    return this.knowledgeBase[category];
  }

  /**
   * Get statistics about the knowledge base
   */
  getKnowledgeStats(): {
    totalInsights: number;
    categories: Record<keyof KnowledgeBase, number>;
    sources: string[];
  } {
    return {
      totalInsights: Object.values(this.knowledgeBase).flat().length,
      categories: {
        patterns: this.knowledgeBase.patterns.length,
        strategies: this.knowledgeBase.strategies.length,
        indicators: this.knowledgeBase.indicators.length,
        riskManagement: this.knowledgeBase.riskManagement.length,
        marketPsychology: this.knowledgeBase.marketPsychology.length,
      },
      sources: Array.from(
        new Set(Object.values(this.knowledgeBase).flat().map((i) => i.source))
      ),
    };
  }
}
