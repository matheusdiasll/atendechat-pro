import https from "https";
import { URL } from "url";
import fs from "fs";
import path from "path";
import Prompt from "../../models/Prompt";

const keyRotationIndex: { [promptId: number]: number } = {};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const makePostRequest = (endpoint: string, body: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(endpoint);
    const dataString = JSON.stringify(body);

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(dataString)
      },
      timeout: 45000
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          return reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout ao conectar com a API do Gemini"));
    });

    req.write(dataString);
    req.end();
  });
};

export const runGemini = async (
  prompt: Prompt,
  messages: ChatMessage[],
  systemInstructionText: string,
  incomingMediaUrl?: string
): Promise<string> => {
  const keys: string[] = [];
  if (prompt.apiKey && prompt.apiKey.trim().length > 0) {
    keys.push(prompt.apiKey.trim());
  }
  if ((prompt as any).apiKey2 && (prompt as any).apiKey2.trim().length > 0) {
    keys.push((prompt as any).apiKey2.trim());
  }

  if (keys.length === 0) {
    throw new Error("Nenhuma chave de API da Google / Gemini configurada no Prompt.");
  }

  // Load balancing (Round-Robin) entre as chaves cadastradas
  if (keyRotationIndex[prompt.id] === undefined) {
    keyRotationIndex[prompt.id] = 0;
  }
  const primaryIndex = keyRotationIndex[prompt.id] % keys.length;
  keyRotationIndex[prompt.id] = (keyRotationIndex[prompt.id] + 1) % keys.length;

  const orderedKeys = [
    keys[primaryIndex],
    ...keys.filter((_, idx) => idx !== primaryIndex)
  ];

  const model = (prompt as any).model || "gemini-3.8-flash";

  // Prepara anexos (PDF de Base de Conhecimento e/ou Áudio de voz)
  const contextParts: any[] = [];

  // 1. Base de Conhecimento em PDF
  const knowledgePdfName = (prompt as any).knowledgePdf;
  if (knowledgePdfName) {
    const possiblePaths = [
      path.resolve(__dirname, "..", "..", "..", "public", "prompts", knowledgePdfName),
      path.resolve(__dirname, "..", "..", "..", "public", knowledgePdfName)
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          const pdfBuffer = fs.readFileSync(p);
          contextParts.push({
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBuffer.toString("base64")
            }
          });
          break;
        } catch (err) {
          console.error("[GeminiService] Erro ao carregar PDF de conhecimento:", err);
        }
      }
    }
  }

  // 2. Mensagem de áudio recebida do cliente (compreensão nativa de voz pelo Gemini 3.8)
  if (incomingMediaUrl && fs.existsSync(incomingMediaUrl)) {
    try {
      const audioBuffer = fs.readFileSync(incomingMediaUrl);
      const ext = path.extname(incomingMediaUrl).toLowerCase();
      let mimeType = "audio/ogg";
      if (ext === ".mp3") mimeType = "audio/mp3";
      else if (ext === ".wav") mimeType = "audio/wav";
      else if (ext === ".m4a") mimeType = "audio/m4a";

      contextParts.push({
        inlineData: {
          mimeType,
          data: audioBuffer.toString("base64")
        }
      });
    } catch (err) {
      console.error("[GeminiService] Erro ao carregar áudio para Gemini:", err);
    }
  }

  // Monta o histórico no formato oficial do Gemini API
  const contents: any[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    });
  }

  // Se tiver PDF ou Áudio, injeta no primeiro item de usuário
  if (contextParts.length > 0) {
    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      contents[contents.length - 1].parts = [
        ...contextParts,
        ...contents[contents.length - 1].parts
      ];
    } else {
      contents.unshift({
        role: "user",
        parts: [
          ...contextParts,
          { text: "Considere os documentos e áudios anexos como contexto para responder ao cliente." }
        ]
      });
    }
  }

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstructionText }]
    },
    contents,
    generationConfig: {
      maxOutputTokens: prompt.maxTokens || 2048,
      temperature: prompt.temperature ?? 0.7
    }
  };

  // Tenta executar com failover automático entre as chaves
  let lastError: any = null;
  for (let k = 0; k < orderedKeys.length; k++) {
    const currentKey = orderedKeys[k];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;

    try {
      const responseData = await makePostRequest(endpoint, payload);
      const candidateText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText && candidateText.trim().length > 0) {
        return candidateText.trim();
      }
    } catch (error: any) {
      console.warn(
        `[GeminiService] Falha na Chave ${k + 1} (${currentKey.substring(0, 8)}...): ${error.message}. Tentando próxima chave se disponível...`
      );
      lastError = error;
    }
  }

  throw lastError || new Error("Falha ao gerar resposta através do Gemini.");
};
