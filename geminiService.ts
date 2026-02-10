
import { GoogleGenAI, Type } from "@google/genai";
import { Column, DataIssue, Insight } from "./types";

const ai = new GoogleGenAI({ apiKey: "AIzaSyCUSdtZutIyP9eDQc4pbrtgMexinWiGNOE" });

export async function profileData(csvSample: string, fileName: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this CSV sample from file "${fileName}".
    Provide a data profile, issues, and executive summary.
    IMPORTANT: For "detected_type", you MUST use exactly one of these lowercase strings: "numeric", "categorical", "date", or "text".
    
    CSV Sample:
    ${csvSample}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          columns: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                detected_type: { type: Type.STRING, description: 'One of: numeric, categorical, date, text' },
                missing_pct: { type: Type.NUMBER },
                unique_pct: { type: Type.NUMBER },
                sample_values: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["id", "name", "detected_type", "missing_pct", "unique_pct"]
            }
          },
          issues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                column_id: { type: Type.STRING },
                column_name: { type: Type.STRING },
                issue_type: { type: Type.STRING },
                severity: { type: Type.STRING },
                description: { type: Type.STRING },
                suggested_fix: { type: Type.STRING }
              },
              required: ["id", "column_id", "issue_type", "severity", "description", "suggested_fix"]
            }
          }
        },
        required: ["summary", "columns", "issues"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateInsights(datasetInfo: any, intent: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on this data profile, generate as many deep business insights as possible. 
    Do not limit the output; explore every potential correlation, hidden trend, segment anomaly, and strategic opportunity found in the metadata and sample values.
    
    Intent: ${intent}
    Profile: ${JSON.stringify(datasetInfo)}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            statement: { type: Type.STRING },
            type: { type: Type.STRING },
            rank_score: { type: Type.NUMBER },
            confidence_score: { type: Type.NUMBER },
            soft_suggestion: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["id", "statement", "type", "rank_score", "confidence_score", "explanation"]
        }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateExecutiveSummary(insights: Insight[]) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Summarize the following findings into a professional 5-6 line executive summary: ${JSON.stringify(insights)}`,
  });
  return response.text;
}
