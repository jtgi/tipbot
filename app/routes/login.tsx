import { SignInButton, StatusAPIResponse } from "@farcaster/auth-kit";
import { ArrowTopRightIcon } from "@radix-ui/react-icons";
import { LoaderFunctionArgs, json } from "@remix-run/node";
import { Link, useNavigate } from "@remix-run/react";
import { useCallback } from "react";
import { redirect, typedjson } from "remix-typedjson";
import invariant from "tiny-invariant";
import { Button } from "~/components/ui/button";
import { authenticator } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);

  if (user) {
    throw redirect("/");
  }

  return json({});
}

export default function Login() {
  const navigate = useNavigate();

  const handleSuccess = useCallback((res: StatusAPIResponse) => {
    invariant(res.message, "message is required");
    invariant(res.signature, "signature is required");
    invariant(res.nonce, "nonce is required");

    const params = new URLSearchParams();
    params.append("message", res.message);
    params.append("signature", res.signature);
    params.append("nonce", res.nonce);
    res.username && params.append("username", res.username);
    res.pfpUrl && params.append("pfpUrl", res.pfpUrl);

    navigate(`/auth/farcaster?${params}`, {
      replace: true,
    });
  }, []);

  return (
    <div className="px-8 h-full w-full flex flex-col items-center justify-center min-h-screen">
      <div className="max-w-xl">
        <h1 className="text-6xl logo">glass</h1>
        <h2 className="font-normal mb-8">Gate content with Farcaster Frames</h2>

        <div className="space-y-4">
          <p>
            <ul className="ml-4 list-outside list-disc space-y-2">
              <li>
                Create exclusive content for followers, ERC-20 and ERC-721 token
                holders. Require minimum token balances or even specific tokens.
              </li>
              <li>
                Boost engagement by requiring a post be liked, recasted,
                followed before visible.
              </li>
              <li>
                Reveal any text content, image, even other frames with more
                redemption formats coming soon.
              </li>
            </ul>
          </p>

          <p className="text-xs text-gray-600 ml-4">
            Available on Mainnet, Base, Optimism, and Zora
          </p>

          <div className="pt-6">
            <Button asChild className="w-full sm:w-auto">
              <Link
                className="no-underline"
                to="https://google.com"
                target="_blank"
                rel="noreferrer"
              >
                Preorder <ArrowTopRightIcon className="ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}