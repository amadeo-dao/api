-- CreateTable
CREATE TABLE `VaultShareholder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `address` VARCHAR(191) NOT NULL,
    `shares` VARCHAR(191) NOT NULL DEFAULT '0',
    `isRemoved` BOOLEAN NOT NULL DEFAULT false,
    `vaultId` INTEGER NOT NULL,

    UNIQUE INDEX `VaultShareholder_address_key`(`address`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VaultShareholder` ADD CONSTRAINT `VaultShareholder_vaultId_fkey` FOREIGN KEY (`vaultId`) REFERENCES `Vault`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
