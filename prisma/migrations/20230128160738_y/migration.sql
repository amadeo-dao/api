-- CreateTable
CREATE TABLE `VaultShareholderTransaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `address` VARCHAR(191) NOT NULL,
    `assets` VARCHAR(191) NOT NULL,
    `shares` VARCHAR(191) NOT NULL,
    `shareholderId` INTEGER NOT NULL,
    `vaultId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VaultShareholderTransaction` ADD CONSTRAINT `VaultShareholderTransaction_shareholderId_fkey` FOREIGN KEY (`shareholderId`) REFERENCES `VaultShareholder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VaultShareholderTransaction` ADD CONSTRAINT `VaultShareholderTransaction_vaultId_fkey` FOREIGN KEY (`vaultId`) REFERENCES `Vault`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
