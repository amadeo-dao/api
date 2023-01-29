import { PrismaClient, Vault } from '@prisma/client';
import { map as asyncMap } from 'bluebird';
import { BigNumber, ethers } from 'ethers';
import { getAddress } from 'ethers/lib/utils';
import moment from 'moment';
import { CLIResult, error, success } from '../lib/cli';
import { etherscan, EtherscanLogEvent } from '../lib/etherscan';
import { importVault, vaultABI } from '../lib/vault';

const prisma = new PrismaClient();

export type DepositEvent = {
  owner: string;
  assets: BigNumber;
  shares: BigNumber;
};

export type WithdrawEvent = {
  owner: string;
  assets: BigNumber;
  shares: BigNumber;
};

export async function scanVault(address?: string): Promise<CLIResult[] | CLIResult> {
  if (!address || address === '') return error('Address is required.', 201);
  try {
    address = getAddress(address);
  } catch (e) {
    return error('Invalid address format: ' + address, 202);
  }
  const vault = await prisma.vault.findFirst({ where: { address } });
  if (!vault) return error(`Vault ${address} not found.`, 203);

  const vaultImportData = await importVault(address);

  const iface = new ethers.utils.Interface(vaultABI);
  let events;
  let currentUpdateBlock = vault.lastUpdateBlock;
  try {
    events = await etherscan().getLogEvents(address, vault.lastUpdateBlock);
    const results = await asyncMap(events, async (event) => {
      let parsed;
      try {
        parsed = iface.parseLog(event);
      } catch (e: any) {
        if (e?.message?.match(/no matching event/)) return error('unknown topic0: ' + event.topics[0], 204);
        else return error(e.toString(), 205);
      }
      currentUpdateBlock = event.blockNumber;
      switch (parsed.name) {
        case 'WhitelistShareholder':
          return await handleWhitelistShareholder(vault, parsed.args.newShareholder);
        case 'RevokeShareholder':
          return await handleRevokeShareholder(vault, parsed.args.newShareholder);
        case 'Deposit':
          return await handleDeposit(vault, event, parsed.args as unknown as DepositEvent);
        case 'Withdraw':
          return await handleWithdraw(vault, event, parsed.args as unknown as WithdrawEvent);
        default:
          return error('ignored event: ' + parsed.name, 6);
      }
    });

    return success(results.reduce((memo, result) => memo + '\n' + result?.message, ''));
  } catch (e: any) {
    if (e?.message && !e.message.match(/No records found/)) return error('Etherscan API returned error: ' + e, 206);
    events = [];
  }
  await prisma.vault.update({
    data: {
      assetsUnderManagement: vaultImportData.assetsUnderManagement,
      assetsInUse: vaultImportData.assetsInUse,
      totalSupply: vaultImportData.totalSupply,
      sharePrice: vaultImportData.sharePrice
    },
    where: { id: vault.id }
  });
  return success('Vault ' + vault.name + ' has been scanned.');
}

async function handleWhitelistShareholder(vault: Vault, newShareholder: string): Promise<CLIResult> {
  const shareholder = await prisma.vaultShareholder.findFirst({ where: { address: newShareholder, vaultId: vault.id } });
  if (!shareholder) await prisma.vaultShareholder.create({ data: { address: newShareholder, vaultId: vault.id } });
  else await prisma.vaultShareholder.update({ where: { id: shareholder.id }, data: { isRemoved: false } });
  return success('WhitelistShareholder event handled for vault ' + vault.address + ', shareholder ' + newShareholder);
}

async function handleRevokeShareholder(vault: Vault, newShareholder: string): Promise<CLIResult> {
  const shareholder = await prisma.vaultShareholder.findFirst({ where: { address: newShareholder, vaultId: vault.id } });
  if (!shareholder) await prisma.vaultShareholder.create({ data: { address: newShareholder, vaultId: vault.id } });
  else await prisma.vaultShareholder.update({ where: { id: shareholder.id }, data: { isRemoved: true } });
  return success('RevokeShareholder event handled for vault ' + vault.address + ', shareholder ' + newShareholder);
}

async function handleDeposit(vault: Vault, event: EtherscanLogEvent, log: DepositEvent): Promise<CLIResult> {
  const shareholder = await prisma.vaultShareholder.findFirst({ where: { address: log.owner, vaultId: vault.id } });
  if (!shareholder) return error('Shareholder ' + log.owner + ' not found in vault ' + vault.address, 7);
  const timeStamp = moment.unix(event.timeStamp).toDate();
  try {
    await prisma.vaultShareholderTransaction.create({
      data: {
        shareholderId: shareholder.id,
        assets: log.assets.toString(),
        shares: log.shares.toString(),
        txHash: event.transactionHash,
        txIndex: event.transactionIndex,
        when: timeStamp,
        isDeposit: true,
        vaultId: vault.id
      }
    });
  } catch (e: any) {
    if (e?.message?.match(/unique constraint failed/i)) return success('Skipping duplicate Deposit event: ' + event.transactionHash);
    else return error(e.toString(), 299);
  }
  return success('Deposit event handled for vault ' + vault.address + ', shareholder ' + log.owner + ', txHash ' + event.transactionHash);
}

async function handleWithdraw(vault: Vault, event: EtherscanLogEvent, log: DepositEvent): Promise<CLIResult> {
  const shareholder = await prisma.vaultShareholder.findFirst({ where: { address: log.owner, vaultId: vault.id } });
  if (!shareholder) return error('Shareholder ' + log.owner + ' not found in vault ' + vault.address, 208);
  const timeStamp = moment.unix(event.timeStamp).toDate();
  try {
    await prisma.vaultShareholderTransaction.create({
      data: {
        shareholderId: shareholder.id,
        assets: log.assets.toString(),
        shares: log.shares.toString(),
        txHash: event.transactionHash,
        txIndex: event.transactionIndex,
        when: timeStamp,
        isDeposit: false,
        vaultId: vault.id
      }
    });
  } catch (e: any) {
    if (e?.message?.match(/unique constraint failed/i)) return success('Skipping duplicate Withdraw event: ' + event.transactionHash);
    else return error(e.toString(), 299);
  }

  return success('Withdraw event handled for vault ' + vault.address + ', shareholder ' + log.owner + ', txHash ' + event.transactionHash);
}
