import { PrismaClient } from '@prisma/client';
import { getAddress } from 'ethers/lib/utils';
import _ from 'lodash';
import { CLIResult, error, success } from '../lib/cli';
import { importVault } from '../lib/vault';
const prisma = new PrismaClient();

export async function addVault(address?: string): Promise<CLIResult | CLIResult[]> {
  if (!address || address === '') return error('Address is required.', 101);
  try {
    address = getAddress(address);
  } catch (e) {
    return error('Invalid address format: ' + address, 102);
  }
  const data = await prisma.vault.findFirst({ where: { address } });
  if (!!data) {
    return error(`Vault ${data.name} already present.`, 103);
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
      'manager',
      'lastUpdateBlock'
    ])
  });
  await prisma.vaultAsset.create({
    data: { vaultId: id, ...vault.asset }
  });
  return success('Vault ' + vault.name + ' has been added.');
}
