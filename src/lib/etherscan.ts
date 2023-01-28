import axios from 'axios';
import { BigNumber } from 'ethers';
import URI from 'urijs';

export type EtherscanLogEvent = {
  address: string;
  blockNumber: number;
  data: string;
  logIndex: number;
  topics: Array<string>;
  transactionHash: string;
  transactionIndex: number;
  timeStamp: number;
  gasPrice: BigNumber;
  gasUsed: BigNumber;
};

let etherscanInstance: EtherscanApiClient;
export function etherscan(): EtherscanApiClient {
  if (!etherscanInstance) {
    if (!process.env.ETHERSCAN_API_KEY) throw new Error('ETHERSCAN_API_KEY not set.');
    etherscanInstance = EtherscanApiClient.newInstance(1, process.env.ETHERSCAN_API_KEY);
  }
  return etherscanInstance;
}

class EtherscanApiClient {
  public axios: any;
  public baseUri: URI;

  constructor(options: { apiKey: string; baseUri: string }) {
    this.baseUri = URI(options.baseUri);
    this.axios = axios.create({
      baseURL: this.baseUri.toString(),
      timeout: 10000,
      params: { apiKey: options.apiKey }
    });
  }

  static newInstance(chainId: number, apiKey: string): EtherscanApiClient {
    let baseUri: string;
    switch (chainId) {
      case 1:
        baseUri = 'https://api.etherscan.io/api';
        break;
      default:
        throw new Error('Unknown chain id: ' + chainId);
    }
    return new EtherscanApiClient({ apiKey, baseUri });
  }

  async blockBefore(ts: number): Promise<number> {
    let blockStr = await this.call('block', 'getblocknobytime', {
      timestamp: ts,
      closest: 'before'
    });
    return parseInt(blockStr);
  }

  async blockTimestamp(blockNumber: number) {
    let block = await this.call('block', 'getblockreward', {
      blockno: blockNumber
    });
    return parseInt(block.timeStamp);
  }

  async importContractAbi(contractAddress: string): Promise<string | null> {
    let query = { address: contractAddress };
    try {
      return await this.call('contract', 'getabi', query);
    } catch (e: any) {
      if (e && e.message && e.message.match(/not verified/)) return null;
      throw new Error('' + e);
    }
  }

  async getLogEvents(address: string, fromBlock: number): Promise<Array<EtherscanLogEvent>> {
    let query = { address, fromBlock, toBlock: 'latest' };
    const events = await this.loadList('logs', 'getLogs', query);
    return events.map((e: any) => ({
      ...e,
      blockNumber: parseInt(e.blockNumber),
      logIndex: parseInt(e.logIndex),
      transactionIndex: parseInt(e.transactionIndex),
      gasPrice: BigNumber.from(e.gasPrice),
      gasUsed: BigNumber.from(e.gasUsed)
    }));
  }

  async loadList(module: string, action: string, query: object): Promise<Array<any>> {
    let pageSize = 1000;
    let page = 1;
    let list: Array<any> = [];
    while (pageSize === 1000) {
      let callQuery = {
        page,
        offset: 1000
      };
      callQuery = { ...callQuery, ...query };
      let items = await this.call(module, action, query);
      list = [...list, ...items];
      pageSize = items.length;
      page++;
    }
    return list;
  }

  async call(module: string, action: string, params: object): Promise<any> {
    let requestParams = { ...params, module, action };
    let res = await this.axios.get('', {
      params: requestParams
    });
    if (res.data) {
      if (module !== 'proxy' && res.data.status !== '1')
        throw new Error('API call returned with status ' + res.data.status + ': ' + res.data.message + ': ' + res.data.result);
      return res.data.result;
    }
    throw new Error('API call returned empty result.');
  }
}
