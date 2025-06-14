import { CoffeeClient } from '../../index.js';
import { CommandInterface, EventInterface } from '../../types.js';
import { ChatInputCommandInteraction, EmbedBuilder, Events } from 'discord.js';
import logger from '../../logger.js';
const cooldowns: Map<string, Map<string, number>> = new Map();

const event: EventInterface = {
    name: Events.InteractionCreate,
    options: { once: false, rest: false },
    execute: async function (this: CoffeeClient, interaction: ChatInputCommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        const command: CommandInterface | undefined = this.commands.get(interaction.commandName);
        if (!command) {
            logger.info({
                labels: { event: 'InteractionCreate' },
                message: `Command not found: ${interaction.commandName}`,
            });
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('Red').setDescription('Failed to process this command')],
                flags: ['Ephemeral'],
            });
        }

        const now = Date.now();
        const cooldownAmount = (command.cooldown ?? 3) * 1000;

        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Map());
        }

        const timestamps = cooldowns.get(command.data.name)!;
        const userCooldown = timestamps.get(interaction.user.id);

        if (userCooldown) {
            const remaining = userCooldown + cooldownAmount - now;
            if (remaining > 0) {
                const time = Math.ceil(remaining / 1000);
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Red')
                            .setDescription(
                                `Please wait **${time}** more second(s) before using this command again.`,
                            ),
                    ],
                    flags: ['Ephemeral'],
                });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        try {
            await command.execute(interaction, this);
        } catch (e: any) {
            logger.error({ labels: { event: 'InteractionCreate' }, message: e });

            if (e.code === 'InteractionAlreadyReplied') {
                logger.warn('Attempted to reply to an interaction that was already replied/deferred.');
                return;
            }

            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('Red')
                                .setDescription(`Failed to execute \`${command.data.name}\``),
                        ],
                        flags: ['Ephemeral'],
                    });
                } catch (replyError) {
                    logger.error({ labels: { event: 'InteractionCreate' }, message: replyError });
                }
            }
        }
    },
};

export default event;
