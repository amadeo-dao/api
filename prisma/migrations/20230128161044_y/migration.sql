/*
  Warnings:

  - Added the required column `isDeposit` to the `VaultShareholderTransaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `VaultShareholderTransaction` ADD COLUMN `isDeposit` BOOLEAN NOT NULL,
    ADD COLUMN `when` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
