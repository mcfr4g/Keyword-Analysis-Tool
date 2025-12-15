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
  apiKey: string,
  keywords: string,
  location: string,
  website?: string
): Promise<AnalysisResult> => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

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
    Task: Conduct a deep-dive keyword analysis for the following ${keywordCount} keywords: "${keywordString}" in location: "${location}".
    ${websiteContext}

    OBJECTIVE:
    Provide ACCURATE, REAL-WORLD data using 'googleSearch'. 
    
    CRITICAL INSTRUCTION:
    You have received exactly ${keywordCount} keywords. You MUST return a JSON array containing exactly ${keywordCount} objects. Do not combine them. Do not skip any.

    SEARCH INSTRUCTIONS:
    1.  **Volume & Stats**: Search for "[keyword] search volume range 2024", "[keyword] monthly searches ${location}".
    2.  **Competition**: Search for "[keyword] keyword difficulty".
    3.  **Alternatives**: Look for "better keywords for [keyword]" or "related long-tail keywords for [keyword]".
    4.  **SERP Analysis**: Search for the exact keyword "[keyword]" to see the current top ranking pages.
    ${websiteSearchInstruction}

    DATA EXTRACTION RULES:
    - **Search Volume**: Priority: Specific numbers. Fallback: Ranges (e.g., "1K–10K"). 
    - **Tail Type**: Classify as 'Short-tail' (1-2 words, broad) or 'Long-tail' (3+ words, specific).
    - **Quick Win**: Set 'isQuickWin' to true ONLY if volume is decent (e.g. >500) AND competition is Low/Medium.
    - **Alternatives**: Provide exactly 5 BETTER alternative keywords. For EACH alternative, you MUST provide its estimated Volume and Competition.
    - **SERP Results**: List the Top 10 organic search results found for the keyword. Include Title, URL, and a brief snippet.
    ${website ? '- **Site Audit**: If the website was provided, estimate current performance (e.g., "Indexed", "Not found", "Low relevance content"). If no website, leave null.' : ''}

    OUTPUT STRUCTURE:
    1. First, provide a "## Market Insights" section. This must be plain text. Summarize the overall opportunity, competition levels, and top recommendations. Do NOT put JSON here.
    2. Then, output this exact separator string on a new line: ---JSON_START---
    3. Finally, output the strictly valid JSON array containing the data for ALL ${keywordCount} keywords.

    JSON SCHEMA (for the part after the separator):
    [
      {
        "keyword": "string (The input keyword)",
        "searchVolume": "string (e.g., '12,500', '1k-10k')",
        "competition": "string (Low, Medium, High)",
        "difficulty": "string (e.g., '45/100', 'Hard')",
        "keywordType": "string (Short-tail or Long-tail)",
        "isQuickWin": boolean,
        "siteAudit": "string (Optional)",
        "recommendation": "string (Actionable advice)",
        "rationale": "string (Why this recommendation?)",
        "serpResults": [
            { "position": 1, "title": "string", "url": "string", "snippet": "string" }
        ],
        "relatedKeywords": [
           {
             "keyword": "string",
             "searchVolume": "string",
             "competition": "string",
             "keywordType": "string (Short-tail | Long-tail)"
           }
        ]
      }
    ]
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
        throw new Error("The AI model returned no content.");
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