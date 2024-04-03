import { db } from "~/lib/db.server";

async function seed() {
  const signerUuid = process.env.DEMO_SIGNER_UUID!;
  const user = await db.user.upsert({
    where: {
      id: "5179",
    },
    create: {
      id: "5179",
      username: "jtgi",
      signerUuid: "gm",
      actionType: "degen",
    },
    update: {
      id: "5179",
      signerUuid: "gm",
    },
  });
}

seed()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
