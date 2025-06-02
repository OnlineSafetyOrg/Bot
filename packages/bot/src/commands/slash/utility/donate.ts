import { CoffeeClient } from '../../../index.js';
import { CommandInterface } from '../../../types';
import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} from 'discord.js';

const command: CommandInterface = {
    cooldown: 5,
    isDeveloperOnly: false,
    category: 'Utility',
    data: new SlashCommandBuilder()
        .setName('donate')
        .setDescription('Support the bot via Ko-fi!')
        .setNSFW(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    execute: async (interaction: ChatInputCommandInteraction, client: CoffeeClient) => {
        await interaction.deferReply({ flags: ['Ephemeral'] });

        const embed = new EmbedBuilder()
            .setTitle('☕ Support Online Safety')
            .setDescription(
                'If you find this bot helpful, please consider donating to support future development!\n\n[Click here to donate on Ko-fi](https://ko-fi.com/duckodas)',
            )
            .setColor('Blurple')
            .setFooter({ text: 'Your support helps us keep improving Online Safety ❤️' });

        const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel('Donate on Ko-fi')
                .setStyle(ButtonStyle.Link)
                .setURL('https://ko-fi.com/duckodas'),
        );

        return interaction.editReply({
            embeds: [embed],
            components: [button],
        });
    },
};

export default command;
