-- AlterTable
ALTER TABLE `User` ADD COLUMN `username` VARCHAR(191) NULL,
    ADD COLUMN `nickname` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_username_key` ON `User`(`username`);

-- CreateIndex
CREATE UNIQUE INDEX `User_nickname_key` ON `User`(`nickname`);

