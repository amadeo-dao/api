import { ethers } from 'ethers';
import { getProvider } from './providers';

export const erc20ABI = [
  'function balanceOf(address) public view returns (uint256)',
  'function decimals() public view returns (uint8)',
  'function name() public view returns (string)',
  'function symbol() public view returns (string)',
  'function totalSupply() public view returns (uint256)'
];

export type Erc20 = {
  address: string;
  decimals: number;
  name: string;
  symbol: string;
  totalSupply: string;
};

export async function importErc20(address: string): Promise<Erc20> {
  const provider = getProvider();
  const contract = new ethers.Contract(address, erc20ABI, provider);
  const [decimals, name, symbol, totalSupply] = await Promise.all([
    contract.decimals(),
    contract.name(),
    contract.symbol(),
    contract.totalSupply()
  ]);
  return {
    address,
    decimals,
    name,
    symbol,
    totalSupply
  };
}
