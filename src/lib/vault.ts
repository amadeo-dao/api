import { BigNumber, ethers } from 'ethers';
import { Asset } from './asset';
import { BN_1E } from './constants';
import { db } from './db';
import { logger } from './logger';
import { getProvider } from './providers';

export const vaultABI = [
  'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)',
  'event Withdraw(address indexed sender, address indexed receiver, address indexed owner,uint256 assets, uint256 shares)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event WhitelistShareholder(address indexed newShareholder)',
  'event RevokeShareholder(address indexed newShareholder)',
  'event ChangeManager(address indexed newManager, address indexed oldManager)',
  'event UseAssets(address indexed receiver, uint256 amount)',
  'event ReturnAssets(address indexed sender, uint256 amount)',
  'event Gains(uint256 amount)',
  'event Loss(uint256 amount)',
  'event Fees(uint256 amount)',
  'function asset() public view returns (address)',
  'function assetsInUse() public view returns (uint256)',
  'function balanceOf(address) public view returns (uint256)',
  'function convertToAssets(uint256) public view returns (uint256)',
  'function decimals() public view returns (uint8)',
  'function deposit(uint256, address) public',
  'function manager() public view returns (address)',
  'function name() public view returns (string)',
  'function symbol() public view returns (string)',
  'function totalAssets() public view returns (uint256)',
  'function totalSupply() public view returns (uint256)',
  'function whitelistShareholder(address) public'
];

export type VaultConstructorProps = {
  id?: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  asset: Asset;
  assetsUnderManagement: string;
  assetsInUse: string;
  sharePrice: string;
  totalSupply: string;
  manager: string;
  lastUpdateBlock: number;
};

export class Vault {
  id?: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  asset: Asset;
  assetsUnderManagement: string;
  assetsInUse: string;
  sharePrice: string;
  totalSupply: string;
  manager: string;
  lastUpdateBlock: number;

  constructor(props: VaultConstructorProps) {
    this.id = props.id;
    this.address = props.address;
    this.name = props.name;
    this.symbol = props.symbol;
    this.decimals = props.decimals;
    this.asset = props.asset;
    this.assetsUnderManagement = props.assetsUnderManagement;
    this.assetsInUse = props.assetsInUse;
    this.sharePrice = props.sharePrice;
    this.totalSupply = props.totalSupply;
    this.manager = props.manager;
    this.lastUpdateBlock = props.lastUpdateBlock;
  }

  async save(): Promise<Vault> {
    if (!this.id) {
      const { id } = await db.vault.create({
        data: { ...this, asset: undefined },
        include: { asset: false }
      });
      this.id = id;
      logger.info('added new vault', { vault: this });
    } else {
      const { id } = await db.vault.upsert({
        where: { id: this.id },
        create: { ...this, asset: undefined },
        update: { ...this, asset: undefined },
        include: { asset: false }
      });
      this.id = id;
    }
    this.asset.vaultId = this.id;
    return this;
  }

  async sync(): Promise<Vault> {
    const provider = getProvider();
    const contract = new ethers.Contract(this.address, vaultABI, provider);
    this.lastUpdateBlock = (await provider.getBlockNumber()) as number;
    this.totalSupply = (await contract.totalSupply()).toString();
    this.assetsUnderManagement = (await contract.totalAssets()).toString();
    this.assetsInUse = (await contract.assetsInUse()).toString();
    this.sharePrice = (await contract.convertToAssets(BN_1E(this.decimals))).toString();
    await this.save();
    logger.info('synced vault', { vault: this });
    return this;
  }

  static async load(id: number): Promise<Vault | null> {
    const data = await db.vault.findUnique({
      where: { id },
      include: { asset: true }
    });
    if (!data) return null;
    if (!data.asset) throw new Error('vault database entry has no related asset entry');
    return new Vault({ ...data, asset: new Asset(data.asset) });
  }

  static async loadByAddress(address: string): Promise<Vault | null> {
    address = ethers.utils.getAddress(address);
    const data = await db.vault.findUnique({
      where: { address },
      include: { asset: true }
    });
    if (!data) return null;
    if (!data.asset) throw new Error('vault database entry has no related asset entry');
    return new Vault({
      ...data,
      asset: new Asset(data.asset)
    });
  }

  static async import(address: string): Promise<Vault> {
    const provider = getProvider();
    const lastUpdateBlock = (await provider.getBlockNumber()) as number;
    const contract = new ethers.Contract(address, vaultABI, provider);
    const decimals = (await contract.decimals()) as number;
    const [name, symbol, totalSupply, assetAddress, assetInUse, assetsUnderManagement, manager, sharePrice] = await Promise.all([
      (await contract.name()) as string,
      (await contract.symbol()) as string,
      ((await contract.totalSupply()) as BigNumber).toString(),
      (await contract.asset()) as string,
      (await contract.assetsInUse()) as BigNumber,
      (await contract.totalAssets()) as BigNumber,
      (await contract.manager()) as string,
      (await contract.convertToAssets(BN_1E(decimals))) as BigNumber
    ]);

    const asset = await Asset.import(assetAddress);

    return new Vault({
      address,
      name,
      symbol,
      decimals,
      asset,
      assetsUnderManagement: assetsUnderManagement.toString(),
      assetsInUse: assetInUse.toString(),
      sharePrice: sharePrice.toString(),
      totalSupply,
      manager,
      lastUpdateBlock
    });
  }
}
