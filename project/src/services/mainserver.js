import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173', // Your Vite frontend URL
  credentials: true
}));

app.use(express.json());

// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Chat route
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'OR-CALLER-ID': 'http://localhost:3000'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant specialized in knowledge graphs and coding.'
          },
          { role: 'user', content: message }
        ]
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});