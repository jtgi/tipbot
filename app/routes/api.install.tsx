import { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "remix-typedjson";

export async function action({ request }: ActionFunctionArgs) {
  const origin = request.headers.get("origin");

  if (origin && origin.includes("nook")) {
    return redirect(
      `https://nook.social/~/add-cast-action?actionType=post&name=Tip&icon=gift&postUrl=https%3A%2F%2Fpaperboy.bot%2Fapi%2Fcustom-tip`
    );
  } else {
    return redirect(
      `https://warpcast.com/~/add-cast-action?actionType=post&name=Tip&icon=gift&postUrl=https%3A%2F%2Fpaperboy.bot%2Fapi%2Fcustom-tip`
    );
  }
}
