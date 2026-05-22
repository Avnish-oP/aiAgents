import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import dotenv from "dotenv";
import { exec } from "node:child_process";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Set GEMINI_API_KEY before running this agent.");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey,
});

/* -------------------------------------------------------------------------- */
/*                                   TOOLS                                    */
/* -------------------------------------------------------------------------- */

const getWeather = async (location) => {
  const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;

  const { data } = await axios.get(url);

  const current = data.current_condition?.[0];

  if (!current) {
    return `Could not find weather data for ${location}`;
  }

  const description = current.weatherDesc?.[0]?.value || "Unknown weather";

  return `
Weather in ${location}:
- Condition: ${description}
- Temperature: ${current.temp_C}°C
- Feels Like: ${current.FeelsLikeC}°C
- Humidity: ${current.humidity}%
- Wind Speed: ${current.windspeedKmph} km/h
`;
};

const runShellCommand = (command) => {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        resolve(`Stderr: ${stderr}`);
        return;
      }
      resolve(stdout);
    });
  });
};

const gitCommand = (command) => {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        resolve(`Stderr: ${stderr}`);
        return;
      }
      resolve(stdout);
    });
  });
};

const toolMap = {
  getWeather,
  runShellCommand,
  gitCommand,
};

/* -------------------------------------------------------------------------- */
/*                              RESPONSE HELPERS                              */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                        PARSE MULTIPLE JSON OBJECTS                         */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                                 UTILITIES                                  */
/* -------------------------------------------------------------------------- */

function isWeatherQuery(text) {
  return /\b(weather|temperature|forecast|rain|humidity|wind)\b/i.test(text);
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
`,
      },
    ],
  });
}

/* -------------------------------------------------------------------------- */
/*                               SYSTEM PROMPT                                */
/* -------------------------------------------------------------------------- */

const systemPrompt = `
You are an autonomous AI agent.

You must solve the user's query step by step.

You have access to tools.

Available Tools:
1. getWeather(location:string)
   -> Returns current weather information for a location.
2. runShellCommand(command:string)
   -> Executes a shell command and returns the output.
3. gitCommand(command:string)
   -> Executes any git command and returns the output.

RULES:
- Always follow this sequence:

START -> THINKING -> TOOL -> OBSERVATION -> THINKING -> OUTPUT

- You can generate multiple THINKING steps.
- Never skip TOOL if information is required.
- Never generate OUTPUT before OBSERVATION when using a tool.
- Keep reasoning concise but visible.
- Always respond ONLY in valid JSON.
- You may generate MULTIPLE JSON objects in one response.

JSON FORMAT:

{
  "step":"START" | "THINKING" | "TOOL" | "OBSERVATION" | "OUTPUT",
  "content":"string",
  "toolname":"string",
  "input":"string"
}

TOOL step example:
{
  "step":"TOOL",
  "toolname":"getWeather",
  "input":"Delhi",
  "content":"Fetching weather data"
}

OUTPUT step example:
{
  "step":"OUTPUT",
  "content":"The weather in Delhi is sunny and 35°C."
}
`;

/* -------------------------------------------------------------------------- */
/*                                   MODEL                                    */
/* -------------------------------------------------------------------------- */

const model = "gemini-2.5-flash";

/* -------------------------------------------------------------------------- */
/*                                    MAIN                                    */
/* -------------------------------------------------------------------------- */

async function main() {
  const rl = readline.createInterface({
    input,
    output,
  });

  console.log("\nAgent is running...");
  console.log('Type "exit" to quit.\n');

  while (true) {
    const prompt = await rl.question("You: ");

    if (prompt.trim().toLowerCase() === "exit") {
      break;
    }

    const history = [];

    history.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const needsWeatherTool = isWeatherQuery(prompt);

    let usedWeatherTool = false;
    let finished = false;
    let safetyCounter = 0;

    while (!finished) {
      safetyCounter++;

      if (safetyCounter > 20) {
        console.log("\nToo many reasoning steps. Stopping.\n");
        break;
      }

      let response;

      try {
        response = await ai.models.generateContent({
          model,
          contents: history,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.4,
          },
        });
      } catch (error) {
        console.error("Gemini Error:", error.message || String(error));
        break;
      }

      const rawText = getResponseText(response);

      if (!rawText) {
        console.log("Empty model response");
        break;
      }

      const parsedSteps = parseJsonObjects(rawText);

      if (!parsedSteps.length) {
        console.log("No valid JSON found:");
        console.log(rawText);
        break;
      }

      history.push({
        role: "model",
        parts: [{ text: rawText }],
      });

      for (const stepData of parsedSteps) {
        const step = stepData.step?.toUpperCase();

        /* ------------------------------ START ------------------------------ */

        if (step === "START") {
          console.log("\nSTART:");
          console.log(stepData.content);
          continue;
        }

        /* ---------------------------- THINKING ----------------------------- */

        if (step === "THINKING") {
          console.log("\nTHINKING:");
          console.log(stepData.content);
          continue;
        }

        /* ------------------------------- TOOL ------------------------------ */

        if (step === "TOOL") {
          const toolname = stepData.toolname;
          const input = stepData.input;

          console.log("\nTOOL:");
          console.log(`${toolname}("${input}")`);

          if (!toolMap[toolname]) {
            console.log(`Tool ${toolname} not found`);

            history.push({
              role: "user",
              parts: [
                {
                  text: JSON.stringify({
                    step: "OBSERVATION",
                    toolname,
                    content: `Tool ${toolname} not found`,
                  }),
                },
              ],
            });

            continue;
          }

          let toolResponse;

          try {
            toolResponse = await toolMap[toolname](input);
          } catch (error) {
            toolResponse = error.message || "Tool execution failed";
          }

          if (toolname === "getWeather") {
            usedWeatherTool = true;
          }

          history.push({
            role: "user",
            parts: [
              {
                text: JSON.stringify({
                  step: "OBSERVATION",
                  toolname,
                  input,
                  content: toolResponse,
                }),
              },
            ],
          });

          addContinueInstruction(history);

          break;
        }

        /* ------------------------------ OUTPUT ----------------------------- */

        if (step === "OUTPUT") {
          if (needsWeatherTool && !usedWeatherTool) {
            console.log("\nWeather query detected but tool not used.");

            addContinueInstruction(history);

            break;
          }

          console.log("\nFINAL OUTPUT:");
          console.log(stepData.content);
          console.log("");

          finished = true;
          break;
        }
      }
    }
  }

  rl.close();
}

await main();
