import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const vault = await prisma.vault.create({
    data: {
      name: 'Coinflakes Investment Vault',
      address: ''
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })

  .catch(async (e) => {
    console.error(e);

    await prisma.$disconnect();

    process.exit(1);
  });
