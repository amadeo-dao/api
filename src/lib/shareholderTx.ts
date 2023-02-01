import { ethers } from 'ethers';
import { db } from './db';
import { Shareholder } from './shareholder';
import { Vault } from './vault';

export type ShareholderTxConstructorProps = {
  id?: number;
  shareholderId: number;
  vaultId: number;
  txHash: string;
  logIndex: number;
  txType: 'Deposit' | 'Withdraw';
  assets: string;
  shares: string;
};

export class ShareholderTx {
  public id?: number;
  public shareholderId: number;
  public vaultId: number;
  public txHash: string;
  public logIndex: number;
  public txType: 'Deposit' | 'Withdraw';
  public assets: string;
  public shares: string;

  constructor(props: ShareholderTxConstructorProps) {
    this.id = props.id;
    this.shareholderId = props.shareholderId;
    this.vaultId = props.vaultId;
    this.txHash = props.txHash;
    this.logIndex = props.logIndex;
    this.txType = props.txType;
    this.assets = props.assets;
    this.shares = props.shares;
  }

  async save(): Promise<ShareholderTx> {
    const tx = await db.shareholderTx.findUnique({
      where: { shareholderId_txHash_logIndex: { shareholderId: this.shareholderId, txHash: this.txHash, logIndex: this.logIndex } }
    });
    if (!tx) {
      const { id } = await db.shareholderTx.create({
        data: this.toDb()
      });
      this.id = id;
    } else {
      await db.shareholderTx.update({
        where: { id: tx.id },
        data: this.toDb()
      });
    }
    return this;
  }

  toDb() {
    return {
      id: this.id,
      shareholderId: this.shareholderId,
      vaultId: this.vaultId,
      txHash: this.txHash,
      logIndex: this.logIndex,
      txType: this.txType,
      assets: this.assets,
      shares: this.shares
    };
  }

  static async importFromEvent(event: ethers.Event): Promise<ShareholderTx> {
    const owner = event.args?.owner;
    const shares = event.args?.shares;
    const assets = event.args?.assets;
    if (!owner) throw new Error('invalid event data, missing [owner]');
    if (!shares) throw new Error('invalid event data, missing [shares]');
    if (!assets) throw new Error('invalid event data, missing [assets]');
    const vault = await Vault.loadByAddress(event.address);
    if (!vault || !vault.id) throw new Error('vault not found for address ' + event.address);

    let shareholder = await Shareholder.loadByAddress(vault.id, owner);
    if (!shareholder) {
      shareholder = await Shareholder.import(vault.address, owner);
      shareholder.vaultId = vault.id;
      shareholder = await shareholder.save();
    } else {
      shareholder = await shareholder.sync();
    }
    if (!shareholder.id) throw new Error('shareholder data has no id');
    if (event.event === 'Deposit') {
      return new ShareholderTx({
        shareholderId: shareholder.id,
        vaultId: vault.id,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        txType: 'Deposit',
        assets: assets.toString(),
        shares: shares.toString()
      });
    }
    if (event.event === 'Withdraw') {
      return new ShareholderTx({
        shareholderId: shareholder.id,
        vaultId: vault.id,
        txHash: event.transactionHash,
        logIndex: event.logIndex,
        txType: 'Withdraw',
        assets: assets.toString(),
        shares: shares.toString()
      });
    }
    throw new Error('invalid shareholder tx event type: ' + event.event);
  }
}
