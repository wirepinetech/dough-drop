exports.handler = async (event) => {
  // 1. Setup CORS headers so your kids can call this from anywhere
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // 2. Handle the invisible "Preflight" request browsers send
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'OK' };
  }

  // 3. Only allow actual POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  // 4. Grab the API key from your Netlify Environment Variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ error: { message: "GEMINI_API_KEY environment variable is missing in Netlify." } }) 
    };
  }

  try {
    const payload = JSON.parse(event.body);
    const { action, query, system, prompt } = payload;

    let apiUrl = '';
    let requestBody = {};

    if (action === 'image') {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
      requestBody = {
        instances: [{ prompt: prompt }],
        parameters: { sampleCount: 1 }
      };
    } else {
      // THE FIX: Using the standard, stable model name
      const chef = (system || '').includes('Gordon') ? 'Gordon' : (system || '').includes('Jacques') ? 'Jacques' : 'Fieri';
      console.log(`[dough-drop] roast request chef=${chef} ts=${new Date().toISOString()}`);
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      requestBody = {
        contents: [{ parts: [{ text: query }] }],
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: { type: "OBJECT", properties: { critique: { type: "STRING" }, score: { type: "NUMBER" } } },
          thinkingConfig: { thinkingBudget: 0 }
        }
      };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error("Proxy Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: { message: "Internal server error connecting to Google API." } })
    };
  }
};