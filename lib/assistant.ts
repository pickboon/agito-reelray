import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL,
    });
  }
  return client;
}

export async function callAssistant(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const openai = getClient();
  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function callAssistantJSON<T>(
  systemPrompt: string,
  userPrompt: string
): Promise<T> {
  const openai = getClient();
  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt + "\n\nRespond with valid JSON only." },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });
  const content = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as T;
}
