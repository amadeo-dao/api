/*
  Warnings:

  - A unique constraint covering the columns `[shareholderId,txHash,txIndex]` on the table `VaultShareholderTransaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `txHash` to the `VaultShareholderTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `txIndex` to the `VaultShareholderTransaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `VaultShareholderTransaction` ADD COLUMN `txHash` VARCHAR(191) NOT NULL,
    ADD COLUMN `txIndex` INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `VaultShareholderTransaction_shareholderId_txHash_txIndex_key` ON `VaultShareholderTransaction`(`shareholderId`, `txHash`, `txIndex`);
