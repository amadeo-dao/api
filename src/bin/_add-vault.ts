import { PrismaClient } from '@prisma/client';
import { getAddress } from 'ethers/lib/utils';
import _ from 'lodash';
import { CLIResult, error, success } from '../lib/cli';
import { importVault } from '../lib/vault';
const prisma = new PrismaClient();

export async function addVault(address?: string): Promise<CLIResult> {
  if (!address || address === '') throw new Error('** Address is invalid.');
  try {
    address = getAddress(address);
  } catch (e) {
    return error('Invalid address format: ' + address, 2);
  }
  const data = await prisma.vault.findFirst({ where: { address } });
  if (!!data) {
    return error(`Vault ${data.name} already present.`, 1);
  }
  const vault = await importVault(address);

  const { id } = await prisma.vault.create({
    data: _.pick(vault, [
      'address',
      'name',
      'symbol',
      'decimals',
      'totalSupply',
      'assetsUnderManagement',
      'assetsInUse',
      'sharePrice',
      'lastUpdateBlock'
    ])
  });
  await prisma.vaultAsset.create({
    data: { vaultId: id, ...vault.asset }
  });
  return success('Vault ' + vault.name + ' has been added.');
}
