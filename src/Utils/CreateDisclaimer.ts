import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    MessageFlags,
} from "discord.js"
import { Disclaimer } from "../Constants.ts"

export async function CreateDisclaimer(
    Interaction: ChatInputCommandInteraction,
): Promise<[true, ButtonInteraction] | [false, undefined]> {
    const Row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("agree_proceed").setLabel("Agree & Proceed").setStyle(ButtonStyle.Success),
    )

    const Response = await Interaction.reply({
        content: Disclaimer,
        components: [Row],
        flags: MessageFlags.Ephemeral,
    })

    return new Promise((Resolve) => {
        const Collector = Response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000,
        })

        Collector.on("collect", (ButtonInteraction) => {
            if (ButtonInteraction.customId !== "agree_proceed") return
            Collector.stop("success")
            Resolve([true, ButtonInteraction])
        })

        Collector.on("end", (_, Reason) => {
            if (Reason === "success") return

            Interaction.editReply({
                content: "⌛ Confirmation timed out. Please run the command again.",
                components: [],
            }).catch(() => {})

            Resolve([false, undefined])
        })
    })
}
