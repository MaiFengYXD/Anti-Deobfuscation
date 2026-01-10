import { ButtonInteraction, ChatInputCommandInteraction } from "discord.js"

export async function EditReply(Interaction: ChatInputCommandInteraction, Content: string) {
    try {
        await Interaction.editReply({ content: Content })
    } catch {}
}

export async function EditButtonReply(ButtonInteraction: ButtonInteraction, Content: string) {
    try {
        await ButtonInteraction.update({ content: Content, components: [] })
    } catch {}
}
