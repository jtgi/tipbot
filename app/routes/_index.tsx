import { ClientOnly } from "remix-utils/client-only";
import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useNavigate } from "@remix-run/react";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import { Button } from "~/components/ui/button";
import { getSharedEnv } from "~/lib/utils.server";
import { useEffect, useRef, useState } from "react";
import { authenticator, commitSession, getSession } from "~/lib/auth.server";
import { ArrowRight, CheckIcon, Loader } from "lucide-react";
import { Alert } from "~/components/ui/alert";
import { toast } from "sonner";

// export meta
export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: "paperboy" },
    {
      property: "og:title",
      content: "paperboy",
    },
    {
      name: "description",
      content: "one click tipping on farcaster",
    },
    {
      property: "fc:frame",
      content: "vNext",
    },
    {
      property: "fc:frame:image",
      content: `${data.env.hostUrl}/install-degen.png`,
    },
    {
      property: "og:image",
      content: `${data.env.hostUrl}/install-degen.png`,
    },
    {
      property: "fc:frame:button:1",
      content: "Install Cast Action",
    },
    {
      property: "fc:frame:button:1:action",
      content: "post_redirect",
    },
    {
      property: "fc:frame:post_url",
      content: `${data.env.hostUrl}/api/install-degen?origin=${data.origin}`,
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  const env = getSharedEnv();
  const url = new URL(request.url);
  const source = url.searchParams.get("source") || null;
  const origin = request.headers.get("origin") || "warpcast.com";

  return typedjson({
    env,
    user,
    source,
    origin,
  });
}

export default function Home() {
  const { env, user, source } = useTypedLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [loggingIn, setLoggingIn] = useState(false);
  const [signInComplete, setSignInComplete] = useState(false);

  const onSuccess = (data: { signer_uuid: string; fid: string }) => {
    setLoggingIn(true);

    const params = new URLSearchParams();
    params.append("signerUuid", data.signer_uuid);
    params.append("fid", data.fid);
    source && params.append("source", source);

    navigate(`/auth/neynar?${params}`, {
      replace: true,
    });
  };

  useEffect(() => {
    function appendButton() {
      let script = document.getElementById("siwn-script") as HTMLScriptElement | null;

      if (!script) {
        script = document.createElement("script");
        script.id = "siwn-script";
        document.body.appendChild(script);
      }

      script.src = "https://neynarxyz.github.io/siwn/raw/1.2.0/index.js";
      script.async = true;
      script.defer = true;

      document.body.appendChild(script);
    }

    function bindSignInSuccess() {
      const win = window as any;

      if (!win._onSignInSuccess) {
        win._onSignInSuccess = onSuccess;
      }
    }

    appendButton();
    bindSignInSuccess();
  }, []);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center min-h-screen bg-[#04abd7]">
      <div className="max-w-xl flex flex-col justify-center items-center gap-8">
        <div className="flex flex-col items-center">
          <Link to="/~" className="no-underline">
            <h1 className="text-6xl logo text-white opacity-80">PAPERBOY</h1>
          </Link>
          <h2 className="font-normal mb-8 opacity-70 text-white">One click tipping on Farcaster</h2>
        </div>
      </div>

      <hr />

      {(() => {
        if ((user && source) || (signInComplete && source)) {
          if (source.includes("warpcast")) {
            return (
              <Button asChild size="xl">
                <Link className="no-underline" to="https://warpcast.com/~/channel/paperboy">
                  Back to Warpcast
                </Link>
              </Button>
            );
          } else {
            <Alert className="max-w-xl mx-auto">
              <div>
                <CheckIcon /> Connection Complete. Go back to the frame to continue.
              </div>
            </Alert>;
          }
        } else {
          return (
            <ClientOnly fallback={<Button size="xl">Loading...</Button>}>
              {() => {
                return (
                  <>
                    {loggingIn ? (
                      <Button size={"xl"} className="w-[200px]">
                        <Loader className="animate-spin w-5 h-5" />
                      </Button>
                    ) : (
                      <div
                        onClick={() => setLoggingIn(true)}
                        className="neynar_signin"
                        data-theme="dark"
                        data-styles='{ "font-size": "16px", "font-weight": "bold" }'
                        data-client_id={env.neynarClientId}
                        data-success-callback="_onSignInSuccess"
                      />
                    )}
                  </>
                );
              }}
            </ClientOnly>
          );
        }
      })()}
      <p className="text-white text-sm mt-10 opacity-50 font-mono">
        made by{" "}
        <a href="https://warpcast.com/jtgi" target="_blank">
          @jtgi
        </a>
      </p>
    </div>
  );
}
