import "dotenv/config"

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events } from "discord.js"
import { CommandHandlers } from "./src/Utils/HandleCommandInteractions/index.ts"

const DiscordClient = new Client({ intents: [GatewayIntentBits.Guilds] })

const Commands = [
    new SlashCommandBuilder()
        .setName("safe_obfuscate")
        .setDescription("Protect and obfuscate your script with Prometheus (against deobfuscations)")
        .addAttachmentOption((Option) => Option.setName("file").setDescription("The script file").setRequired(true)),
    new SlashCommandBuilder()
        .setName("protect")
        .setDescription("Use a random working protection template to protect your script from being deobfuscated")
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
    if (!Interaction.isChatInputCommand()) return

    const CommandHandler = CommandHandlers[Interaction.commandName as keyof typeof CommandHandlers]
    if (!CommandHandler) return

    try {
        await CommandHandler(Interaction)
    } catch (Error) {
        console.error(Error)
    }
})

DiscordClient.login(process.env.DISCORD_TOKEN)
