import { ethers } from 'ethers';

export function getProvider(): ethers.providers.Provider {
  const env: string | undefined = process.env.NODE_ENV;
  if (!env || env === 'development') return getAnvilProvider();
  if (env === 'production') return getAlchemyProvider();
  throw new Error('Unknown value for NODE_ENV: ' + env);
}

export function getAnvilProvider(): ethers.providers.Provider {
  return new ethers.providers.JsonRpcProvider('http://localhost:8545');
}

export function getAlchemyProvider(): ethers.providers.Provider {
  return new ethers.providers.AlchemyProvider(
    'homestead',
    process.env.ALCHEMY_KEY
  );
}
