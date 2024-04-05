import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const source = url.searchParams.get("source") ?? undefined;
  return await authenticator.authenticate("neynar", request, {
    successRedirect: source ? `/~?source=${source}` : `/~`,
    failureRedirect: "/?error=no-access",
  });
}

export default function Screen() {
  return (
    <div className="flex h-screen flex-row items-center justify-center">
      Whops! You should have already been redirected.
    </div>
  );
}
