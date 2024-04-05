import { frameResponse, getSharedEnv } from "~/lib/utils.server";

export async function loader() {
  const env = getSharedEnv();
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
