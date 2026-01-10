import { execSync, execFile } from "node:child_process"
import { promisify } from "node:util"
import path from "node:path"
import { readFile, writeFile, rm } from "node:fs/promises"
import { existsSync, mkdirSync } from "node:fs"
import { AttachmentBuilder } from "discord.js"
import { TemplatizeScript } from "./TemplatizeScript.ts"

function IsCommandExist(Command: string) {
    try {
        execSync(`${process.platform === "win32" ? "where" : "command -v"} ${Command}`)
        return true
    } catch {
        return false
    }
}

const IsDarkluaExist = IsCommandExist("darklua")
const IsLuaJITExist = IsCommandExist("luajit")

const TempDir = path.join(process.cwd(), "temp")
const DarkluaOutputTempDir = path.join(TempDir, "minified")
const PrometheusOutputTempDir = path.join(TempDir, "obfuscated")

const DarkluaConfigPath = path.join(process.cwd(), ".darklua.json")
const PrometheusCliPath = path.join(TempDir, "Prometheus", "cli.lua")

if (IsLuaJITExist || IsDarkluaExist) {
    mkdirSync(TempDir, { recursive: true })
    if (IsDarkluaExist) mkdirSync(DarkluaOutputTempDir, { recursive: true })
    if (IsLuaJITExist) mkdirSync(PrometheusOutputTempDir, { recursive: true })
}

if (IsLuaJITExist && !existsSync(PrometheusCliPath)) {
    if (!IsCommandExist("git")) throw new Error("Git is not installed")
    execSync(`git clone --depth 1 https://github.com/prometheus-lua/Prometheus.git ${path.join(TempDir, "Prometheus")}`)
}

const SyntaxErrors = [
    "Parsing Error at Position",
    "unexpected token",
    "Unexpected char",
    "error occurred while creating ast",
]

const execFileAsync = promisify(execFile)

async function ExecFileAsync(Command: string, Args: string[]) {
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

export const QueueCooldown = IsLuaJITExist ? 0 : 1

export async function ProcessFile(
    AttachmentUrl: string,
    FileName: string,
    EditReply: (Content: string) => Promise<void>,
) {
    EditReply("⏳ Fetching your script...")

    const FileResponse = await fetch(AttachmentUrl)
    const RawContent = await FileResponse.text()

    let TempFilePath = path.join(TempDir, FileName)
    let DarkluaOutputTempFilePath = path.join(DarkluaOutputTempDir, FileName)
    let PrometheusOutputTempFilePath = path.join(PrometheusOutputTempDir, FileName)

    try {
        let ProcessedContent = TemplatizeScript(RawContent)
        let UsingFilePath

        if (IsDarkluaExist && RawContent.length > 50_000) {
            EditReply("⏳ Minifying script...")

            await writeFile(TempFilePath, RawContent)
            await ExecFileAsync("darklua", [
                "process",
                TempFilePath,
                DarkluaOutputTempFilePath,
                `-c=${DarkluaConfigPath}`,
            ])

            ProcessedContent = await readFile(DarkluaOutputTempFilePath, "utf-8")
            UsingFilePath = DarkluaOutputTempFilePath
        }

        if (IsLuaJITExist) {
            EditReply("⏳ Obfuscating script...")

            if (!UsingFilePath) {
                await writeFile(TempFilePath, RawContent)
                UsingFilePath = TempFilePath
            }

            await ExecFileAsync("luajit", [
                PrometheusCliPath,
                "--LuaU",
                "--preset",
                "Medium",
                "--out",
                PrometheusOutputTempFilePath,
                UsingFilePath,
            ])

            ProcessedContent = await readFile(PrometheusOutputTempFilePath, "utf-8")
        } else {
            EditReply("⏳ Interacting with Obfuscation API...")

            const Response = await fetch("https://wearedevs.net/api/obfuscate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    script: RawContent,
                }),
            })

            const Data = (await Response.json()) as { success: boolean; obfuscated?: string; error?: string }
            if (!Data.success) throw new Error(Data.error!)

            ProcessedContent = Data.obfuscated!
        }

        return new AttachmentBuilder(Buffer.from(ProcessedContent), { name: FileName })
    } finally {
        await Promise.allSettled([
            rm(TempFilePath),
            rm(DarkluaOutputTempFilePath),
            rm(PrometheusOutputTempFilePath),
        ]).catch(() => {})
    }
}
