import { ActionFunctionArgs, json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { computeTipAmount, tipAllowance } from "~/lib/degen.server";
import { neynar } from "~/lib/neynar.server";
import { getSharedEnv, parseMessage } from "~/lib/utils.server";

export async function action({ request }: ActionFunctionArgs) {
  const data = await request.json();
  const env = getSharedEnv();

  const message = await parseMessage(data);
  const fid = String(message.action.interactor.fid);
  const hash = message.action.cast.hash;

  const user = await db.user.findFirst({
    where: {
      id: fid,
    },
  });

  if (!user || !user.tipAmount || !user.tipType) {
    return json(
      {
        message: `Sign up at ${env.hostUrl}`,
      },
      { status: 404 }
    );
  }

  const allowance = await tipAllowance({ fid: user.id });
  const tipAmount = computeTipAmount({
    tipAllowance: allowance,
    amount: user.tipAmount,
    type: user.tipType as "pct" | "amt",
  });

  if (tipAmount === 0) {
    return json(
      {
        message: `No tips left.`,
      },
      { status: 400 }
    );
  }

  const reply = await neynar
    .publishCast(user.signerUuid, `${tipAmount} $DEGEN`, {
      replyTo: hash,
    })
    .catch((e) => {
      console.error(e.message);
      return null;
    });

  if (reply === null) {
    return json(
      {
        message: `Error tipping. Try again.`,
      },
      { status: 400 }
    );
  }

  if (reply) {
    console.log(`${user.id} replied ${reply.hash}`, reply);
  }

  return json({
    message: `Tipped ${tipAmount} $DEGEN`,
  });
}
