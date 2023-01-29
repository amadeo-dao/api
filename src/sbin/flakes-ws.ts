// Start apollo graphql server
import { ApolloServer } from '@apollo/server';
import fs from 'fs';

import { startStandaloneServer } from '@apollo/server/standalone';
import { PrismaClient } from '@prisma/client';
import moment from 'moment';

const typeDefs = '' + fs.readFileSync('src/schema.graphql');

const prisma = new PrismaClient();

const resolvers = {
  Vault: {
    asset: async (parent: any) => {
      return prisma.vault.findUnique({ where: { address: parent.address } }).VaultAsset();
    },
    shareholders: async (parent: any) => {
      return prisma.vault.findUnique({ where: { address: parent.address } }).VaultShareholders();
    }
  },
  Shareholder: {
    transactions: async (parent: any) => {
      return prisma.vaultShareholderTransaction.findMany({
        where: { shareholderId: parent.id, vaultId: parent.vaultId },
        orderBy: { when: 'asc' }
      });
    }
  },
  ShareholderTransaction: {
    timeStamp: (parent: any) => moment(parent.when).unix(),
    txType: (parent: any) => (parent.isDeposit ? 'DEPOSIT' : 'WITHDRAW')
  },
  Query: {
    vaults: () => prisma.vault.findMany()
  }
};

const server = new ApolloServer({ typeDefs, resolvers });

async function main() {
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 }
  });
  console.log(`🚀  Server ready at: ${url}`);
}
main();
