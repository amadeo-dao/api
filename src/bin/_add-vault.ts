import { getAddress } from 'ethers/lib/utils';
import { CLIResult, error, success } from '../lib/cli';
import { db } from '../lib/db';
import { Vault } from '../lib/vault';

export async function addVault(address?: string): Promise<CLIResult | CLIResult[]> {
  if (!address || address === '') return error('Address is required.', 101);
  try {
    address = getAddress(address);
  } catch (e) {
    return error('Invalid address format: ' + address, 102);
  }
  const isPresent = !!(await db.vault.findFirst({ where: { address }, select: { id: true } }));
  if (!!isPresent) {
    return error(`Vault ${address} already present.`, 103);
  }
  const vault = await Vault.import(address);
  await vault.save();
  await vault.asset?.save();

  return success('Vault ' + vault.name + ' has been added.');
}
