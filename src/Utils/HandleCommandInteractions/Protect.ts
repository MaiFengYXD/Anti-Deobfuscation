import { AttachmentBuilder, ChatInputCommandInteraction } from "discord.js"
import { CreateDisclaimer } from "../CreateDisclaimer.ts"
import { TemplatizeScript } from "../TemplatizeScript.ts"
import { EditButtonReply, EditReply } from "../EditReply.ts"
import path from "node:path"
import { readFile, rm, writeFile } from "node:fs/promises"
import { Watermark } from "../../Constants.ts"
import {
    DarkluaConfigPath,
    DarkluaOutputTempDir,
    ExecFileAsync,
    IsDarkluaExist,
    TempDir,
} from "../../CommandLineUtils.ts"

export async function Protect(Interaction: ChatInputCommandInteraction) {
    const Attachment = Interaction.options.getAttachment("file")!
    const [Agreed, ButtonInteraction] = await CreateDisclaimer(Interaction)

    if (!Agreed) return

    try {
        EditButtonReply(ButtonInteraction, "⏳ Fetching your script...")

        const FileResponse = await fetch(Attachment.url)
        const RawContent = await FileResponse.text()

        let ProcessedContent = TemplatizeScript(RawContent)

        if (IsDarkluaExist) {
            EditReply(Interaction, "⏳ Minifying script...")

            const TempFilePath = path.join(TempDir, Attachment.name)
            const DarkluaOutputTempFilePath = path.join(DarkluaOutputTempDir, Attachment.name)

            try {
                await writeFile(TempFilePath, ProcessedContent)
                await ExecFileAsync("darklua", [
                    "process",
                    TempFilePath,
                    DarkluaOutputTempFilePath,
                    `-c=${DarkluaConfigPath}`,
                ])

                ProcessedContent = await readFile(DarkluaOutputTempFilePath, "utf-8")
            } finally {
                await Promise.allSettled([rm(TempFilePath), rm(DarkluaOutputTempFilePath)]).catch(() => {})
            }
        }

        await Interaction.editReply({
            content: "✅ Protection completed.",
            files: [new AttachmentBuilder(Buffer.from(Watermark + ProcessedContent), { name: Attachment.name })],
            components: [],
        })
    } catch (Error: any) {
        await EditReply(Interaction, `❌ Error: ${Error.message?.slice(0, 200)}`)
    }
}
