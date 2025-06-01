import { CoffeeClient } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    Role,
    SlashCommandBuilder,
    TextChannel,
} from 'discord.js';
import { emojiCategories } from '../../../config/emojiCategories.js';

const command: CommandInterface = {
    cooldown: 5,
    isDeveloperOnly: false,
    category: 'Verification',
    data: new SlashCommandBuilder()
        .setName('verification')
        .setDescription('Manage and setup the verification system')
        .setNSFW(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
            sub
                .setName('setup')
                .setDescription('Set up the verification message in your channel')
                .addChannelOption((opt) =>
                    opt.setName('log_channel').setDescription('Verification log channel').setRequired(true),
                )
                .addChannelOption((opt) =>
                    opt.setName('channel').setDescription('Verification message channel').setRequired(true),
                )
                .addRoleOption((opt) =>
                    opt.setName('role').setDescription('Role given when verified').setRequired(true),
                )
                .addBooleanOption((opt) =>
                    opt.setName('kick_on_fail').setDescription('Kick a user when failed').setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('set-emoji-style')
                .setDescription('Set the emoji style for your verification message')
                .addStringOption((opt) =>
                    opt
                        .setName('style')
                        .setDescription('Choose an emoji style')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Colors', value: 'colors' },
                            { name: 'Symbols', value: 'symbols' },
                            { name: 'Animals', value: 'animals' },
                        ),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('log')
                .setDescription('View or change the log channel')
                .addChannelOption((opt) =>
                    opt.setName('channel').setDescription('New log channel').setRequired(false),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('roles')
                .setDescription('View, add or remove verification roles')
                .addRoleOption((opt) =>
                    opt.setName('role').setDescription('Role to add or remove').setRequired(false),
                )
                .addStringOption((opt) =>
                    opt
                        .setName('action')
                        .setDescription('Add or remove the role')
                        .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' })
                        .setRequired(false),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('kick-on-fail')
                .setDescription('Enable or disable kicking users after max verification failures')
                .addBooleanOption((opt) =>
                    opt.setName('enabled').setDescription('Enable or disable auto kick').setRequired(true),
                ),
        ),

    execute: async (interaction: ChatInputCommandInteraction, client: CoffeeClient) => {
        const { options, guild } = interaction;
        await interaction.deferReply({ ephemeral: true });

        const subcommand = options.getSubcommand();
        const config = await client.prisma.verificationConfig.findUnique({
            where: { guildId: guild!.id },
        });

        switch (subcommand) {
            case 'setup': {
                const log_channel = options.getChannel('log_channel') as TextChannel;
                const channel = options.getChannel('channel') as TextChannel;
                const role = options.getRole('role') as Role;
                const kickOnFail = options.getBoolean('kick_on_fail') as boolean;

                const styleCategory = config?.emojiCategory ?? 'colors';
                const emojis = emojiCategories[styleCategory];
                const shuffled = [...emojis].sort(() => Math.random() - 0.5);
                const correctEmoji = shuffled[Math.floor(Math.random() * 3)];

                const embed = new EmbedBuilder()
                    .setTitle('🔐 Verification Required')
                    .setDescription(`React with \`${correctEmoji}\` to verify you are not a bot.`)
                    .setColor('Blurple');

                const message = await channel.send({ embeds: [embed] });
                for (const emoji of shuffled) await message.react(emoji);

                await client.prisma.verificationConfig.upsert({
                    where: { guildId: guild!.id },
                    update: {
                        kickOnFail: kickOnFail,
                        logsChannelId: log_channel.id,
                        channelId: channel.id,
                        verifiedRoleIds: [role.id],
                        messageId: message.id,
                        correctEmoji,
                        emojis: shuffled,
                    },
                    create: {
                        guildId: guild!.id,
                        kickOnFail: kickOnFail,
                        logsChannelId: log_channel.id,
                        channelId: channel.id,
                        verifiedRoleIds: [role.id],
                        messageId: message.id,
                        correctEmoji,
                        emojis: shuffled,
                        emojiCategory: styleCategory,
                    },
                });

                return interaction.editReply({ content: '`✅` Verification message has been set up.' });
            }

            case 'set-emoji-style': {
                const style = options.getString('style')!;
                if (config) {
                    await client.prisma.verificationConfig.update({
                        where: { guildId: guild!.id },
                        data: { emojiCategory: style },
                    });
                } else {
                    await client.prisma.verificationConfig.create({
                        data: {
                            guildId: guild!.id,
                            kickOnFail: true,
                            logsChannelId: '',
                            channelId: '',
                            verifiedRoleIds: [''],
                            correctEmoji: '',
                            emojis: [],
                            emojiCategory: style,
                        },
                    });
                }
                return interaction.editReply({ content: `\`✅\` Emoji style set to **\`${style}\`**.` });
            }

            case 'log': {
                const newChannel = options.getChannel('channel') as TextChannel;
                if (!config) {
                    return interaction.editReply({
                        content: 'No verification config found. Run `/verification setup` first.',
                    });
                }

                if (!newChannel) {
                    return interaction.editReply({
                        content: `Current log channel: <#${config.logsChannelId}>`,
                    });
                }

                await client.prisma.verificationConfig.update({
                    where: { guildId: guild!.id },
                    data: { logsChannelId: newChannel.id },
                });

                return interaction.editReply({
                    content: `\`✅\` Log channel updated to <#${newChannel.id}>.`,
                });
            }

            case 'roles': {
                if (!config) {
                    return interaction.editReply({
                        content: 'No verification config found. Run `/verification setup` first.',
                    });
                }

                const role = options.getRole('role') as Role | null;
                const action = options.getString('action') as 'add' | 'remove' | null;

                if (!role || !action) {
                    const currentRoles = config.verifiedRoleIds.map((id) => `<@&${id}>`).join(', ') ?? 'None';
                    return interaction.editReply({ content: `Current verification roles: ${currentRoles}` });
                }

                const updatedRoles = new Set(config.verifiedRoleIds);
                if (action === 'add') updatedRoles.add(role.id);
                if (action === 'remove') updatedRoles.delete(role.id);

                await client.prisma.verificationConfig.update({
                    where: { guildId: guild!.id },
                    data: { verifiedRoleIds: Array.from(updatedRoles) },
                });

                return interaction.editReply({
                    content: `\`✅\` Role <@&${role.id}> ${action === 'add' ? 'added to' : 'removed from'} verification roles.`,
                });
            }
            case 'kick-on-fail': {
                if (!config) {
                    return interaction.editReply({
                        content: 'No verification config found. Run `/verification setup` first.',
                    });
                }

                const enabled = options.getBoolean('enabled', true);

                await client.prisma.verificationConfig.update({
                    where: { guildId: guild!.id },
                    data: { kickOnFail: enabled },
                });

                return interaction.editReply({
                    content: `\`✅\` Auto kick on fail has been **${enabled ? 'enabled' : 'disabled'}**.`,
                });
            }
        }
    },
};

export default command;
