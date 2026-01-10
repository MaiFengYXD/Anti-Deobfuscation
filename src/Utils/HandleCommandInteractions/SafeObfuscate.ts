import { ChatInputCommandInteraction } from "discord.js"
import { ThrottledQueue } from "../../Services/ThrottledQueue.ts"
import { CreateDisclaimer } from "../CreateDisclaimer.ts"
import { execSync } from "node:child_process"
import path from "node:path"
import { readFile, writeFile, rm } from "node:fs/promises"
import { existsSync } from "node:fs"
import { AttachmentBuilder } from "discord.js"
import { TemplatizeScript } from "../TemplatizeScript.ts"
import { EditButtonReply, EditReply } from "../EditReply.ts"
import {
    IsCommandExist,
    IsLuaJITExist,
    IsDarkluaExist,
    PrometheusCliPath,
    TempDir,
    DarkluaConfigPath,
    PrometheusOutputTempDir,
    DarkluaOutputTempDir,
    ExecFileAsync,
} from "../../CommandLineUtils.ts"
import { Watermark } from "../../Constants.ts"

if (IsLuaJITExist && !existsSync(PrometheusCliPath)) {
    if (!IsCommandExist("git")) throw new Error("Git is not installed")
    execSync(`git clone --depth 1 https://github.com/prometheus-lua/Prometheus.git ${path.join(TempDir, "Prometheus")}`)
}

const Throttler = new ThrottledQueue(IsLuaJITExist ? 0 : 1)

async function ProcessFile(AttachmentUrl: string, FileName: string, Interaction: ChatInputCommandInteraction) {
    EditReply(Interaction, "⏳ Fetching your script...")

    const FileResponse = await fetch(AttachmentUrl)
    const RawContent = await FileResponse.text()

    let TempFilePath = path.join(TempDir, FileName)
    let DarkluaOutputTempFilePath = path.join(DarkluaOutputTempDir, FileName)
    let PrometheusOutputTempFilePath = path.join(PrometheusOutputTempDir, FileName)

    try {
        let ProcessedContent = TemplatizeScript(RawContent)
        let UsingFilePath

        if (IsDarkluaExist) {
            EditReply(Interaction, "⏳ Checking script compatibility...")

            await writeFile(TempFilePath, ProcessedContent)
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
            EditReply(Interaction, "⏳ Obfuscating script...")

            if (!UsingFilePath) {
                await writeFile(TempFilePath, ProcessedContent || RawContent)
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

            ProcessedContent = Watermark + (await readFile(PrometheusOutputTempFilePath, "utf-8"))
        } else {
            EditReply(Interaction, "⏳ Interacting with obfuscation API...")

            const Response = await fetch("https://wearedevs.net/api/obfuscate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    script: ProcessedContent || RawContent,
                }),
            })

            const Data = (await Response.json()) as
                | { success: true; obfuscated: string }
                | { success: false; error: string }
            if (!Data.success) throw new Error(Data.error)

            ProcessedContent = Data.obfuscated.replace("--[[ v1.0.0 https://wearedevs.net/obfuscator ]] ", Watermark)
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

export async function SafeObfuscate(Interaction: ChatInputCommandInteraction) {
    const Attachment = Interaction.options.getAttachment("file")!
    const [Agreed, ButtonInteraction] = await CreateDisclaimer(Interaction)

    if (!Agreed) return

    try {
        EditButtonReply(ButtonInteraction, "⏳ In queue...")

        const FinalFile = await Throttler.Enqueue(ProcessFile, Attachment.url, Attachment.name, Interaction)

        await Interaction.editReply({
            content: "✅ Obfuscation completed.",
            files: [FinalFile],
        })
    } catch (Error: any) {
        await EditReply(Interaction, `❌ Error: ${Error.message?.slice(0, 200)}.`)
    }
}
