import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { frameResponse, getSharedEnv, parseMessage } from "~/lib/utils.server";

export async function action({ request }: ActionFunctionArgs) {
  const env = getSharedEnv();
  const url = new URL(request.url);
  const origin = url.searchParams.get("origin");
  const data = await request.json();
  const message = await parseMessage(data);

  const user = await db.user.findFirst({
    where: {
      id: String(message.action.interactor.fid),
    },
  });

  if (!user) {
    return frameResponse({
      title: "Install Paperboy",
      description: "paperboy installer",
      cacheTtlSeconds: 0,
      image: `${env.hostUrl}/signup.png`,
      buttons: [
        {
          text: "Sign Up",
          link: `${env.hostUrl}?source=${origin}`,
        },
      ],
    });
  } else {
    return frameResponse({
      title: "paperboy | left-click tip",
      description: "one click tipping on farcaster",
      image: `${env.hostUrl}/install-degen.png`,
      postUrl: `${env.hostUrl}/api/install-degen`,
      cacheTtlSeconds: 0,
      input: "Enter an amount...",
      buttons: [
        {
          text: "% of Allowance",
          isRedirect: true,
        },
        {
          text: "Fixed Amount",
          isRedirect: true,
        },
      ],
    });
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const origin = request.headers.get("origin") || "warpcast.com";
  const env = getSharedEnv();
  return frameResponse({
    title: "paperboy | left-click tip",
    description: "one click tipping on farcaster",
    image: `${env.hostUrl}/install-degen.png`,
    cacheTtlSeconds: 0,
    postUrl: `${env.hostUrl}/install-degen?origin=${origin}`,
    buttons: [
      {
        text: "Setup",
      },
    ],
  });
  // return frameResponse({
  //   title: "paperboy | left-click tip",
  //   description: "one click tipping on farcaster",
  //   image: `${env.hostUrl}/install-degen.png`,
  //   postUrl: `${env.hostUrl}/api/install-degen`,
  //   cacheTtlSeconds: 0,
  //   input: "Enter an amount...",
  //   buttons: [
  //     {
  //       text: "% of Allowance",
  //       isRedirect: true,
  //     },
  //     {
  //       text: "Fixed Amount",
  //       isRedirect: true,
  //     },
  //   ],
  // });
}
