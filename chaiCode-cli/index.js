import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { exec } from "node:child_process";
import * as cheerio from "cheerio";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Google API key is not set in environment variables.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey,
});

//response helper functions
function getResponseText(response) {
  const directText = response.text?.trim();

  if (directText) return directText;

  const candidateText = response.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  return candidateText || "";
}
function parseJsonObjects(text) {
  const objects = [];

  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
    }

    if (inString) continue;

    if (char === "{") {
      if (depth === 0) {
        start = i;
      }

      depth++;
    }

    if (char === "}") {
      depth--;

      if (depth === 0 && start !== -1) {
        try {
          const jsonString = text.slice(start, i + 1);
          const parsed = JSON.parse(jsonString);
          objects.push(parsed);
        } catch (error) {
          console.error("Failed parsing JSON block");
        }
      }
    }
  }

  return objects;
}
function cleanJsonText(text) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

function addContinueInstruction(history) {
  history.push({
    role: "user",
    parts: [
      {
        text: `
Continue the reasoning process.

Move to the next required step only.

Do not repeat previous steps.

If webpage information is needed,
use SCRAPE_WEBSITE.
`,
      },
    ],
  });
}
// system prompt
const systemPrompt = `
You are an autonomous AI agent that clones websites.

You must follow this workflow:

START -> THINKING -> TOOL -> OBSERVATION -> THINKING -> OUTPUT

Rules:
- Always think step by step.
- If a URL is provided, ALWAYS use SCRAPE_WEBSITE first.
- Never stop after THINKING.
- After THINKING you MUST:
  - use a TOOL
  - OR generate OUTPUT.
- Never repeat the same tool unnecessarily.
- After enough information is gathered, generate OUTPUT.
- Always respond ONLY in valid JSON.
- You may generate MULTIPLE JSON objects in one response.

Available tools:

1. SCRAPE_WEBSITE
Input: website URL

2. SAVE_TO_FILE
Input: filename|content

3. EXECUTE_COMMAND
Input: shell command

JSON format:

{
  "step":"START | THINKING | TOOL | OBSERVATION | OUTPUT",
  "content":"string",
  "toolname":"string",
  "input":"string"
}

Example:

{
  "step":"THINKING",
  "content":"I should scrape the website first."
}

{
  "step":"TOOL",
  "toolname":"SCRAPE_WEBSITE",
  "input":"https://example.com",
  "content":"Scraping website"
}
`;
// Tools
const scrapeWebsite = async (url) => {
  try {
    const response = await axios.get(url);

    const html = response.data;

    const $ = cheerio.load(html);

    // Title
    const title = $("title").text().trim();

    // Headings
    const headings = [];

    $("h1, h2, h3").each((i, el) => {
      const text = $(el).text().trim();

      if (text) {
        headings.push(text);
      }
    });

    // Buttons
    const buttons = [];

    $("button, a").each((i, el) => {
      const text = $(el).text().trim();

      if (text && text.length < 40) {
        buttons.push(text);
      }
    });

    // Paragraphs
    const paragraphs = [];

    $("p").each((i, el) => {
      const text = $(el).text().trim();

      if (text && text.length > 30 && text.length < 300) {
        paragraphs.push(text);
      }
    });

    // Images
    const images = [];

    $("img").each((i, el) => {
      const src = $(el).attr("src");

      if (src) {
        try {
          images.push(new URL(src, url).href);
        } catch {}
      }
    });

    // CSS files
    const cssFiles = [];

    $("link[rel='stylesheet']").each((i, el) => {
      const href = $(el).attr("href");

      if (href) {
        try {
          cssFiles.push(new URL(href, url).href);
        } catch {}
      }
    });

    // JS files
    const jsFiles = [];

    $("script").each((i, el) => {
      const src = $(el).attr("src");

      if (src) {
        try {
          jsFiles.push(new URL(src, url).href);
        } catch {}
      }
    });

    // Return structured data
    return JSON.stringify({
      title,
      headings: headings.slice(0, 20),
      buttons: buttons.slice(0, 20),
      paragraphs: paragraphs.slice(0, 10),
      images: images.slice(0, 10),
      cssFiles: cssFiles.slice(0, 10),
      jsFiles: jsFiles.slice(0, 10),
    });
  } catch (error) {
    return `Error scraping website: ${error.message}`;
  }
};
const saveToFile = async (filename, content) => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const filePath = path.join(__dirname, filename);
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, content, (err) => {
      if (err) {
        reject(`Error writing to file: ${err}`);
      } else {
        resolve(`Content saved to ${filePath}`);
      }
    });
  });
};

