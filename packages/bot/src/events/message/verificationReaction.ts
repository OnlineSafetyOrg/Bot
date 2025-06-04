import { EventInterface } from '../../types.js';
import { Events, MessageReaction, User, TextChannel } from 'discord.js';
import { CoffeeClient } from '../../index.js';

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours

// In-memory stores
const attemptMap = new Map<string, number>(); // key: `${guildId}-${userId}`
const timeoutMap = new Map<string, NodeJS.Timeout>();

// Helper to safely parse JSON string arrays
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

        const guildId = guild.id;
        const key = `${guildId}-${user.id}`;

        const config = await this.prisma.verificationConfig.findUnique({
            where: { guildId },
        });
        if (!config || message.id !== config.messageId) return;

        const emojis = safeStringArray(config.emojis);
        const verifiedRoles = safeStringArray(config.verifiedRoleIds);
        const emojiName = reaction.emoji.name;

        if (!emojiName || !emojis.includes(emojiName)) return;

        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        const logsChannel = config.logsChannelId
            ? await guild.channels.fetch(config.logsChannelId).catch(() => null)
            : null;

        const log = async (content: string) => {
            if (logsChannel && logsChannel.isTextBased()) {
                (logsChannel as TextChannel).send(content).catch(() => {});
            }
        };

        // Start timeout if it's the user's first attempt
        if (!timeoutMap.has(key)) {
            const timeout = setTimeout(async () => {
                if (!attemptMap.has(key)) return;
                await log(`\`⏳\` ${user.tag} did not react within 12 hours.`);
                attemptMap.delete(key);
                timeoutMap.delete(key);
            }, TIMEOUT_MS);
            timeoutMap.set(key, timeout);
        }

        if (emojiName === config.correctEmoji) {
            for (const roleId of verifiedRoles) {
                await member.roles.add(roleId).catch(() => {});
            }
            await member.send(
                ['`✅` You have been verified!', '', `-# Sent from **${guild.name} (${guild.id})**`].join(
                    '\n',
                ),
            );

            clearTimeout(timeoutMap.get(key));
            attemptMap.delete(key);
            timeoutMap.delete(key);

            await log(`\`✅\` ${user.tag} (${user.id}) verified successfully.`);
        } else {
            const currentAttempts = attemptMap.get(key) ?? 0;
            const newAttempts = currentAttempts + 1;
            attemptMap.set(key, newAttempts);

            await member.send(
                [
                    '`❌` Wrong emoji. Please try again.',
                    '',
                    `-# Sent from **${guild.name} (${guild.id})**`,
                ].join('\n'),
            );

            if (newAttempts >= MAX_ATTEMPTS) {
                await log(`\`❌\` ${user.tag} (${user.id}) failed verification ${newAttempts} times.`);

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
                            .catch(() => {});

                        await log(
                            `\`👢\` ${user.username} (${user.id}) was kicked for failing verification.`,
                        );
                        await member.kick('Failed verification too many times');
                    } catch {
                        await log(
                            `\`⚠️\` Failed to kick ${user.username} (${user.id}). Missing permissions?`,
                        );
                    }
                }
            }
        }

        await reaction.users.remove(user.id).catch(() => {});
    },
};

export default event;
