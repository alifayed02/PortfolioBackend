import { OpenAIEmbeddings } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pdfParse = null;
try {
    const pdfParseModule = await import('pdf-parse');
    pdfParse = pdfParseModule.default;
} catch (error) {
    console.warn('PDF parsing not available:', error.message);
}

class RAGService {
    constructor() {
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "text-embedding-3-small"
        });
        this.vectorStore = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            const vectorStorePath = path.join(__dirname, '../data/vector_store');
            if (fs.existsSync(vectorStorePath)) {
                console.log('Loading existing vector store...');
                this.vectorStore = await FaissStore.load(vectorStorePath, this.embeddings);
                this.isInitialized = true;
                console.log('Vector store loaded successfully');
                return;
            }

            await this.createVectorStore();
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing RAG service:', error);
            throw error;
        }
    }

    async createVectorStore() {
        console.log('Creating new vector store from resume...');
        
        const dataDir = path.join(__dirname, '../data');
        
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const allFiles = fs.readdirSync(dataDir);
        const resumeFiles = allFiles.filter(file => 
            file.toLowerCase().includes('resume') && 
            (file.endsWith('.txt') || file.endsWith('.pdf'))
        );

        resumeFiles.sort((a, b) => {
            if (a.endsWith('.txt') && b.endsWith('.pdf')) return -1;
            if (a.endsWith('.pdf') && b.endsWith('.txt')) return 1;
            return 0;
        });

        if (resumeFiles.length === 0) {
            throw new Error(`No resume file found in src/data directory. Please add a resume.txt or resume.pdf file.
Available files: ${allFiles.join(', ')}`);
        }

        const resumeFile = resumeFiles[0];
        const resumePath = path.join(dataDir, resumeFile);
        
        let resumeText;
        
        if (resumeFile.endsWith('.pdf')) {
            if (!pdfParse) {
                throw new Error('PDF parsing is not available. Please use a .txt file instead or fix the PDF parsing dependency.');
            }
            
            try {
                const dataBuffer = fs.readFileSync(resumePath);
                const pdfData = await pdfParse(dataBuffer);
                resumeText = pdfData.text;
            } catch (pdfError) {
                console.error('Error parsing PDF:', pdfError);
                throw new Error(`Failed to parse PDF file. Please convert your resume to a .txt file or fix the PDF parsing issue. Error: ${pdfError.message}`);
            }
        } else {
            resumeText = fs.readFileSync(resumePath, 'utf-8');
        }

        if (!resumeText || resumeText.trim().length === 0) {
            throw new Error('Resume file is empty or could not be read.');
        }

        // Split the text into chunks
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const docs = await textSplitter.createDocuments([resumeText]);

        if (docs.length === 0) {
            throw new Error('No text chunks could be created from the resume.');
        }

        this.vectorStore = await FaissStore.fromDocuments(docs, this.embeddings);

        const vectorStorePath = path.join(__dirname, '../data/vector_store');
        await this.vectorStore.save(vectorStorePath);
        
        console.log(`Vector store created and saved with ${docs.length} document chunks from ${resumeFile}`);
    }

    async searchSimilarContent(query, k = 3) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.vectorStore) {
            throw new Error('Vector store not initialized');
        }

        try {
            const results = await this.vectorStore.similaritySearch(query, k);
            return results.map(doc => doc.pageContent).join('\n\n');
        } catch (error) {
            console.error('Error searching similar content:', error);
            throw error;
        }
    }

    async rebuildVectorStore() {
        console.log('Rebuilding vector store...');
        
        const vectorStorePath = path.join(__dirname, '../data/vector_store');
        if (fs.existsSync(vectorStorePath)) {
            fs.rmSync(vectorStorePath, { recursive: true, force: true });
        }

        this.isInitialized = false;
        this.vectorStore = null;
        
        await this.createVectorStore();
        this.isInitialized = true;
        
        console.log('Vector store rebuilt successfully');
    }
}

const ragService = new RAGService();

export default ragService; 