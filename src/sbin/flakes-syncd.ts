import { PrismaClient } from '@prisma/client';
import { BigNumber, ethers } from 'ethers';
import EventEmitter from 'events';
import { logger } from '../lib/logger';
import { getProvider } from '../lib/providers';
import { Shareholder } from '../lib/shareholder';
import { Vault, vaultABI } from '../lib/vault';

const provider = getProvider();
const prisma = new PrismaClient();

export class FlakesSyncd extends EventEmitter {
  isSyncing: boolean;

  constructor() {
    super();
    this.isSyncing = false;
  }

  async sync(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    const vaults = await prisma.vault.findMany();
    const contracts = vaults.map((vault) => new ethers.Contract(vault.address, vaultABI, provider));

    contracts.forEach((contract) => {
      const _this = this as FlakesSyncd;
      logger.info('Listening to deposits', { vault: contract.address });
      const depositFilter = contract.filters.Deposit();
      contract.on(depositFilter, function (_sender: string, owner: string, assets: BigNumber, shares: BigNumber) {
        _this.handleDeposit(contract.address, owner, assets, shares);
      });
    }, this as FlakesSyncd);
  }

  private async handleDeposit(vaultAddress: string, shareholderAddress: string, assets: BigNumber, shares: BigNumber): Promise<void> {
    this.emit('Deposit', [{ shareholderAddress, assets, shares }]);
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
}

if (process.env.NODE_ENV !== 'test') {
  new FlakesSyncd().sync();
}
