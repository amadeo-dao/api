import { expect } from 'chai';
import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { db } from '../../src/lib/db';
import { erc20ABI } from '../../src/lib/erc20';
import { getProvider } from '../../src/lib/providers';
import { Shareholder } from '../../src/lib/shareholder';
import { ShareholderTx } from '../../src/lib/shareholderTx';
import { Vault, vaultABI } from '../../src/lib/vault';
import { waitForEvent } from '../utils/eventUtils';

export type DeployConfig = {
  vault: string;
  manager: string;
  shareholder: string;
};
const configFile = readFileSync('.dev-state/deployment.json');
const config = JSON.parse(configFile.toString()) as DeployConfig;
const provider = getProvider() as ethers.providers.JsonRpcProvider;

describe('Vault -> scanLogEvents()', () => {
  let vault: Vault;
  before('reset database', async () => {
    await db.vault.deleteMany({ where: {} });
    vault = await Vault.import(config.vault);
    await vault.save();
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

  let unsubscribe: () => void;
  before('start scanning for events', () => {
    // Initilize the vault's event scanner
    unsubscribe = vault.scanLogEvents();
  });

  it("catches the 'Deposit' event on deposit() calls", async () => {
    // Subscribe to the Deposit event
    const subscription = waitForEvent(vault, 'Deposit');

    // Deposit some assets
    const depositAmount = ethers.utils.parseEther('100');
    contract = contract.connect(shareholder);
    asset = asset.connect(shareholder);
    await asset.approve(config.vault, depositAmount);
    const tx = await contract.deposit(depositAmount, shareholder.getAddress());
    await provider.waitForTransaction(tx.hash);

    // Wait for the event to be emitted
    const [shareholderTx, event] = (await subscription) as [ShareholderTx, ethers.Event];

    // Check the event data
    expect(shareholderTx).to.exist;
    expect(shareholderTx.shareholderId).to.exist;
    expect(shareholderTx.assets).to.equal(ethers.utils.parseEther('100').toString());
    expect(shareholderTx.shares).to.equal(ethers.utils.parseEther('100').toString());
    const shareholderData = await Shareholder.load(shareholderTx.shareholderId);
    expect(shareholderData).to.exist;
    expect(shareholderTx.shareholderId).to.equal(shareholderData?.id);
    expect(event).to.exist;
    expect(event.args).to.exist;
    expect(event.args?.owner).to.exist;
    expect(shareholderData?.address).to.equal(event.args?.owner);
  }).timeout(10000);

  it("catches the 'Withdraw' event on withdraw() calls", async () => {
    // Subscribe to the Withdraw event
    const subscription = waitForEvent(vault, 'Withdraw');

    // Withdraw some assets
    const depositAmount = ethers.utils.parseEther('100');
    contract = contract.connect(shareholder);
    asset = asset.connect(shareholder);
    await asset.approve(config.vault, depositAmount);
    const tx = await contract.withdraw(depositAmount, shareholder.getAddress(), shareholder.getAddress());
    await provider.waitForTransaction(tx.hash);

    // Wait for the event to be emitted
    const [shareholderTx, event] = (await subscription) as [ShareholderTx, ethers.Event];

    // Check the event data
    expect(shareholderTx).to.exist;
    expect(shareholderTx.shareholderId).to.exist;
    expect(shareholderTx.assets).to.equal(depositAmount.toString());
    expect(shareholderTx.shares).to.equal(depositAmount.toString());
    expect(shareholderTx.txHash).to.equal(tx.hash);
    expect(shareholderTx.txType).to.equal('Withdraw');
    const shareholderData = await Shareholder.load(shareholderTx.shareholderId);
    expect(shareholderData).to.exist;
    expect(shareholderTx.shareholderId).to.equal(shareholderData?.id);
    expect(event).to.exist;
    expect(event.args).to.exist;
    expect(event.args?.owner).to.exist;
    expect(shareholderData?.address).to.equal(event.args?.owner);
  }).timeout(10000);

  after('stop scanning for events', () => {
    unsubscribe();
  });
});
