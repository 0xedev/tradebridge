/**
 * Advanced RAG Knowledge Service
 * Full PDF text extraction, vector embeddings, and LLM reasoning
 * 
 * This service implements a complete RAG (Retrieval-Augmented Generation) pipeline:
 * 1. Extract text from all trading PDFs
 * 2. Chunk and create embeddings with OpenAI
 * 3. Store in ChromaDB vector database
 * 4. Semantic search for relevant knowledge
 * 5. LLM reasoning to generate insights
 */

import pino from 'pino';
import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';
import OpenAI from 'openai';
import { ChromaClient } from 'chromadb';
import { MarketData, Signal } from '../types/index.js';

export interface DocumentChunk {
  id: string;
  text: string;
  metadata: {
    source: string;
    page?: number;
    chunkIndex: number;
  };
}

export interface RetrievalResult {
  text: string;
  source: string;
  relevanceScore: number;
}

export interface LLMAnalysis {
  reasoning: string;
  tradingInsights: string[];
  riskFactors: string[];
  recommendedActions: string[];
  confidenceScore: number;
}

/**
 * Advanced RAG Knowledge Service
 * 
 * Provides full PDF knowledge integration with:
 * - Automatic PDF text extraction
 * - Vector embeddings for semantic search
 * - LLM-powered reasoning and insights
 * - Context-aware trading recommendations
 */
export class AdvancedRAGKnowledgeService {
  private logger: pino.Logger;
  private openai: OpenAI | null = null;
  private chroma: ChromaClient | null = null;
  private collectionName = 'trading_knowledge';
  private docsPath: string;
  private isInitialized = false;

  constructor(docsPath: string = './DOCs') {
    this.logger = pino({ name: 'rag-knowledge' });
    this.docsPath = docsPath;

    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.logger.info('OpenAI client initialized');
    } else {
      this.logger.warn('OPENAI_API_KEY not set - LLM features disabled');
    }

