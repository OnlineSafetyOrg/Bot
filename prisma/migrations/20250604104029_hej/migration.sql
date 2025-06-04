-- CreateTable
CREATE TABLE `Guild` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Guild_guildId_key`(`guildId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationConfig` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NOT NULL,
    `kickOnFail` BOOLEAN NOT NULL DEFAULT true,
    `logsChannelId` VARCHAR(191) NOT NULL,
    `channelId` VARCHAR(191) NOT NULL,
    `verifiedRoleIds` JSON NOT NULL,
    `messageId` VARCHAR(191) NULL,
    `correctEmoji` VARCHAR(191) NOT NULL,
    `emojis` JSON NOT NULL,
    `emojiCategory` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `VerificationConfig_guildId_key`(`guildId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VerificationConfig` ADD CONSTRAINT `VerificationConfig_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `Guild`(`guildId`) ON DELETE CASCADE ON UPDATE CASCADE;
