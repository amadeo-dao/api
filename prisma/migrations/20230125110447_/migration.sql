/*
  Warnings:

  - A unique constraint covering the columns `[address]` on the table `Vault` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Vault_address_key` ON `Vault`(`address`);
