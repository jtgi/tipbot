import { ClientOnly } from "remix-utils/client-only";
import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useNavigate } from "@remix-run/react";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import { Button } from "~/components/ui/button";
import { getSharedEnv } from "~/lib/utils.server";
import { useEffect, useRef, useState } from "react";
import { authenticator } from "~/lib/auth.server";
import { ArrowRight, Loader } from "lucide-react";

// export meta
export const meta: MetaFunction<typeof loader> = (data) => {
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
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  const env = getSharedEnv();
  return typedjson({
    env,
    user,
  });
}

export default function Home() {
  const { env, user } = useTypedLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [loggingIn, setLoggingIn] = useState(false);
  const coin = useRef<HTMLAudioElement>();

  const onSuccess = (data: { signer_uuid: string; fid: string }) => {
    setLoggingIn(true);

    const params = new URLSearchParams();
    params.append("signerUuid", data.signer_uuid);
    params.append("fid", data.fid);

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

      {user ? (
        <Button asChild>
          <Link to="/~" className="no-underline">
            Go to App <ArrowRight className="pl-2 w-4 h-4" />
          </Link>
        </Button>
      ) : (
        <ClientOnly fallback={<Button>Loading...</Button>}>
          {() => (
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
          )}
        </ClientOnly>
      )}
      <p className="text-white text-sm mt-10 opacity-50 font-mono">
        made by{" "}
        <a href="https://warpcast.com/jtgi" target="_blank">
          @jtgi
        </a>
      </p>
    </div>
  );
}
