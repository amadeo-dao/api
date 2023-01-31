import { JsonRpcProvider } from '@ethersproject/providers';
import { expect } from 'chai';
import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { addVault } from '../../src/bin/_add-vault';
import { db } from '../../src/lib/db';
import { erc20ABI } from '../../src/lib/erc20';
import { getProvider } from '../../src/lib/providers';
import { vaultABI } from '../../src/lib/vault';
import { FlakesSyncd } from '../../src/sbin/flakes-syncd';

export type DeployConfig = {
  vault: string;
  manager: string;
  shareholder: string;
};
const configFile = readFileSync('.dev-state/deployment.json');
const config = JSON.parse(configFile.toString()) as DeployConfig;
const provider = getProvider() as JsonRpcProvider;

describe('flakes-syncd -> handleDeposit', () => {
  before('reset database', async () => {
    await db.vault.deleteMany({ where: {} });
    await addVault(config.vault);
  });

  let manager: ethers.Signer;
  let shareholder: ethers.Signer;
  let contract: ethers.Contract;
  let asset: ethers.Contract;
  before('add shareholder to allow list', async () => {
    contract = new ethers.Contract(config.vault, vaultABI, provider);
    manager = provider.getSigner(config.manager);
    shareholder = provider.getSigner(config.shareholder);
    contract = contract.connect(manager);
    await contract.whitelistShareholder(config.shareholder);
    const assetAddress = await contract.asset();
    asset = new ethers.Contract(assetAddress, erc20ABI, provider);
  });

  let flakesSync: FlakesSyncd;
  before('start flakes-syncd', async () => {
    flakesSync = new FlakesSyncd();
    await flakesSync.sync();
  });

  describe('catches the "Deposit" event ', () => {
    it('for Vault.deposit() and saves it to database', async () => {
      const depositAmount = ethers.utils.parseEther('100');
      contract = contract.connect(shareholder);
      asset = asset.connect(shareholder);
      const vaultTotalSupply = await contract.totalSupply();
      await asset.approve(config.vault, depositAmount);
      const tx = await contract.deposit(depositAmount, shareholder.getAddress());
      await provider.waitForTransaction(tx.hash);
      const waitForEvent = new Promise<void>((resolve) => {
        flakesSync.on('Deposit', async (data) => {
          const vault = await db.vault.findUnique({ where: { address: config.vault } });
          expect(vault, 'vault should be in database').to.exist;
          let expected = depositAmount.add(vaultTotalSupply).toString();
          expect(vault?.totalSupply, 'totalSupply should be updated').to.equal(expected);
          resolve();
        });
      });
      await waitForEvent;
    }).timeout(10000);
  });
});
