import { execFile, execSync } from "node:child_process"
import path from "node:path"
import { mkdirSync } from "node:fs"
import { promisify } from "node:util"

export function IsCommandExist(Command: string) {
    try {
        execSync(`${process.platform === "win32" ? "where" : "command -v"} ${Command}`)
        return true
    } catch {
        return false
    }
}

export const IsDarkluaExist = IsCommandExist("darklua")
export const IsLuaJITExist = IsCommandExist("luajit")

export const TempDir = path.join(process.cwd(), "temp")
export const DarkluaOutputTempDir = path.join(TempDir, "minified")
export const PrometheusOutputTempDir = path.join(TempDir, "obfuscated")

export const DarkluaConfigPath = path.join(process.cwd(), ".darklua.json")
export const PrometheusCliPath = path.join(TempDir, "Prometheus", "cli.lua")

if (IsLuaJITExist || IsDarkluaExist) {
    mkdirSync(TempDir, { recursive: true })
    if (IsDarkluaExist) mkdirSync(DarkluaOutputTempDir, { recursive: true })
    if (IsLuaJITExist) mkdirSync(PrometheusOutputTempDir, { recursive: true })
}

const execFileAsync = promisify(execFile)

const SyntaxErrors = [
    "Parsing Error at Position",
    "unexpected token",
    "Unexpected char",
    "error occurred while creating ast",
]

export async function ExecFileAsync(Command: string, Args: string[]) {
    try {
        await execFileAsync(Command, Args)
    } catch (ExecFileError: any) {
        let ErrorMessage = ExecFileError.stderr?.trim() || ExecFileError.stdout?.trim() || ExecFileError.message
        if (SyntaxErrors.some((Error) => ErrorMessage.includes(Error))) {
            ErrorMessage = "Your script contains syntax error"
        }

        throw new Error(ErrorMessage)
    }
}
