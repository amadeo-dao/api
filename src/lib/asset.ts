import { ethers } from 'ethers';
import { db } from './db';
import { erc20ABI } from './erc20';
import { getProvider } from './providers';

export type AssetConstructorProps = {
  id?: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  vaultId: number;
};

export class Asset {
  id?: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  vaultId: number;

  constructor(props: AssetConstructorProps) {
    this.id = props.id;
    this.address = props.address;
    this.name = props.name;
    this.symbol = props.symbol;
    this.decimals = props.decimals;
    this.vaultId = props.vaultId;
  }

  async save(): Promise<Asset> {
    if (!this.id) {
      const { id } = await db.asset.create({ data: { ...this } });
      this.id = id;
    } else {
      const { id } = await db.asset.upsert({
        where: { id: this.id },
        create: { ...this },
        update: { ...this }
      });
      this.id = id;
    }
    return this;
  }

  static async import(address: string): Promise<Asset> {
    const provider = getProvider();
    const contract = new ethers.Contract(address, erc20ABI, provider);
    const [name, symbol, decimals] = await Promise.all([
      (await contract.name()) as string,
      (await contract.symbol()) as string,
      (await contract.decimals()) as number
    ]);
    return new Asset({
      address,
      name,
      symbol,
      decimals,
      vaultId: 0
    });
  }
}
