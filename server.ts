import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json());

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey || '' });

  // API endpoint for AI chat in OGroup AI Factory gates
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, gate, mode, projectContext } = req.body;
      
      const gateNames = ['Requirements', 'Design', 'Development', 'Quality Assurance', 'Delivery'];
      const currentGateName = gateNames[gate - 1] || 'General';
      
      const systemInstruction = `You are the lead AI Architect and Engineering Director at OGroup AI Factory. 
You are guiding the user through Gate ${gate} (${currentGateName}) for their software project "${projectContext?.name || 'Untitled'}".
The project mode is "${mode === 'managed' ? 'BUILD FOR ME (100 JOD)' : 'BUILD WITH MY AI (50 JOD Sub)'}".
Be professional, concise, encouraging, and focused on helping them refine requirements, review design mockups, inspect generated code, review QA test reports, or download their delivery package. Respond in a supportive, expert software engineering tone.`;

      if (!apiKey) {
        return res.json({
          reply: `[AI Assistant Ready] I have noted your notes on Gate ${gate} (${currentGateName}): "${message}". Review the live artifact on the right and click "Approve & Advance" when ready.`
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ reply: response.text || "Let's proceed to the next gate once you approve the artifact." });
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      res.status(500).json({ error: error.message || 'AI generation failed' });
    }
  });

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`OGroup AI Factory server running at http://localhost:${port}`);
  });
}

startServer();
