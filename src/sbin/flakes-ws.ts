// Start apollo graphql server
import { ApolloServer } from '@apollo/server';
import fs from 'fs';

import { startStandaloneServer } from '@apollo/server/standalone';
import moment from 'moment';
import { db } from '../lib/db';

const typeDefs = '' + fs.readFileSync('src/schema.graphql');

const resolvers = {
  Vault: {
    asset: async (parent: any) => {
      return db.vault.findUnique({ where: { address: parent.address } }).asset();
    },
    shareholders: async (parent: any) => {
      return db.vault.findUnique({ where: { address: parent.address } }).shareholders();
    }
  },
  Shareholder: {
    transactions: async (parent: any) => {
      return db.shareholderTx.findMany({
        where: { shareholderId: parent.id, vaultId: parent.vaultId },
        orderBy: { timeStamp: 'asc' }
      });
    }
  },
  ShareholderTransaction: {
    timeStamp: (parent: any) => moment(parent.when).unix()
  },
  Query: {
    vaults: () => db.vault.findMany()
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
