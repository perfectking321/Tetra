interface ChatResponse {
  content: string;
  modelUsed: string;
}

interface GraphData {
  nodes: any[];
  edges: any[];
}

export const sendChatMessage = async (
  message: string, 
  currentGraph?: GraphData
): Promise<ChatResponse> => {
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message,
        currentGraph 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !Array.isArray(data.choices) || !data.choices[0]?.message?.content) {
      throw new Error(data.error?.message || 'No response from LLM.');
    }

    return {
      content: data.choices[0].message.content.trim(),
      modelUsed: 'GPT-3.5 Turbo'
    };
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to connect to backend');
  }
};

export const getCohereEmbedding = async (text: string): Promise<number[]> => {
  const response = await fetch('https://api.cohere.ai/v1/embed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer zkkPSz9GgjKX1ncZGAxLBdSgIm1zkPnIhIw4DwRD',
    },
    body: JSON.stringify({
      texts: [text],
      model: 'embed-english-v3.0',
      input_type: 'search_document',
      truncate: 'END'
    })
  });
  if (!response.ok) {
    throw new Error('Failed to fetch embedding from Cohere');
  }
  const data = await response.json();
  return data.embeddings[0];
};