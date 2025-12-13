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

  const websiteContext = website 
    ? `CONTEXT: The user owns the website "${website}". You must check if this site has content relevant to the keywords.` 
    : "";

  const websiteSearchInstruction = website
    ? `4. **Site Performance**: Search for "site:${website} ${keywords.split('\n')[0].split(',')[0]}..." to check indexing/ranking visibility.`
    : "";

  // Constructed prompt to force tool usage and structure
  const prompt = `
    Role: Senior SEO Data Scientist.
    Task: Conduct a deep-dive keyword analysis for: "${keywords.replace(/\n/g, ', ')}" in location: "${location}".
    ${websiteContext}

    OBJECTIVE:
    Provide ACCURATE, REAL-WORLD data using 'googleSearch'. 
    
    SEARCH INSTRUCTIONS:
    1.  **Volume & Stats**: Search for "[keyword] search volume range 2024", "[keyword] monthly searches ${location}".
    2.  **Competition**: Search for "[keyword] keyword difficulty".
    3.  **Alternatives**: Look for "better keywords for [keyword]" or "related long-tail keywords for [keyword]".
    ${websiteSearchInstruction}

    DATA EXTRACTION RULES:
    - **Search Volume**: Priority: Specific numbers. Fallback: Ranges (e.g., "1K–10K"). 
    - **Tail Type**: Classify as 'Short-tail' (1-2 words, broad) or 'Long-tail' (3+ words, specific).
    - **Quick Win**: Set 'isQuickWin' to true ONLY if volume is decent (e.g. >500) AND competition is Low/Medium.
    - **Alternatives**: Provide exactly 5 BETTER alternative keywords. For EACH alternative, you MUST provide its estimated Volume and Competition.
    ${website ? '- **Site Audit**: If the website was provided, estimate current performance (e.g., "Indexed", "Not found", "Low relevance content"). If no website, leave null.' : ''}

    OUTPUT FORMAT:
    Return a strictly valid JSON array of objects, followed by a text summary.

    JSON SCHEMA:
    [
      {
        "keyword": "string",
        "searchVolume": "string (e.g., '12,500', '1k-10k')",
        "competition": "string (Low, Medium, High)",
        "difficulty": "string (e.g., '45/100', 'Hard')",
        "keywordType": "string (Short-tail or Long-tail)",
        "isQuickWin": boolean,
        "siteAudit": "string (Optional)",
        "recommendation": "string (Actionable advice)",
        "rationale": "string (Why this recommendation?)",
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

    After the JSON, provide a "Market Insights" summary.
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

    const parsedMetrics = parseJSONFromMarkdown(text);
    
    // Fallback summary extraction
    let summary = "Analysis completed.";
    const jsonBlockRegex = /```json\s*[\s\S]*?\s*```|\[\s*\{[\s\S]*\}\s*\]/;
    const match = text.match(jsonBlockRegex);
    if (match) {
        summary = text.replace(match[0], "").trim();
    } else {
        summary = text;
    }

    if (!summary) summary = "Data parsed successfully. See table below.";

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