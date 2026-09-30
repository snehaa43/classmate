import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

export const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
export const DEFAULT_OUTPUT_DIMENSION = 768;

/**
 * Compute Euclidean Vector Norm (magnitude)
 */
export function computeVectorNorm(vec) {
    if (!vec || !Array.isArray(vec) || vec.length === 0) return 0;
    const sumSq = vec.reduce((sum, val) => sum + val * val, 0);
    return Math.sqrt(sumSq);
}

/**
 * Compute Cosine Similarity between two numerical vectors
 */
export function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        const a = vecA[i];
        const b = vecB[i];
        dotProduct += a * b;
        normA += a * a;
        normB += b * b;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
}

/**
 * Generates an embedding for a single text string using @google/genai
 * @param {string} text - Input text content to embed
 * @param {object} [options]
 * @returns {Promise<number[]>} Array of floating point embedding values
 */
export async function generateEmbedding(text, options = {}) {
    if (!text || typeof text !== "string" || text.trim().length === 0) {
        throw new Error("Input text for embedding must be a non-empty string.");
    }

    const model = options.model || DEFAULT_EMBEDDING_MODEL;
    const outputDimensionality = options.outputDimensionality || DEFAULT_OUTPUT_DIMENSION;

    const response = await ai.models.embedContent({
        model,
        contents: text.trim(),
        config: {
            outputDimensionality,
        },
    });

    const values =
        response.embedding?.values ||
        (response.embeddings && response.embeddings[0]?.values) ||
        [];

    if (!values || values.length === 0) {
        throw new Error("No embedding values returned from Gemini API response.");
    }

    return values;
}

/**
 * Generates embeddings in batches for multiple text items
 * @param {string[]} texts - Array of string contents
 * @param {object} [options]
 * @returns {Promise<number[][]>} Array of embedding vector arrays
 */
export async function generateBatchEmbeddings(texts, options = {}) {
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
        return [];
    }

    const model = options.model || DEFAULT_EMBEDDING_MODEL;
    const outputDimensionality = options.outputDimensionality || DEFAULT_OUTPUT_DIMENSION;
    const batchSize = Math.max(1, Math.min(options.batchSize || 20, 50));
    const allEmbeddings = [];

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize).map((t) => (t || "").trim() || " ");

        try {
            const response = await ai.models.embedContent({
                model,
                contents: batch,
                config: {
                    outputDimensionality,
                },
            });

            if (response.embeddings && Array.isArray(response.embeddings)) {
                for (const item of response.embeddings) {
                    allEmbeddings.push(item.values || []);
                }
            } else if (response.embedding?.values) {
                allEmbeddings.push(response.embedding.values);
            } else {
                for (const itemText of batch) {
                    const single = await generateEmbedding(itemText, { model, outputDimensionality });
                    allEmbeddings.push(single);
                }
            }
        } catch (batchError) {
            console.warn(`[generateBatchEmbeddings] Batch failed: ${batchError.message}. Falling back to sequential...`);
            for (const itemText of batch) {
                try {
                    const single = await generateEmbedding(itemText, { model, outputDimensionality });
                    allEmbeddings.push(single);
                } catch (singleErr) {
                    console.error("[generateBatchEmbeddings] Item error:", singleErr.message);
                    allEmbeddings.push([]);
                }
            }
        }
    }

    return allEmbeddings;
}

/**
 * Connects and embeds PDF chunks extracted from document pages
 * Takes an array of PDF chunks (e.g. from pdfParser / chunker.ts), generates
 * vector embeddings for each chunk's text, and attaches vector metadata.
 *
 * @param {Array<{ id: string|number, text: string, pageNumber?: number, chunkIndex?: number }>} chunks
 * @param {object} [options]
 * @returns {Promise<{
 *   chunks: Array<object>;
 *   totalChunks: number;
 *   dimension: number;
 *   model: string;
 *   success: boolean;
 * }>}
 */
export async function embedChunks(chunks, options = {}) {
    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
        return {
            chunks: [],
            totalChunks: 0,
            dimension: 0,
            model: options.model || DEFAULT_EMBEDDING_MODEL,
            success: true,
        };
    }

    const model = options.model || DEFAULT_EMBEDDING_MODEL;
    const outputDimensionality = options.outputDimensionality || DEFAULT_OUTPUT_DIMENSION;
    const texts = chunks.map((c) => c.text || "");

    const embeddings = await generateBatchEmbeddings(texts, {
        model,
        outputDimensionality,
        batchSize: options.batchSize || 20,
    });

    let detectedDimension = 0;

    const enrichedChunks = chunks.map((chunk, idx) => {
        const embedding = embeddings[idx] || [];
        if (embedding.length > 0 && !detectedDimension) {
            detectedDimension = embedding.length;
        }

        const norm = computeVectorNorm(embedding);

        return {
            ...chunk,
            embedding,
            vectorNorm: norm > 0 ? norm.toFixed(3) : "1.000",
            dimension: embedding.length,
            embeddingModel: model,
            metadata: {
                ...(chunk.metadata || {}),
                embeddedAt: new Date().toISOString(),
                embeddingModel: model,
                dimension: embedding.length,
            },
        };
    });

    return {
        chunks: enrichedChunks,
        totalChunks: enrichedChunks.length,
        dimension: detectedDimension || (enrichedChunks[0]?.embedding?.length ?? 0),
        model,
        success: true,
    };
}

/**
 * Performs semantic vector search over embedded PDF chunks
 * Embeds the user query and computes cosine similarity against all chunks.
 *
 * @param {string} query - User query / question
 * @param {Array<object>} embeddedChunks - Chunks with embedding vectors
 * @param {object} [options]
 * @param {number} [options.topK=3] - Number of top relevant chunks to return
 * @returns {Promise<Array<{
 *   chunk: object;
 *   score: number;
 *   similarityFormatted: string;
 *   rank: number;
 * }>>}
 */
export async function searchPdfChunks(query, embeddedChunks, options = {}) {
    if (!query || typeof query !== "string" || query.trim().length === 0) {
        return [];
    }

    if (!embeddedChunks || !Array.isArray(embeddedChunks) || embeddedChunks.length === 0) {
        return [];
    }

    const topK = options.topK || 3;
    const model = options.model || DEFAULT_EMBEDDING_MODEL;
    const outputDimensionality = options.outputDimensionality || DEFAULT_OUTPUT_DIMENSION;

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query, {
        model,
        outputDimensionality,
    });

    const scoredChunks = [];

    for (let i = 0; i < embeddedChunks.length; i++) {
        const chunk = embeddedChunks[i];
        let score = 0;

        if (chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0) {
            score = cosineSimilarity(queryEmbedding, chunk.embedding);
        } else {
            const qTerms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
            const textLower = (chunk.text || "").toLowerCase();
            const matches = qTerms.filter((term) => textLower.includes(term)).length;
            score = qTerms.length > 0 ? (matches / qTerms.length) * 0.7 : 0.1;
        }

        scoredChunks.push({
            chunk,
            score,
            similarityFormatted: `${(Math.max(0, Math.min(1, score)) * 100).toFixed(1)}%`,
        });
    }

    scoredChunks.sort((a, b) => b.score - a.score);

    return scoredChunks.slice(0, topK).map((item, index) => ({
        ...item,
        rank: index + 1,
    }));
}

export function getGenAIClient() {
    return ai;
}

export function getGeminiApiKey() {
    return process.env.GEMINI_API_KEY || "";
}