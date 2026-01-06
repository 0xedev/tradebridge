#!/usr/bin/env node
/**
 * Knowledge Demo CLI
 * Demonstrates how the AI learns from PDFs and applies to market analysis
 */

import { DocumentKnowledgeService } from '../services/DocumentKnowledgeService.js';
import { KnowledgeEnhancedStrategy } from '../strategies/ml/KnowledgeEnhancedStrategy.js';
import { DemoDataGenerator } from '../utils/DemoDataGenerator.js';
import { StrategyConfig, MarketData } from '../types/index.js';
import pino from 'pino';

const logger = pino({
  name: 'knowledge-demo',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

async function demonstrateKnowledge() {
  logger.info('=== TradeBridge Knowledge Integration Demo ===\n');

  // Initialize knowledge service
  const knowledgeService = new DocumentKnowledgeService();
  const stats = knowledgeService.getKnowledgeStats();

  logger.info(`Knowledge Base Statistics:`);
  logger.info(`- Total Insights: ${stats.totalInsights}`);
  logger.info(`- Patterns: ${stats.categories.patterns}`);
  logger.info(`- Strategies: ${stats.categories.strategies}`);
  logger.info(`- Indicators: ${stats.categories.indicators}`);
  logger.info(`- Risk Management: ${stats.categories.riskManagement}`);
  logger.info(`- Market Psychology: ${stats.categories.marketPsychology}`);
  logger.info(`- Source Documents: ${stats.sources.length}\n`);

  // Show sample insights
  logger.info('=== Sample Trading Knowledge from PDFs ===\n');

  logger.info('Chart Patterns:');
  knowledgeService
    .getKnowledgeCategory('patterns')
    .slice(0, 2)
    .forEach((insight) => {
      logger.info(`\n📊 ${insight.concept} (${insight.source})`);
      logger.info(`   ${insight.description}`);
      logger.info(`   Conditions: ${insight.applicableConditions.join(', ')}`);
    });

  logger.info('\n\nTrading Strategies:');
  knowledgeService
    .getKnowledgeCategory('strategies')
    .slice(0, 2)
    .forEach((insight) => {
      logger.info(`\n📈 ${insight.concept} (${insight.source})`);
      logger.info(`   ${insight.description}`);
    });

  logger.info('\n\nRisk Management:');
  knowledgeService
    .getKnowledgeCategory('riskManagement')
    .slice(0, 2)
    .forEach((insight) => {
      logger.info(`\n🛡️  ${insight.concept} (${insight.source})`);
      logger.info(`   ${insight.description}`);
    });

  // Demonstrate knowledge-enhanced analysis
  logger.info('\n\n=== Knowledge-Enhanced Market Analysis ===\n');

  // Generate sample market data
  const generator = new DemoDataGenerator(50000, 0.02, 0.0005); // Uptrend
  const candles = generator.generateCandles(100, '1h');

  const marketData: MarketData = {
    symbol: 'BTC/USDT',
    exchange: 'demo',
    timeframe: '1h',
    candles,
    timestamp: Date.now(),
  };

  // Create knowledge-enhanced strategy
  const strategyConfig: StrategyConfig = {
    name: 'knowledge-enhanced',
    enabled: true,
    symbols: ['BTC/USDT'],
    timeframes: ['1h'],
    weight: 1.0,
    parameters: {
      threshold: 0.5,
    },
  };

  const strategy = new KnowledgeEnhancedStrategy(strategyConfig);
  await strategy.initialize();

  // Analyze market with knowledge
  logger.info('Analyzing market data with PDF knowledge integration...\n');
  const signal = await strategy.analyze(marketData);

  logger.info('=== Analysis Result ===');
  logger.info(`Direction: ${signal.direction}`);
  logger.info(`Conviction: ${(signal.conviction * 100).toFixed(1)}%`);
  if (signal.metadata?.documentInsights) {
    logger.info(`Document Insights Applied: ${signal.metadata.documentInsights}`);
    logger.info(
      `Knowledge Boost: +${(signal.metadata.knowledgeBoost * 100).toFixed(1)}%`
    );
  }
  if (signal.metadata?.conditions) {
    logger.info(`Market Conditions: ${signal.metadata.conditions.join(', ')}`);
  }

  await strategy.cleanup();

  logger.info('\n\n=== How This Works ===');
  logger.info(`
1. PDF Knowledge Extraction:
   - Trading patterns, strategies, indicators from 60+ PDF files
   - Concepts like "Double Bottom", "Bollinger Squeeze", "Kelly Criterion"
   - Risk management rules and market psychology principles

2. Market Data Analysis:
   - Real-time technical indicators (RSI, MACD, Bollinger Bands, etc.)
   - Pattern recognition in price movements
   - Volume and volatility analysis

3. Knowledge Integration:
   - Match current market conditions to documented patterns
   - Apply strategy rules from PDFs (e.g., Bollinger Band Squeeze)
   - Use risk management principles (e.g., position sizing by volatility)
   - Consider market psychology (e.g., reflexivity theory)

4. Enhanced Decision Making:
   - Base technical signal (e.g., 60% conviction)
   - Add knowledge boost when conditions match documented patterns
   - Generate human-readable reasoning explaining the decision
   - Final conviction adjusted by alignment with trading literature

Example: If market shows "consolidation" + "low volatility", the system
retrieves "Bollinger Band Squeeze" knowledge from PDFs and increases
conviction for breakout trades, mimicking how a human trader would
recognize and act on this pattern.

Future Enhancement:
- Full PDF text extraction with pdf-parse
- Vector embeddings with OpenAI/sentence-transformers
- Semantic search with vector database (Pinecone, Chroma)
- LLM reasoning with GPT-4 or Claude
- Real-time learning from new documents
  `);

  logger.info('\n=== Demo Complete ===');
}

// Run the demo
demonstrateKnowledge().catch((error) => {
  logger.error(`Demo failed: ${error}`);
  process.exit(1);
});
