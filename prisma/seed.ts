import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const clients = [
    {
      name: 'Ina Paarman',
      domain: 'www.paarman.co.za',
      ga4PropertyId: '123456789',
      semrushProjectId: 'project-id-1',
      clickupListId: '901234567',
      color: '#534AB7',
    },
    {
      name: 'Client 2',
      domain: 'www.client2.co.za',
      ga4PropertyId: '987654321',
      semrushProjectId: 'project-id-2',
      clickupListId: '901234568',
      color: '#1D9E75',
    },
    // ... repeat for all 7
  ]

  for (const client of clients) {
    await prisma.client.upsert({
      where: { domain: client.domain },
      update: client,
      create: client,
    })
    console.log(`✓ ${client.name}`)
  }
}

main().then(() => prisma.$disconnect())
