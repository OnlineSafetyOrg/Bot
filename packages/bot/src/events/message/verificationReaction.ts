import { EventInterface } from '../../types.js';
import { Events, MessageReaction, User, TextChannel } from 'discord.js';
import { CoffeeClient } from '../../index.js';
import logger from '../../logger.js';

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 12 * 60 * 60 * 1000; // Set back to 12 hours
const attemptMap = new Map<string, number>();
const timeoutMap = new Map<string, NodeJS.Timeout>();

function safeStringArray(json: any): string[] {
    return Array.isArray(json) ? json.filter((x): x is string => typeof x === 'string') : [];
}

const event: EventInterface = {
    name: Events.MessageReactionAdd,
    options: { once: false, rest: false },
    execute: async function (this: CoffeeClient, reaction: MessageReaction, user: User) {
        if (user.bot) return;

        const message = reaction.message;
        const guild = message.guild;
        if (!guild) return;

        const key = `${guild.id}-${user.id}`;
        const emojiName = reaction.emoji.name;

        let config;
        try {
            config = await this.prisma.verificationConfig.findUnique({ where: { guildId: guild.id } });
        } catch (err) {
            logger.error({
                message: `Failed to fetch verification config: ${err}`,
                labels: { guild: guild.id },
            });
            return;
        }
        if (!config || message.id !== config.messageId) return;

        const emojis = safeStringArray(config.emojis);
        const verifiedRoles = safeStringArray(config.verifiedRoleIds);
        if (!emojiName || !emojis.includes(emojiName)) return;

        const member = await guild.members.fetch(user.id).catch((err) => {
            logger.warn({
                message: `Failed to fetch member ${user.id}: ${err}`,
                labels: { guild: guild.id },
            });
            return null;
        });
        if (!member) return;

        const logsChannel = config.logsChannelId
            ? await guild.channels.fetch(config.logsChannelId).catch((err) => {
                  logger.warn({
                      message: `Failed to fetch logs channel: ${err}`,
                      labels: { guild: guild.id },
                  });
                  return null;
              })
            : null;

        const log = async (content: string) => {
            if (logsChannel?.isTextBased()) {
                try {
                    await (logsChannel as TextChannel).send(content);
                } catch (err) {
                    logger.warn({
                        message: `Failed to send log message: ${err}`,
                        labels: { guild: guild.id },
                    });
                }
            }
        };

        // Timeout logic
        if (!timeoutMap.has(key)) {
            const timeout = setTimeout(async () => {
                if (!attemptMap.has(key)) return;
                await log(`\`⏳\` ${user.tag} did not complete verification within 12 hours.`);
                attemptMap.delete(key);
                timeoutMap.delete(key);
                logger.info({
                    message: `User ${user.tag} (${user.id}) timed out after 12 hours.`,
                    labels: { guild: guild.id },
                });
            }, TIMEOUT_MS);
            timeoutMap.set(key, timeout);
        }

        if (emojiName === config.correctEmoji) {
            try {
                for (const roleId of verifiedRoles) {
                    await member.roles.add(roleId).catch((err) =>
                        logger.warn({
                            message: `Failed to assign role ${roleId}: ${err}`,
                            labels: { user: user.id, guild: guild.id },
                        }),
                    );
                }

                await log(`\`✅\` ${user.tag} (${user.id}) successfully verified.`);

                await member
                    .send(
                        [
                            '`✅` You have been verified!',
                            '',
                            `-# Sent from **${guild.name} (${guild.id})**`,
                        ].join('\n'),
                    )
                    .catch((err) =>
                        logger.warn({
                            message: `Failed to DM verified message: ${err}`,
                            labels: { user: user.id },
                        }),
                    );

                clearTimeout(timeoutMap.get(key));
                attemptMap.delete(key);
                timeoutMap.delete(key);
            } catch (err) {
                logger.error({
                    message: `Verification success handling failed: ${err}`,
                    labels: { user: user.id, guild: guild.id },
                });
            }
        } else {
            const currentAttempts = attemptMap.get(key) ?? 0;
            const newAttempts = currentAttempts + 1;
            attemptMap.set(key, newAttempts);

            try {
                await member
                    .send(
                        [
                            '`❌` Wrong emoji. Please try again.',
                            '',
                            `-# Sent from **${guild.name} (${guild.id})**`,
                        ].join('\n'),
                    )
                    .catch((err) =>
                        logger.warn({
                            message: `Failed to DM wrong emoji message: ${err}`,
                            labels: { user: user.id },
                        }),
                    );
            } catch (err) {
                logger.warn({
                    message: `Failed to send DM for wrong emoji: ${err}`,
                    labels: { user: user.id, guild: guild.id },
                });
            }

            if (newAttempts >= MAX_ATTEMPTS) {
                if (config.kickOnFail) {
                    try {
                        await member
                            .send(
                                [
                                    '`👢` You have been kicked for failing verification too many times.',
                                    '',
                                    `-# Sent from **${guild.name} (${guild.id})**`,
                                ].join('\n'),
                            )
                            .catch((err) =>
                                logger.warn({
                                    message: `Failed to DM kick message: ${err}`,
                                    labels: { user: user.id },
                                }),
                            );

                        await member.kick('Failed verification too many times');

                        await log(
                            `\`👢\` ${user.username} (${user.id}) was kicked for failing verification.`,
                        );

                        logger.info({
                            message: `User ${user.tag} was kicked for failing verification.`,
                            labels: { user: user.id, guild: guild.id },
                        });
                    } catch (err) {
                        logger.error({
                            message: `Failed to kick ${user.tag}: ${err}`,
                            labels: { user: user.id, guild: guild.id },
                        });
                        await log(
                            `\`⚠️\` Failed to kick ${user.username} (${user.id}). Missing permissions?`,
                        );
                    }
                }
            }
        }

        try {
            await reaction.users.remove(user.id).catch((err) =>
                logger.warn({
                    message: `Failed to remove reaction: ${err}`,
                    labels: { user: user.id, guild: guild.id },
                }),
            );
        } catch (err) {
            logger.warn({
                message: `Unexpected error when removing reaction: ${err}`,
                labels: { user: user.id, guild: guild.id },
            });
        }
    },
};

export default event;
