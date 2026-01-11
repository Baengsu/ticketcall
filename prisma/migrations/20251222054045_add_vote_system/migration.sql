/*
  Warnings:

  - The primary key for the `CommentVote` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PostVote` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[commentId,userId]` on the table `CommentVote` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[postId,userId]` on the table `PostVote` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CommentVote_commentId_idx";

-- DropIndex
DROP INDEX "CommentVote_userId_idx";

-- DropIndex
DROP INDEX "PostVote_postId_idx";

-- DropIndex
DROP INDEX "PostVote_userId_idx";

-- AlterTable
ALTER TABLE "CommentVote" DROP CONSTRAINT "CommentVote_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "CommentVote_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "PostVote" DROP CONSTRAINT "PostVote_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "PostVote_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "CommentVote_commentId_userId_key" ON "CommentVote"("commentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostVote_postId_userId_key" ON "PostVote"("postId", "userId");
