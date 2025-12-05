/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `comment` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `BoardCategory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `comment` DROP FOREIGN KEY `Comment_authorId_fkey`;

-- DropIndex
DROP INDEX `Comment_authorId_fkey` ON `comment`;

-- AlterTable
ALTER TABLE `boardcategory` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `comment` DROP COLUMN `updatedAt`;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
