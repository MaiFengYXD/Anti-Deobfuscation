import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

const TemplatesDir = path.join(process.cwd(), "src/Templates")

export const Templates = readdirSync(TemplatesDir)
    .filter((file) => file.endsWith(".luau"))
    .map((file) => readFileSync(path.join(TemplatesDir, file), "utf-8"))
