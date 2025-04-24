import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cluster from 'cluster';
import os from 'os';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5175'
  ], // Allow both ports for Vite frontend
  credentials: true
}));

app.use(express.json());

// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Enhanced system prompt for conversational responses
const SYSTEM_PROMPT = `You are a helpful, conversational AI assistant. Answer user questions naturally and helpfully. Do not mention knowledge graphs, nodes, or internal data structures unless the user specifically asks about them.`;

// Chat route for GET
app.get('/api/chat', (req, res) => {
  res.json({ message: 'This endpoint only supports POST requests for chat. Please use POST with a JSON body.' });
});

// Chat route for POST
app.post('/api/chat', async (req, res) => {
  try {
    const { message, currentGraph } = req.body;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'OR-CALLER-ID': 'http://localhost:3000'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo', // Use a free/creditless model if available
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          { 
            role: 'user', 
            content: message
          }
        ]
      })
    });

    const data = await response.json();
    if (!data.choices?.[0]?.message) {
      throw new Error('Invalid response from AI service');
    }
    // Do NOT throw if the response is missing
    const aiResponse = data.choices?.[0]?.message?.content || '';
    res.json({
      choices: [{
        message: {
          content: aiResponse,
          role: 'assistant'
        }
      }]
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: {
        message: error instanceof Error ? error.message : 'Failed to process request'
      } 
    });
  }
});

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Primary process ${process.pid} is running. Spawning ${numCPUs} workers...`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Spawning a new worker...`);
    cluster.fork();
  });
} else {
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} running server on http://localhost:${PORT}`);
  });
}