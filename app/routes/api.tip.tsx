import { ActionFunctionArgs, json } from "@remix-run/node";
import invariant from "tiny-invariant";
import { db } from "~/lib/db.server";
import { computeTipAmount, tipAllowance } from "~/lib/degen.server";
import { neynar } from "~/lib/neynar.server";
import { formatZodError, getSharedEnv, parseMessage } from "~/lib/utils.server";
import { TipSettingsSchema } from "./~._index";

export async function action({ request }: ActionFunctionArgs) {
  const data = await request.json();
  const env = getSharedEnv();

  const fid = data.fid;
  const hash = data.hash;
  //   const message = await parseMessage(data);
  //   const fid = String(message.action.interactor.fid)
  //   const hash = message.action.cast.hash

  const user = await db.user.findFirst({
    where: {
      id: fid,
    },
  });

  if (!user) {
    return json(
      {
        message: `Sign up first at ${env.hostUrl}`,
      },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const urlQuery = Object.fromEntries(url.searchParams.entries());
  const result = TipSettingsSchema.safeParse(urlQuery);

  if (!result.success) {
    return json(
      {
        message: `Oops${formatZodError(result.error)}`,
      },
      { status: 400 }
    );
  }
  const allowance = await tipAllowance({ fid: user.id });
  const tipAmount = computeTipAmount({
    tipAllowance: allowance,
    amount: result.data.tipAmount,
    type: result.data.tipType,
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
      console.error(e.response?.data || e.message || "Unknown error");
      return null;
    });

  if (reply === null) {
    return json({
      message: `Failed to publish cast`,
    });
  }

  console.log(`${user.id} replied ${reply.hash}`, reply);

  return json({
    message: `Tipped ${tipAmount} $DEGEN`,
  });
}
