import { PrismaClient } from '@prisma/client';
import { BigNumber, ethers } from 'ethers';
import { logger } from '../lib/logger';
import { getProvider } from '../lib/providers';
import { Shareholder } from '../lib/shareholder';
import { Vault, vaultABI } from '../lib/vault';

const provider = getProvider();
const prisma = new PrismaClient();
async function main() {
  const vaults = await prisma.vault.findMany();
  const contracts = vaults.map((vault) => new ethers.Contract(vault.address, vaultABI, provider));

  contracts.forEach((contract) => {
    logger.info('Listening to deposits on ', contract.address);
    const depositFilter = contract.filters.Deposit();
    contract.on(depositFilter, async function (_sender: string, owner: string, assets: BigNumber, shares: BigNumber) {
      await handleDeposit(contract.address, owner, assets, shares);
    });
  });
}

async function handleDeposit(vaultAddress: string, shareholderAddress: string, assets: BigNumber, shares: BigNumber) {
  const vault = await Vault.loadByAddress(vaultAddress);
  if (!vault || !vault.id) return;
  logger.info('new deposit', { vault, shareholderAddress, assets, shares });
  await vault.sync();
  let shareholder = await Shareholder.loadByAddress(vault.id, shareholderAddress);
  if (!shareholder) {
    shareholder = await Shareholder.import(vault.address, shareholderAddress);
    shareholder.vaultId = vault.id;
    shareholder = await shareholder.save();
  } else {
    shareholder = await shareholder.sync();
    logger.info('synced shareholder', { shareholder });
  }
}

main();
