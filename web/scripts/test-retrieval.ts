/**
 * Test script for the retrieval service
 *
 * Usage:
 *   npx tsx scripts/test-retrieval.ts
 *
 * Prerequisites:
 *   - Ollama running with nomic-embed-text model
 *   - Supabase database with embeddings
 *   - Valid user ID with embeddings
 */

import { semanticSearch, hybridSearch, keywordSearch } from '../src/lib/embeddings/retrieval-service';
import { buildRAGContext } from '../src/lib/embeddings/context-builder';
import { ollamaClient } from '../src/lib/embeddings/ollama-client';

// Replace with a valid user ID from your database
const TEST_USER_ID = process.env.TEST_USER_ID || 'replace-with-valid-uuid';

async function testOllamaConnection() {
  console.log('\n========================================');
  console.log('1. Testing Ollama Connection');
  console.log('========================================');

  try {
    const isHealthy = await ollamaClient.healthCheck();
    if (isHealthy) {
      console.log('✓ Ollama is running and nomic-embed-text model is available');
      const config = ollamaClient.getConfig();
      console.log(`  Base URL: ${config.baseUrl}`);
      console.log(`  Model: ${config.model}`);
    } else {
      console.log('✗ Ollama health check failed');
      console.log('  Make sure Ollama is running: ollama serve');
      console.log('  Make sure model is installed: ollama pull nomic-embed-text');
      return false;
    }
  } catch (error) {
    console.error('✗ Error connecting to Ollama:', error);
    return false;
  }

  return true;
}

async function testEmbeddingGeneration() {
  console.log('\n========================================');
  console.log('2. Testing Embedding Generation');
  console.log('========================================');

  try {
    const testText = 'This is a test for the embedding service';
    console.log(`Input: "${testText}"`);

    const embedding = await ollamaClient.embed(testText);
    console.log(`✓ Generated embedding with ${embedding.length} dimensions`);

    // Test batch embedding
    const batchTexts = [
      'First test text',
      'Second test text',
      'Third test text',
    ];
    const batchEmbeddings = await ollamaClient.embedBatch(batchTexts);
    console.log(`✓ Generated ${batchEmbeddings.length} embeddings in batch`);
  } catch (error) {
    console.error('✗ Error generating embeddings:', error);
    return false;
  }

  return true;
}

async function testSemanticSearch() {
  console.log('\n========================================');
  console.log('3. Testing Semantic Search');
  console.log('========================================');

  try {
    const query = 'What are my best trading strategies?';
    console.log(`Query: "${query}"`);

    const results = await semanticSearch(TEST_USER_ID, query, {
      limit: 5,
      threshold: 0.5,
    });

    if (results.length > 0) {
      console.log(`✓ Found ${results.length} results`);
      results.forEach((result, idx) => {
        const similarity = (result.similarity * 100).toFixed(1);
        console.log(`\n  Result ${idx + 1}:`);
        console.log(`    Type: ${result.sourceType}`);
        console.log(`    Similarity: ${similarity}%`);
        console.log(`    Symbol: ${result.symbol || 'N/A'}`);
        console.log(`    Content: ${result.contentText.substring(0, 100)}...`);
      });
    } else {
      console.log('  No results found (this is normal if no embeddings exist yet)');
    }
  } catch (error) {
    console.error('✗ Error in semantic search:', error);
    return false;
  }

  return true;
}

async function testKeywordSearch() {
  console.log('\n========================================');
  console.log('4. Testing Keyword Search');
  console.log('========================================');

  try {
    const query = 'AAPL trading';
    console.log(`Query: "${query}"`);

    const results = await keywordSearch(TEST_USER_ID, query, {
      limit: 5,
    });

    if (results.length > 0) {
      console.log(`✓ Found ${results.length} results`);
      results.forEach((result, idx) => {
        console.log(`\n  Result ${idx + 1}:`);
        console.log(`    Type: ${result.sourceType}`);
        console.log(`    Symbol: ${result.symbol || 'N/A'}`);
        console.log(`    Content: ${result.contentText.substring(0, 100)}...`);
      });
    } else {
      console.log('  No results found (this is normal if no embeddings exist yet)');
    }
  } catch (error) {
    console.error('✗ Error in keyword search:', error);
    return false;
  }

  return true;
}

async function testHybridSearch() {
  console.log('\n========================================');
  console.log('5. Testing Hybrid Search (RRF)');
  console.log('========================================');

  try {
    const query = 'momentum trading strategy';
    console.log(`Query: "${query}"`);

    const results = await hybridSearch(TEST_USER_ID, query, {
      limit: 5,
      threshold: 0.6,
    });

    if (results.length > 0) {
      console.log(`✓ Found ${results.length} results (merged from semantic + keyword)`);
      results.forEach((result, idx) => {
        const similarity = result.similarity > 0
          ? `${(result.similarity * 100).toFixed(1)}%`
          : 'N/A (keyword only)';
        console.log(`\n  Result ${idx + 1}:`);
        console.log(`    Type: ${result.sourceType}`);
        console.log(`    Similarity: ${similarity}`);
        console.log(`    Symbol: ${result.symbol || 'N/A'}`);
        console.log(`    Content: ${result.contentText.substring(0, 100)}...`);
      });
    } else {
      console.log('  No results found (this is normal if no embeddings exist yet)');
    }
  } catch (error) {
    console.error('✗ Error in hybrid search:', error);
    return false;
  }

  return true;
}

async function testRAGContextBuilder() {
  console.log('\n========================================');
  console.log('6. Testing RAG Context Builder');
  console.log('========================================');

  try {
    const query = 'What lessons have I learned from my trades?';
    console.log(`Query: "${query}"`);

    const context = await buildRAGContext(TEST_USER_ID, query, {
      maxTokens: 2000,
      threshold: 0.6,
    });

    console.log(`✓ Built RAG context`);
    console.log(`  Sources: ${context.sources.length}`);
    console.log(`  Token estimate: ${context.tokenEstimate}`);

    if (context.sources.length > 0) {
      console.log('\n  Context preview:');
      console.log('  ' + '-'.repeat(50));
      console.log(context.contextText.substring(0, 500));
      if (context.contextText.length > 500) {
        console.log('  ...(truncated)...');
      }
      console.log('  ' + '-'.repeat(50));
    } else {
      console.log('  (No context generated - no embeddings found)');
    }
  } catch (error) {
    console.error('✗ Error building RAG context:', error);
    return false;
  }

  return true;
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  DeepStack Retrieval Service Test     ║');
  console.log('╚════════════════════════════════════════╝');

  // Check for user ID
  if (TEST_USER_ID === 'replace-with-valid-uuid') {
    console.log('\n⚠️  Warning: Using placeholder user ID');
    console.log('   Set TEST_USER_ID environment variable to test with real data');
    console.log('   Example: TEST_USER_ID="your-uuid" npx tsx scripts/test-retrieval.ts\n');
  }

  const results = [];

  // Run tests
  results.push(await testOllamaConnection());
  if (!results[0]) {
    console.log('\n✗ Ollama connection failed. Cannot proceed with other tests.');
    process.exit(1);
  }

  results.push(await testEmbeddingGeneration());
  results.push(await testSemanticSearch());
  results.push(await testKeywordSearch());
  results.push(await testHybridSearch());
  results.push(await testRAGContextBuilder());

  // Summary
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log(`Tests passed: ${passed}/${total}`);

  if (passed === total) {
    console.log('\n✓ All tests passed!');
  } else {
    console.log('\n✗ Some tests failed. Check the output above for details.');
  }

  console.log('\n');
}

main().catch(console.error);
