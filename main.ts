import "dotenv/config"

import {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageFlags,
    Events,
} from "discord.js"
import { ThrottledQueue } from "./src/Services/ThrottledQueue.ts"
import { ProcessFile, QueueCooldown } from "./src/Utils/ProcessFile.ts"

const Throttler = new ThrottledQueue(QueueCooldown)

const DiscordClient = new Client({ intents: [GatewayIntentBits.Guilds] })

const Commands = [
    new SlashCommandBuilder()
        .setName("safe_obfuscate")
        .setDescription("Securely obfuscate your Lua script with Prometheus (against the UnveilR V2 deobfuscation)")
        .addAttachmentOption((Option) => Option.setName("file").setDescription("The script file").setRequired(true)),
].map((Command) => Command.toJSON())

const Rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!)

DiscordClient.once(Events.ClientReady, async () => {
    try {
        await Rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!), {
            body: Commands,
        })
        console.log("Client ready!")
    } catch (Error) {
        console.error(Error)
        process.exit(1)
    }
})

DiscordClient.on(Events.InteractionCreate, async (Interaction) => {
    if (!Interaction.isChatInputCommand() || Interaction.commandName !== "safe_obfuscate") return

    const Attachment = Interaction.options.getAttachment("file")!

    const Row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("agree_proceed").setLabel("Agree & Proceed").setStyle(ButtonStyle.Success),
    )

    const Response = await Interaction.reply({
        content: `### ⚖️ Disclaimer\nThis bot is provided for **educational purposes only**. You can review the tool's source code at https://github.com/MaiFengYXD/Anti-UnveilR-V2.\nWe value your privacy: we **never** store any scripts sent to this service.`,
        components: [Row],
        flags: MessageFlags.Ephemeral,
    })

    const Collector = Response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
    })

    Collector.on("collect", async (ButtonInteraction) => {
        if (ButtonInteraction.customId !== "agree_proceed") return

        try {
            await ButtonInteraction.update({
                content: "⏳ In queue...",
                components: [],
            })

            try {
                const FinalFile = await Throttler.Enqueue(
                    ProcessFile,
                    Attachment.url,
                    Attachment.name,
                    async (Content: string) => {
                        try {
                            await Interaction.editReply({
                                content: Content,
                            })
                        } catch {}
                    },
                )

                await Interaction.editReply({
                    content: "✅ Obfuscation complete.",
                    files: [FinalFile],
                })
            } catch (ProcessError: any) {
                await Interaction.editReply({
                    content: `❌ Error: ${ProcessError.message?.slice(0, 200)}.`,
                })
            }
        } catch (Error) {
            console.error(Error)
            await Interaction.editReply({ content: "⏱️ Interaction failed.", components: [] })
        }
    })

    Collector.on("end", async (Collected) => {
        if (Collected.size === 0) {
            await Interaction.editReply({
                content: "⌛ Confirmation timed out. Please run the command again.",
                components: [],
            })
        }
    })
})

DiscordClient.login(process.env.DISCORD_TOKEN)
