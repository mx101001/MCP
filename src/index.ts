import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const server = new McpServer({
  name: "file-reader",
  version: "1.0.0",
});

// Tool: leggi un file
server.tool(
  "read_file",
  "Legge il contenuto di un file testuale",
  {
    file_path: z.string().describe("Percorso assoluto o relativo del file"),
    encoding: z
      .enum(["utf-8", "base64", "hex"])
      .default("utf-8")
      .describe("Encoding del file"),
  },
  async ({ file_path, encoding }) => {
    try {
      const resolved = path.resolve(file_path);
      const content = await fs.readFile(resolved, encoding);
      const stats = await fs.stat(resolved);

      return {
        content: [
          {
            type: "text",
            text: `File: ${resolved}\nSize: ${stats.size} bytes\nModified: ${stats.mtime.toISOString()}\n\n${content}`,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: `Errore: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: lista file in una directory
server.tool(
  "list_directory",
  "Elenca i file in una directory",
  {
    dir_path: z.string().describe("Percorso della directory"),
    recursive: z
      .boolean()
      .default(false)
      .describe("Se esplorare le sottocartelle"),
  },
  async ({ dir_path, recursive }) => {
    try {
      const resolved = path.resolve(dir_path);

      async function listFiles(dir: string, depth = 0): Promise<string[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const lines: string[] = [];

        for (const entry of entries) {
          const indent = "  ".repeat(depth);
          const icon = entry.isDirectory() ? "📁" : "📄";
          lines.push(`${indent}${icon} ${entry.name}`);

          if (recursive && entry.isDirectory()) {
            const sub = await listFiles(path.join(dir, entry.name), depth + 1);
            lines.push(...sub);
          }
        }
        return lines;
      }

      const files = await listFiles(resolved);
      return {
        content: [
          {
            type: "text",
            text: `Directory: ${resolved}\n\n${files.join("\n")}`,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: `Errore: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: info su un file
server.tool(
  "file_info",
  "Restituisce metadati di un file o cartella",
  {
    file_path: z.string().describe("Percorso del file o cartella"),
  },
  async ({ file_path }) => {
    try {
      const resolved = path.resolve(file_path);
      const stats = await fs.stat(resolved);

      const info = {
        path: resolved,
        type: stats.isDirectory() ? "directory" : "file",
        size: `${stats.size} bytes`,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        readable: true,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: `Errore: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Avvio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("File Reader MCP avviato");
}

main().catch(console.error);