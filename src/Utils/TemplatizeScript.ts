import { Templates } from "../Templates/index.ts"
import { Globals } from "./Globals.ts"

export function TemplatizeScript(Source: string) {
    const UsingTemplate = Templates[Math.floor(Math.random() * Templates.length)]
    return UsingTemplate.replace("RANDOM_GLOBAL", Globals[Math.floor(Math.random() * Globals.length)]).replace(
        "SCRIPT_SOURCE()",
        () => Source.trim(),
    )
}
