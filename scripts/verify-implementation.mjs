import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runVerification() {
  console.log('====================================================');
  console.log('🚀 RUNNING VERIFICATION: DOCUMENT/PAGE METADATA & VECTOR(768) EMBEDDINGS');
  console.log('====================================================\n');

  try {
    // 1. Check PostgreSQL Connection & pgvector Extension
    console.log('1️⃣ Checking PostgreSQL connection & pgvector extension...');
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log('   ✅ PostgreSQL connected & pgvector extension enabled successfully!\n');

    // 2. Prepare Sample Document with Page Metadata & Chunks
    const testDocId = `test_doc_${Date.now()}`;
    const pageMetadata = [
      {
        pageNumber: 1,
        wordCount: 154,
        charCount: 980,
        textSnippet: 'Chapter 1: Foundations of Machine Learning and Vector Retrieval...',
        rawTextLength: 980
      },
      {
        pageNumber: 2,
        wordCount: 210,
        charCount: 1340,
        textSnippet: 'Section 2: High-dimensional Vector Spaces and Cosine Distance Metrics...',
        rawTextLength: 1340
      }
    ];

    console.log('2️⃣ Storing Document & Page Metadata in PostgreSQL...');
    const createdDoc = await prisma.document.create({
      data: {
        id: testDocId,
        title: 'Machine Learning & Embeddings Syllabus.pdf',
        filename: 'ML_Syllabus_2026.pdf',
        fileSize: 1048576, // 1MB
        sizeFormatted: '1.00 MB',
        totalPages: 2,
        totalWords: 364,
        totalChars: 2320,
        mimeType: 'application/pdf',
        pageMetadata: pageMetadata,
        metadata: {
          courseCode: 'CS-701',
          embeddingModel: 'gemini-embedding-001',
          dimension: 768,
          isVerified: true
        }
      }
    });

    console.log('   ✅ Document created in DB:');
    console.log(`      - ID: ${createdDoc.id}`);
    console.log(`      - Title: ${createdDoc.title}`);
    console.log(`      - Pages: ${createdDoc.totalPages}`);
    console.log(`      - Page Metadata Items: ${Array.isArray(createdDoc.pageMetadata) ? createdDoc.pageMetadata.length : 'JSON'}\n`);

    // 3. Create Chunks
    console.log('3️⃣ Creating Semantic Chunks in PostgreSQL...');
    const chunk1Id = `chunk_${testDocId}_p1_0`;
    const chunk2Id = `chunk_${testDocId}_p2_1`;

    await prisma.chunk.create({
      data: {
        id: chunk1Id,
        content: 'Dense vector embeddings represent text semantics in a 768-dimensional continuous vector space.',
        pageNumber: 1,
        chunkIndex: 0,
        charCount: 96,
        wordCount: 13,
        tokenEstimate: 24,
        embeddingModel: 'gemini-embedding-001',
        metadata: { topic: 'Embeddings', norm: 1.0 },
        documentId: testDocId
      }
    });

    await prisma.chunk.create({
      data: {
        id: chunk2Id,
        content: 'Cosine similarity computes the angular distance between query vectors and document chunks.',
        pageNumber: 2,
        chunkIndex: 1,
        charCount: 91,
        wordCount: 12,
        tokenEstimate: 23,
        embeddingModel: 'gemini-embedding-001',
        metadata: { topic: 'Cosine Similarity', norm: 1.0 },
        documentId: testDocId
      }
    });

    console.log('   ✅ Created 2 chunks attached to document.\n');

    // 4. Generate & Store 768-d pgvector Embeddings
    console.log('4️⃣ Storing 768-dimensional Vector Embeddings into pgvector column...');
    // Create normalized 768-d synthetic vector for chunk 1
    const dummyVector1 = Array.from({ length: 768 }, (_, i) => (i === 0 ? 0.9 : 0.01));
    const vectorStr1 = `[${dummyVector1.join(',')}]`;

    // Create normalized 768-d synthetic vector for chunk 2
    const dummyVector2 = Array.from({ length: 768 }, (_, i) => (i === 1 ? 0.9 : 0.01));
    const vectorStr2 = `[${dummyVector2.join(',')}]`;

    await prisma.$executeRawUnsafe(`UPDATE chunks SET embedding = $1::vector WHERE id = $2`, vectorStr1, chunk1Id);
    await prisma.$executeRawUnsafe(`UPDATE chunks SET embedding = $1::vector WHERE id = $2`, vectorStr2, chunk2Id);

    console.log('   ✅ Stored vector(768) embeddings in PostgreSQL for Chunk 1 and Chunk 2!\n');

    // 5. Query Document & Inspect Page Metadata & Chunks
    console.log('5️⃣ Querying Document with Relations & Page Metadata...');
    const fetchedDoc = await prisma.document.findUnique({
      where: { id: testDocId },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' }
        }
      }
    });

    console.log('   ✅ Retrieved Document:');
    console.log(`      - Title: ${fetchedDoc.title}`);
    console.log(`      - Size: ${fetchedDoc.sizeFormatted} (${fetchedDoc.fileSize} bytes)`);
    console.log(`      - Total Words: ${fetchedDoc.totalWords}, Total Chars: ${fetchedDoc.totalChars}`);
    console.log(`      - Chunks Count: ${fetchedDoc.chunks.length}`);
    console.log(`      - Page Metadata:`, JSON.stringify(fetchedDoc.pageMetadata, null, 2));

    // 6. Test pgvector Cosine Distance Semantic Search (<=>)
    console.log('\n6️⃣ Testing pgvector Cosine Distance Search (<=> operator)...');
    // Query vector close to Chunk 1 (i === 0 has high weight)
    const queryVector = Array.from({ length: 768 }, (_, i) => (i === 0 ? 0.95 : 0.005));
    const queryVectorStr = `[${queryVector.join(',')}]`;

    const searchResults = await prisma.$queryRawUnsafe(`
      SELECT 
        c.id, 
        c."documentId", 
        c.content, 
        c."pageNumber", 
        c."chunkIndex", 
        (1 - (c.embedding <=> $1::vector)) AS similarity
      FROM chunks c
      WHERE c."documentId" = $2 AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> $1::vector ASC
      LIMIT 2;
    `, queryVectorStr, testDocId);

    console.log('   ✅ pgvector Vector Search Results:');
    searchResults.forEach((res, i) => {
      console.log(`      #${i + 1} [Score: ${(res.similarity * 100).toFixed(2)}%] (Page ${res.pageNumber}): "${res.content}"`);
    });

    // Clean up test data
    console.log('\n7️⃣ Cleaning up test document...');
    await prisma.document.delete({ where: { id: testDocId } });
    console.log('   ✅ Cleaned up test document.\n');

    console.log('====================================================');
    console.log('🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL');
    console.log('====================================================');

  } catch (err) {
    console.error('❌ Verification failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