const executeCommand = async (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${error.message}`);
      } else if (stderr) {
        reject(`Stderr: ${stderr}`);
      } else {
        resolve(stdout);
      }
    });
  });
};

const ToolMap = {
  SCRAPE_WEBSITE: scrapeWebsite,
  EXECUTE_COMMAND: executeCommand,
  SAVE_TO_FILE: saveToFile,
};
async function main() {
  const rl = readline.createInterface({
    input,
    output,
  });

  console.log("AI Agent Started");
  console.log('Type "exit" to quit\n');

  while (true) {
    const prompt = await rl.question("You: ");

    if (prompt.toLowerCase() === "exit") {
      console.log("Goodbye!");
      rl.close();
      process.exit(0);
    }

    const history = [];

    history.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    let finished = false;
    let iteration = 0;

    while (!finished) {
      iteration++;

      if (iteration > 8) {
        console.log("\nToo many iterations. Stopping.\n");
        break;
      }

      let response;

      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: history,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        });
      } catch (error) {
        console.log("Gemini Error:", error.message);
        break;
      }

      const rawText = getResponseText(response);

      if (!rawText) {
        console.log("Empty response");
        break;
      }

      const cleanedText = cleanJsonText(rawText);

      const parsedSteps = parseJsonObjects(cleanedText);

      if (!parsedSteps.length) {
        console.log("No valid JSON found");
        console.log(cleanedText);
        break;
      }

      history.push({
        role: "model",
        parts: [{ text: cleanedText }],
      });

      let toolUsed = false;
      let outputGenerated = false;

      for (const stepData of parsedSteps) {
        const step = stepData.step?.toUpperCase();

        if (step === "START") {
          console.log("\nSTART:");
          console.log(stepData.content);
          continue;
        }

        if (step === "THINKING") {
          console.log("\nTHINKING:");
          console.log(stepData.content);
          continue;
        }

        if (step === "TOOL") {
          toolUsed = true;

          const toolname = stepData.toolname;
          const input = stepData.input;

          console.log(`\nTOOL: ${toolname}`);
          console.log("Input:", input);

          if (!ToolMap[toolname]) {
            history.push({
              role: "user",
              parts: [
                {
                  text: `
OBSERVATION:
Tool ${toolname} not found.
`,
                },
              ],
            });

            addContinueInstruction(history);

            break;
          }

          let toolOutput;

          try {
            if (toolname === "SAVE_TO_FILE") {
              const [filename, ...contentParts] = input.split("|");

              const content = contentParts.join("|");

              toolOutput = await ToolMap[toolname](
                filename.trim(),
                content.trim(),
              );
            } else {
              toolOutput = await ToolMap[toolname](input);
            }
          } catch (error) {
            toolOutput = `Tool Error: ${error.message}`;
          }

          console.log("\nOBSERVATION:");
          console.log(toolOutput);

          history.push({
            role: "user",
            parts: [
              {
                text: `
OBSERVATION:

Tool Used: ${toolname}

Tool Result:
${toolOutput}
`,
              },
            ],
          });

          addContinueInstruction(history);

          break;
        }

        if (step === "OUTPUT") {
          outputGenerated = true;

          console.log("\nFINAL OUTPUT:");
          console.log(stepData.content);
          console.log("");

          finished = true;
          break;
        }
      }

      if (!toolUsed && !outputGenerated && iteration > 2) {
        console.log("Agent got stuck.");
        break;
      }
    }
  }
}

await main();
