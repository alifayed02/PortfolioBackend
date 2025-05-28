import OpenAI from 'openai';
import dotenv from 'dotenv';
import ragService from '../services/rag_service.js';

dotenv.config();

const client = new OpenAI();

export async function chat(req, res) {
    const history = req.body.history || '';
    const query = req.body.query;

    if (!query) {
        return res.status(400).json({
            success: false,
            response: 'Query is required',
        });
    }

    try {
        // Use RAG to retrieve relevant context from the resume
        const context = await ragService.searchSimilarContent(query);

        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful assistant that is eager to provide more information and help. You will be given a resume as context and will need to answer questions in detail regarding that resume. You will always respond in the first person as if you are the person whose resume it is." },
                { role: "user", content: `Answer the following question using only the context below.
                    <Chat History>
                    ${history}
                    </Chat History>

                    <Context>
                    ${context}
                    </Context>

                    <Question>
                    ${query}
                    </Question>
                    `
                },
            ],
        });

        res.status(200).json({
            success: true,
            response: response.choices[0].message.content,
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            success: false,
            response: error.message,
        });
    }
}

export async function rebuildVectorStore(req, res) {
    try {
        await ragService.rebuildVectorStore();
        res.status(200).json({
            success: true,
            message: 'Vector store rebuilt successfully',
        });
    } catch (error) {
        console.error('Rebuild error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}