/*
  Warnings:

  - Made the column `symbol` on table `Vault` required. This step will fail if there are existing NULL values in that column.
  - Made the column `totalSupply` on table `Vault` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Vault` ADD COLUMN `assetsInUse` VARCHAR(191) NOT NULL DEFAULT '0',
    ADD COLUMN `assetsUnderManagement` VARCHAR(191) NOT NULL DEFAULT '0',
    ADD COLUMN `sharePrice` VARCHAR(191) NOT NULL DEFAULT '0',
    MODIFY `symbol` VARCHAR(191) NOT NULL,
    MODIFY `totalSupply` VARCHAR(191) NOT NULL DEFAULT '0';

-- CreateTable
CREATE TABLE `VaultAsset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `decimals` INTEGER NOT NULL DEFAULT 18,
    `totalSupply` VARCHAR(191) NOT NULL,
    `vaultId` INTEGER NOT NULL,

    UNIQUE INDEX `VaultAsset_vaultId_key`(`vaultId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VaultAsset` ADD CONSTRAINT `VaultAsset_vaultId_fkey` FOREIGN KEY (`vaultId`) REFERENCES `Vault`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
