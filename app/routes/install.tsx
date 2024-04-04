import { frameResponse, getSharedEnv } from "~/lib/utils.server";

export async function loader() {
  const env = getSharedEnv();
  return frameResponse({
    title: "paperboy | left-click tip",
    description: "one click tipping on farcaster",
    image: `${env.hostUrl}/install.png`,
    postUrl: `${env.hostUrl}/api/install`,
    cacheTtlSeconds: 0,
    buttons: [
      {
        text: "Install",
        isRedirect: true,
      },
    ],
  });
}
