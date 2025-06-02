import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ComponentType,
    userMention,
    PermissionFlagsBits,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import { CoffeeClient } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
import { categoryMeta } from '../../../config/commandCategories.js';

const command: CommandInterface = {
    cooldown: 5,
    isDeveloperOnly: false,
    category: 'Utility',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows information and access to all Online Safety commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    execute: async (interaction: ChatInputCommandInteraction, client: CoffeeClient) => {
        await interaction.deferReply({ ephemeral: true });

        const isDev = client.config.developers.includes(interaction.user.id);
        const registered = await client.application!.commands.fetch();

        const grouped: Record<string, string[]> = {};

        for (const [, cmd] of client.commands) {
            if (cmd.isDeveloperOnly && !isDev) continue;

            const reg = registered.find((r) => r.name === cmd.data.name);
            if (!reg || !reg.id) continue;

            const category = cmd.category ?? 'Other';
            if (!grouped[category]) grouped[category] = [];

            const options = reg.options;

            const hasSubcommands = options?.some((opt) => [1, 2].includes(opt.type));

            if (hasSubcommands) {
                for (const option of options) {
                    if (option.type === 1) {
                        grouped[category].push(
                            `</${reg.name} ${option.name}:${reg.id}> – ${option.description || 'No description'}`,
                        );
                    } else if (option.type === 2) {
                        for (const sub of option.options || []) {
                            grouped[category].push(
                                `</${reg.name} ${option.name} ${sub.name}:${reg.id}> – ${sub.description || 'No description'}`,
                            );
                        }
                    }
                }
            } else {
                grouped[category].push(`</${reg.name}:${reg.id}> – ${reg.description || 'No description'}`);
            }
        }

        // Start embed with info
        const homeEmbed = new EmbedBuilder()
            .setTitle('`📚` Online Safety Help Center')
            .setDescription(
                [
                    'Welcome to **Online Safety Bot**! Use the menu below to explore available commands by category.',
                    '',
                    '`🔐` **Stay safe online with features like verification, moderation, and privacy tools.**',
                    '',
                    '[`🌐` Join our Support Server](https://discord.gg/P3bfEux5cv) — Need help or want to suggest features?',
                    '[`📖` Documentation](https://discord.gg/P3bfEux5cv) — Learn how to use the bot effectively.',
                    '[`☕` Support us on Ko-fi](https://ko-fi.com/duckodas) — Help keep this project alive!',
                    '',
                    '`💡` **Tip:** Use the selection menu below to browse commands and learn what each does.',
                    '`⚙️` **Bot version:** 1.0.0',
                    `\`👤\` **Developed by:** ${userMention('711712752246325343')}`,
                    '',
                    '`🙏` Thanks for using Online Safety Bot! Stay safe and have fun! 🎉',
                ].join('\n'),
            )
            .setColor('Blurple');

        // Buttons with links
        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel('🌐 Support Server')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/P3bfEux5cv'),

            new ButtonBuilder()
                .setLabel('📖 Docs')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/P3bfEux5cv'),

            new ButtonBuilder()
                .setLabel('☕ Donate')
                .setStyle(ButtonStyle.Link)
                .setURL('https://ko-fi.com/duckodas'),
        );

        // Dropdown with categories
        const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help-menu')
                .setPlaceholder('Choose a command category...')
                .addOptions([
                    {
                        label: '🏠 Back to Home',
                        value: 'home',
                        description: 'Return to the help homepage',
                    },
                    ...Object.keys(grouped).map((cat) => {
                        const meta = categoryMeta[cat] ?? {
                            label: cat,
                            description: 'Commands in this category',
                        };
                        return {
                            label: meta.label,
                            value: cat,
                            description: meta.description,
                        };
                    }),
                ]),
        );

        const msg = await interaction.editReply({
            embeds: [homeEmbed],
            components: [buttons, selectMenu],
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 120000,
        });

        collector.on('collect', async (select) => {
            if (select.user.id !== interaction.user.id)
                return select.reply({ content: 'This menu isn’t for you.', ephemeral: true });

            const selected = select.values[0];

            if (selected === 'home') {
                await select.update({ embeds: [homeEmbed], components: [buttons, selectMenu] });
                return;
            }

            const prettyLabel = categoryMeta[selected]?.label ?? selected;

            const embed = new EmbedBuilder()
                .setTitle(`${prettyLabel} Commands`)
                .setDescription(grouped[selected].join('\n'))
                .setColor('Blurple');

            await select.update({ embeds: [embed], components: [buttons, selectMenu] });
        });

        collector.on('end', async () => {
            await msg.edit({ components: [] }).catch(() => null);
        });
    },
};

export default command;
