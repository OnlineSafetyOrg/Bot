import { CoffeeClient } from '../../../index.js';
import { CommandInterface } from '../../../types';
import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
} from 'discord.js';

const command: CommandInterface = {
    cooldown: 5,
    isDeveloperOnly: false,
    category: 'Utility',
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Invite Online Safety to your server!')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .setNSFW(false),
    execute: async (interaction: ChatInputCommandInteraction, client: CoffeeClient) => {
        await interaction.deferReply({ ephemeral: true });

        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot+applications.commands`;

        const embed = new EmbedBuilder()
            .setTitle('📩 Invite Online Safety')
            .setDescription(
                'Click the button below to invite **Online Safety** to your server.\nThank you for helping make Discord safer for everyone!',
            )
            .setColor('Blurple');

        const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setLabel('Invite the Bot').setStyle(ButtonStyle.Link).setURL(inviteUrl),
        );

        return interaction.editReply({
            embeds: [embed],
            components: [button],
        });
    },
};

export default command;
