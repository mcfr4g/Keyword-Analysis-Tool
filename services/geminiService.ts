import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, KeywordMetric } from "../types";

const parseJSONFromMarkdown = (text: string): any => {
  try {
    // 1. Try finding a JSON code block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }

    // 2. Try finding the outer-most array brackets
    const firstOpen = text.indexOf('[');
    const lastClose = text.lastIndexOf(']');
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      const candidate = text.substring(firstOpen, lastClose + 1);
      return JSON.parse(candidate);
    }
  } catch (e) {
    console.warn("Failed to parse JSON response:", e);
  }
  return null;
};

export const analyzeKeywords = async (
  keywords: string,
  location: string,
  website?: string
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Calculate actual keyword count to force the model to match it
  const keywordList = keywords.split(/,|\n/).map(k => k.trim()).filter(k => k.length > 0);
  const keywordCount = keywordList.length;
  const keywordString = keywordList.join(', ');

  const websiteContext = website 
    ? `CONTEXT: The user owns the website "${website}". You must check if this site has content relevant to the keywords.` 
    : "";

  const websiteSearchInstruction = website
    ? `5. **Site Performance**: Search for "site:${website} ${keywordList[0]}..." to check indexing/ranking visibility.`
    : "";

  // Constructed prompt to force tool usage and structure
  const prompt = `
    Role: Senior SEO Data Scientist.
    Task: Conduct a deep-dive keyword analysis for the following ${keywordCount} keywords: "${keywordString}" in target location: "${location}".
    ${websiteContext}

    OBJECTIVE:
    Provide ACCURATE, REAL-WORLD volume data using 'googleSearch'. You must cross-reference multiple search results to find the most reliable numbers.
    
    CRITICAL INSTRUCTION:
    You have received exactly ${keywordCount} keywords. You MUST return a JSON array containing exactly ${keywordCount} objects.

    SEARCH INSTRUCTIONS (Execute these searches):
    1.  **Volume Discovery**: 
        - Search for "[keyword] search volume ${location} 2024" and "[keyword] monthly searches stats".
        - Search for "keyword planner data for [keyword]".
        - If ${location} is a specific city and no data is found, try searching for the broader country volume and note it (e.g., "10k (US)").
    2.  **Competition Analysis**: Search for "[keyword] keyword difficulty" or "[keyword] SEO competition".
    3.  **Alternatives**: Look for "better keywords for [keyword]" or "related long-tail keywords for [keyword]". Find at least 10 high-quality alternatives.
    4.  **SERP Analysis**: Search for the exact keyword "[keyword]" to see current top ranking pages.
    ${websiteSearchInstruction}

    DATA EXTRACTION RULES:
    - **Search Volume**: 
      - LOOK FOR NUMBERS. Examples: "12,100", "10k-100k", "500/mo".
      - **NO HALLUCINATIONS**: It is IMPERATIVE that you do not invent numbers. If you cannot find volume data in the search snippets after multiple attempts, set "searchVolume" to "Data Unavailable". 
    - **Tail Type**: Classify as 'Short-tail' (1-2 words, broad) or 'Long-tail' (3+ words, specific).
    - **Quick Win**: Set 'isQuickWin' to true ONLY if volume is decent (e.g. >500) AND competition is Low/Medium.
    - **Alternatives**: Provide exactly 10 BETTER alternative keywords. For EACH, provide estimated Volume, Competition, and "Why Better" (e.g., "Higher Intent").
    - **SERP Results**: List Top 10 organic search results. Include Title, URL, and snippet.

    OUTPUT STRUCTURE:
    1. "## Market Insights": Plain text summary of opportunity, competition, and top recommendations.
    2. Separator: ---JSON_START---
    3. JSON: The strictly valid JSON array.

    JSON SCHEMA:
    [
      {
        "keyword": "string",
        "searchVolume": "string (e.g., '12,500', '1k-10k' or 'Data Unavailable')",
        "competition": "string (Low, Medium, High)",
        "difficulty": "string (e.g., '45/100', 'Hard')",
        "keywordType": "string (Short-tail | Long-tail)",
        "isQuickWin": boolean,
        "siteAudit": "string (Optional)",
        "recommendation": "string",
        "rationale": "string",
        "serpResults": [ { "position": 1, "title": "string", "url": "string", "snippet": "string" } ],
        "relatedKeywords": [
           {
             "keyword": "string",
             "searchVolume": "string",
             "competition": "string",
             "keywordType": "string",
             "whyBetter": "string"
           }
        ]
      }
    ]
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Split logic to cleanly separate summary from JSON
    const separator = "---JSON_START---";
    const parts = text.split(separator);
    
    let summary = "";
    let jsonPart = "";

    if (parts.length >= 2) {
        summary = parts[0].replace(/## Market Insights/i, "").trim();
        jsonPart = parts[1];
    } else {
        // Fallback if model forgot separator
        console.warn("Separator not found, attempting fallback parse.");
        jsonPart = text;
        summary = "Analysis loaded. See details below.";
    }

    const parsedMetrics = parseJSONFromMarkdown(jsonPart);

    if (!parsedMetrics && !text) {
        throw new Error("The AI model returned no content. Please try again.");
    }
    
    const metrics = Array.isArray(parsedMetrics) ? parsedMetrics : [];

    return {
      metrics,
      summary,
      groundingChunks: groundingChunks as any[],
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const errorMessage = error.message || "An unknown error occurred.";
    if (errorMessage.includes("safety")) {
        throw new Error("Request blocked by safety filters. Try less sensitive keywords.");
    }
    throw new Error(`Analysis failed: ${errorMessage}`);
  }
};
