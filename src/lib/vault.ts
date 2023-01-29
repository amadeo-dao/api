import { BigNumber, ethers } from 'ethers';
import { BN_1E } from './constants';
import { erc20ABI } from './erc20';
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
  'function assetsUnderManagement() public view returns (uint256)',
  'function convertToAssets(uint256) public view returns (uint256)',
  'function decimals() public view returns (uint8)',
  'function manager() public view returns (address)',
  'function name() public view returns (string)',
  'function symbol() public view returns (string)',
  'function totalAssets() public view returns (uint256)',
  'function totalSupply() public view returns (uint256)'
];

export type Vault = {
  id?: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  asset: VaultAsset;
  assetsUnderManagement: string;
  assetsInUse: string;
  sharePrice: string;
  totalSupply: string;
  manager: string;
  lastUpdateBlock: number;
};

export type VaultAsset = {
  id?: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
};

export async function importVault(address: string): Promise<Vault> {
  const provider = getProvider();
  const currentBlock = (await provider.getBlockNumber()) as number;
  const contract = new ethers.Contract(address, vaultABI, provider);
  const decimals = (await contract.decimals()) as number;
  const assetAddress = (await contract.asset()) as string;
  const manager = (await contract.manager()) as string;
  const sharePrice = (await contract.convertToAssets(BN_1E(decimals))) as BigNumber;
  try {
    return {
      address,
      name: (await contract.name()) as string,
      symbol: (await contract.symbol()) as string,
      decimals,
      asset: await importVaultAsset(assetAddress),
      totalSupply: ((await contract.totalSupply()) as BigNumber).toString(),
      assetsInUse: ((await contract.assetsInUse()) as BigNumber).toString(),
      assetsUnderManagement: ((await contract.totalAssets()) as BigNumber).toString(),
      sharePrice: sharePrice.toString(),
      manager,
      lastUpdateBlock: currentBlock
    };
  } catch (e) {
    throw new Error('** Unable to load contract at ' + address + ': ' + e);
  }
}

export async function importVaultAsset(address: string): Promise<VaultAsset> {
  const provider = getProvider();
  const contract = new ethers.Contract(address, erc20ABI, provider);
  const decimals = (await contract.decimals()) as number;
  try {
    return {
      address,
      name: (await contract.name()) as string,
      symbol: (await contract.symbol()) as string,
      decimals,
      totalSupply: ((await contract.totalSupply()) as BigNumber).toString()
    };
  } catch (e) {
    throw new Error('** Unable to load contract at ' + address + ': ' + e);
  }
}
