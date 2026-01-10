import { Templates } from "../Templates/index.ts"
import { RandomVariableName } from "./Random.ts"

const Replacements = {
    "SCRIPT_SOURCE()": (Source: string) => Source.trim(),
    RANDOM_VARIABLE_NAME: () => RandomVariableName(),
}

export function TemplatizeScript(Source: string) {
    let UsingTemplate = Templates[Math.floor(Math.random() * Templates.length)]
    for (const [Key, Value] of Object.entries(Replacements)) {
        UsingTemplate = UsingTemplate.replaceAll(Key, Value(Source))
    }
    return UsingTemplate
}
