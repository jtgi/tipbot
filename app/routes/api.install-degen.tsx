import { ActionFunctionArgs, json } from "@remix-run/node";
import { redirect } from "remix-typedjson";
import invariant from "tiny-invariant";
import { db } from "~/lib/db.server";
import { tipAllowance } from "~/lib/degen.server";
import { frameResponse, getSharedEnv, parseMessage } from "~/lib/utils.server";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const data = await request.json();
    const message = await parseMessage(data);
    const env = getSharedEnv();

    const user = await db.user.findFirst({
      where: {
        id: String(message.action.interactor.fid),
      },
    });

    if (!user) {
      return json(
        {
          message: "Sign up at paperboy.bot first",
        },
        { status: 400 }
      );
    }

    const isPct = message.action.tapped_button.index === 1;
    const amountString = message.action.input?.text;

    if (!amountString) {
      return json(
        {
          message: "Invalid amount",
        },
        {
          status: 400,
        }
      );
    }

    const amount = parseInt(amountString);

    if (isPct) {
      const isValid = amount >= 0 && amount <= 100;
      if (!isValid) {
        return json(
          {
            message: "Invalid percentage, 0 to 100",
          },
          {
            status: 400,
          }
        );
      }
    }

    if (amount < 0) {
      return json(
        {
          message: "That's impossible sir",
        },
        {
          status: 400,
        }
      );
    }

    const isNook = request.headers.get("origin")?.includes("nook.social");
    const domain = !isNook ? "https://warpcast.com" : "https://nook.social";
    const wcUrl = new URL(`${domain}/~/add-cast-action`);
    wcUrl.searchParams.append(
      "url",
      `${env.hostUrl}/api/tip?type=degen&tipAmount=${amount}&tipType=${isPct ? "pct" : "amt"}`
    );
    return redirect(wcUrl.toString());
  } catch (e) {
    console.error(e);
    throw e;
  }
}
