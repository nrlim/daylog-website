/*
  Warnings:

  - Added the required column `subject` to the `Activity` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "subject" TEXT NOT NULL;