    // Initialize ChromaDB (would connect to server in production)
    try {
      this.chroma = new ChromaClient();
      this.logger.info('ChromaDB client initialized');
    } catch (error) {
      this.logger.warn(`ChromaDB not available: ${error}. Using fallback mode.`);
    }
  }

  /**
   * Initialize the knowledge base from PDFs
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.info('Knowledge base already initialized');
      return;
    }

    try {
      this.logger.info('Starting PDF knowledge extraction...');
      
      // Get all PDF files
      const files = await fs.readdir(this.docsPath);
      const pdfFiles = files.filter(f => f.endsWith('.pdf'));
      
      this.logger.info(`Found ${pdfFiles.length} PDF files to process`);

      if (!this.openai) {
        this.logger.warn('Skipping PDF extraction - OpenAI not configured');
        this.isInitialized = true;
        return;
      }

      // Extract and process PDFs
      const chunks: DocumentChunk[] = [];
      let processedCount = 0;

      for (const file of pdfFiles.slice(0, 5)) { // Process first 5 for demo
        try {
          this.logger.info(`Processing ${file}...`);
          const filePath = path.join(this.docsPath, file);
          const buffer = await fs.readFile(filePath);
          
          // Extract text from PDF
          const data = await pdf(buffer);
          const text = data.text;
          
          // Chunk the text (split into ~500 word chunks)
          const textChunks = this.chunkText(text, 500);
          
          textChunks.forEach((chunk, index) => {
            chunks.push({
              id: `${file}_chunk_${index}`,
              text: chunk,
              metadata: {
                source: file,
                chunkIndex: index,
              },
            });
          });

          processedCount++;
          this.logger.info(`Processed ${file}: ${textChunks.length} chunks`);
        } catch (error) {
          this.logger.error(`Error processing ${file}: ${error}`);
        }
      }

      this.logger.info(`Extracted ${chunks.length} chunks from ${processedCount} PDFs`);

      // Store in vector database if available
      if (this.chroma && chunks.length > 0) {
        await this.storeInVectorDB(chunks);
      }

      this.isInitialized = true;
      this.logger.info('Knowledge base initialization complete');
    } catch (error) {
      this.logger.error(`Error initializing knowledge base: ${error}`);
      throw error;
    }
  }

  /**
   * Chunk text into smaller pieces
   */
  private chunkText(text: string, wordsPerChunk: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunk = words.slice(i, i + wordsPerChunk).join(' ');
      if (chunk.trim().length > 100) { // Minimum chunk size
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }

  /**
   * Store chunks in vector database
   */
  private async storeInVectorDB(chunks: DocumentChunk[]): Promise<void> {
    if (!this.chroma || !this.openai) return;

    try {
      // Create or get collection
      const collection = await this.chroma.getOrCreateCollection({
        name: this.collectionName,
      });

      this.logger.info(`Storing ${chunks.length} chunks in vector database...`);

      // Process in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        // Generate embeddings
        const texts = batch.map(c => c.text);
        const embeddings = await this.generateEmbeddings(texts);
        
        // Store in ChromaDB
        await collection.add({
          ids: batch.map(c => c.id),
          documents: texts,
          embeddings: embeddings,
          metadatas: batch.map(c => c.metadata),
        });

        this.logger.info(`Stored batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
      }

      this.logger.info('Vector database storage complete');
    } catch (error) {
      this.logger.error(`Error storing in vector DB: ${error}`);
    }
  }

  /**
   * Generate embeddings using OpenAI
   */
  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });

      return response.data.map(d => d.embedding);
    } catch (error) {
      this.logger.error(`Error generating embeddings: ${error}`);
      throw error;
    }
  }

  /**
   * Retrieve relevant knowledge using semantic search
   */
  async retrieveRelevantKnowledge(
    query: string,
    topK: number = 5
  ): Promise<RetrievalResult[]> {
    if (!this.chroma || !this.openai) {
      this.logger.warn('RAG features not available - returning empty results');
      return [];
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbeddings([query]);
      
      // Search in vector database - type assertion for API compatibility
      const collection = await (this.chroma.getCollection as any)({
        name: this.collectionName,
      });

      const results = await collection.query({
        queryEmbeddings: queryEmbedding,
        nResults: topK,
      });

      // Format results
      const retrievalResults: RetrievalResult[] = [];
      
      if (results.documents && results.documents[0] && results.metadatas && results.metadatas[0] && results.distances && results.distances[0]) {
        for (let i = 0; i < results.documents[0].length; i++) {
          retrievalResults.push({
            text: results.documents[0][i] || '',
            source: results.metadatas[0][i]?.source as string || 'unknown',
            relevanceScore: 1 - (results.distances[0][i] || 0), // Convert distance to similarity
          });
        }
      }

      return retrievalResults;
    } catch (error) {
      this.logger.error(`Error retrieving knowledge: ${error}`);
      return [];
    }
  }

  /**
   * Generate LLM-powered analysis with retrieved knowledge
   */
  async analyzeTradingDecision(
    marketData: MarketData,
    technicalSignal: Signal,
    retrievedKnowledge: RetrievalResult[]
  ): Promise<LLMAnalysis> {
    if (!this.openai) {
      return this.getFallbackAnalysis(technicalSignal);
    }

    try {
      // Prepare context
      const context = this.buildContext(marketData, technicalSignal, retrievedKnowledge);
      
      // Call GPT-4 for analysis
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert trading analyst with deep knowledge of technical analysis, risk management, and trading psychology. Analyze the provided market data and technical signals, incorporating insights from authoritative trading literature.`,
          },
          {
            role: 'user',
            content: context,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 1000,
      });

      const response = completion.choices[0].message.content || '';
      
      // Parse the response
      return this.parseAnalysis(response, technicalSignal.conviction);
    } catch (error) {
      this.logger.error(`Error generating LLM analysis: ${error}`);
      return this.getFallbackAnalysis(technicalSignal);
    }
  }

  /**
   * Build context for LLM
   */
  private buildContext(
    marketData: MarketData,
    signal: Signal,
    knowledge: RetrievalResult[]
  ): string {
    const { symbol, candles } = marketData;
    const latestCandle = candles[candles.length - 1];
    
    let context = `## Trading Decision Analysis Request

**Market Information:**
- Symbol: ${symbol}
- Current Price: $${latestCandle.close.toFixed(2)}
- Volume: ${latestCandle.volume.toFixed(0)}
- Timeframe: ${marketData.timeframe}

**Technical Signal:**
- Direction: ${signal.direction}
- Conviction: ${(signal.conviction * 100).toFixed(1)}%
- Technical Indicators: ${JSON.stringify(signal.metadata, null, 2)}

**Recent Price Action:**
`;

    // Add last 5 candles
    candles.slice(-5).forEach((candle, i) => {
      const change = i > 0 ? ((candle.close - candles[candles.length - 5 + i - 1].close) / candles[candles.length - 5 + i - 1].close * 100).toFixed(2) : '0.00';
      context += `- ${new Date(candle.timestamp).toISOString().slice(0, 16)}: $${candle.close.toFixed(2)} (${change}%)\n`;
    });

    context += `\n**Retrieved Trading Knowledge:**\n`;
    
    knowledge.slice(0, 3).forEach((k, i) => {
      context += `\n${i + 1}. From "${k.source}" (relevance: ${(k.relevanceScore * 100).toFixed(0)}%):\n${k.text.slice(0, 500)}...\n`;
    });

    context += `\n**Please provide:**
1. **Reasoning:** Detailed analysis of why this signal makes sense or doesn't, considering the retrieved trading knowledge
2. **Trading Insights:** 3-5 specific actionable insights
3. **Risk Factors:** 2-3 key risks to be aware of
4. **Recommended Actions:** Specific recommendations (entry, exit, position size adjustments)
5. **Confidence Score:** Your confidence in this analysis (0-100%)

Format your response as:
REASONING: [your analysis]
INSIGHTS: [bullet points]
RISKS: [bullet points]
ACTIONS: [bullet points]
CONFIDENCE: [score]`;

    return context;
  }

  /**
   * Parse LLM response
   */
  private parseAnalysis(response: string, baseConviction: number): LLMAnalysis {
    const sections = {
      reasoning: '',
      insights: [] as string[],
      risks: [] as string[],
      actions: [] as string[],
      confidence: baseConviction * 100,
    };

    // Parse response sections
    const reasoningMatch = response.match(/REASONING:(.*?)(?=INSIGHTS:|$)/s);
    if (reasoningMatch) {
      sections.reasoning = reasoningMatch[1].trim();
    }

    const insightsMatch = response.match(/INSIGHTS:(.*?)(?=RISKS:|$)/s);
    if (insightsMatch) {
      sections.insights = insightsMatch[1]
        .split(/[-•]\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 10);
    }

    const risksMatch = response.match(/RISKS:(.*?)(?=ACTIONS:|$)/s);
    if (risksMatch) {
      sections.risks = risksMatch[1]
        .split(/[-•]\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 10);
    }

    const actionsMatch = response.match(/ACTIONS:(.*?)(?=CONFIDENCE:|$)/s);
    if (actionsMatch) {
      sections.actions = actionsMatch[1]
        .split(/[-•]\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 10);
    }

    const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)/);
    if (confidenceMatch) {
      sections.confidence = parseInt(confidenceMatch[1]);
    }

    return {
      reasoning: sections.reasoning || response,
      tradingInsights: sections.insights,
      riskFactors: sections.risks,
      recommendedActions: sections.actions,
      confidenceScore: sections.confidence / 100,
    };
  }

  /**
   * Fallback analysis when LLM is not available
   */
  private getFallbackAnalysis(signal: Signal): LLMAnalysis {
    return {
      reasoning: `Technical analysis suggests ${signal.direction} with ${(signal.conviction * 100).toFixed(1)}% conviction based on ensemble of indicators.`,
      tradingInsights: [
        'Multiple technical indicators aligned in the same direction',
        'Consider market conditions and broader trend context',
        'Monitor for confirmation signals before entry',
      ],
      riskFactors: [
        'Market volatility may increase unexpectedly',
        'False signals possible in ranging markets',
      ],
      recommendedActions: [
        `Consider ${signal.direction} position with appropriate risk management`,
        'Use stop-loss orders to limit downside',
        'Start with smaller position size and scale in',
      ],
      confidenceScore: signal.conviction,
    };
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.openai !== null;
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    openaiAvailable: boolean;
    chromaAvailable: boolean;
  } {
    return {
      initialized: this.isInitialized,
      openaiAvailable: this.openai !== null,
      chromaAvailable: this.chroma !== null,
    };
  }
}
