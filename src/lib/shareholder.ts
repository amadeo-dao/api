import { BigNumber, ethers } from 'ethers';
import { db } from './db';
import { erc20ABI } from './erc20';
import { getProvider } from './providers';
import { Vault, vaultABI } from './vault';

export type ShareholderConstructorProps = {
  id?: number;
  address: string;
  shares: string;
  assetBalance: string;
  vaultId: number;
};

export class Shareholder {
  id?: number;
  address: string;
  shares: string;
  assetBalance: string;
  vaultId: number;

  constructor(props: ShareholderConstructorProps) {
    this.id = props.id;
    this.address = props.address;
    this.shares = props.shares;
    this.assetBalance = props.assetBalance;
    this.vaultId = props.vaultId;
  }

  static async loadByAddress(vaultId: number, address: string): Promise<Shareholder | null> {
    const data = await db.shareholder.findUnique({ where: { vaultId_address: { address, vaultId } } });
    if (!data) return null;
    return new Shareholder({ ...data });
  }

  async save(): Promise<Shareholder> {
    if (this.vaultId === 0) throw new Error('shareholder data set is missing [vaultId].');
    if (!this.id) {
      const { id } = await db.shareholder.create({ data: { ...this } });
      this.id = id;
    } else {
      const { id } = await db.shareholder.upsert({
        where: { id: this.id },
        create: { ...this },
        update: { ...this }
      });
      this.id = id;
    }
    return this;
  }

  async sync(): Promise<Shareholder> {
    const provider = getProvider();
    const vault = await Vault.load(this.vaultId);
    if (!vault) throw new Error('vault for asset ' + this.id + ' not found.');
    if (!vault.asset) throw new Error(`vault ${vault.id} has no asset.`);
    const vaultContract = new ethers.Contract(vault.address, vaultABI, provider);
    const assetContract = new ethers.Contract(vault.asset.address, erc20ABI, provider);
    this.shares = (await vaultContract.balanceOf(this.address)).toString();
    this.assetBalance = (await assetContract.balanceOf(this.address)).toString();
    await this.save();
    return this;
  }

  static async import(vaultAddress: string, shareholderAddress: string): Promise<Shareholder> {
    const provider = getProvider();
    const vaultContract = new ethers.Contract(vaultAddress, vaultABI, provider);
    const assetAddress = await vaultContract.asset();
    const assetContract = new ethers.Contract(assetAddress, erc20ABI, provider);
    const shares = (await vaultContract.balanceOf(shareholderAddress)) as BigNumber;
    const assetBalance = (await assetContract.balanceOf(shareholderAddress)) as BigNumber;
    return new Shareholder({
      address: shareholderAddress,
      shares: shares.toString(),
      assetBalance: assetBalance.toString(),
      vaultId: 0
    });
  }
}
