/**
 * lib/ingestion/chunker.ts
 *
 * Wraps LangChain's RecursiveCharacterTextSplitter.
 * Returns an array of plain string chunks ready for embedding.
 */

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 50,
  separators: ["\n\n", "\n", " ", ""],
});

/**
 * Split a long text into overlapping chunks.
 * @param text - Raw extracted text
 * @returns string[] of chunks
 */
export async function chunkText(text: string): Promise<string[]> {
  const docs = await splitter.createDocuments([text]);
  return docs.map((doc) => doc.pageContent.trim()).filter((c) => c.length > 0);
}
