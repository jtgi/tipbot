import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";

import { typedjson, useTypedLoaderData } from "remix-typedjson";
import invariant from "tiny-invariant";
import {
  errorResponse,
  formatZodError,
  getSharedEnv,
  requireUser,
  requireUserCanModerateChannel as requireUserCanModerateChannel,
  sleep,
  successResponse,
} from "~/lib/utils.server";
import { Form, useFetcher } from "@remix-run/react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { getChannel, pageChannelCasts } from "~/lib/neynar.server";
import { FullModeratedChannel, validateCast } from "./api.webhooks.neynar";
import { db } from "~/lib/db.server";
import { getSession } from "~/lib/auth.server";
import { Loader2 } from "lucide-react";

const SWEEP_LIMIT = 500;

export async function loader({ request, params }: LoaderFunctionArgs) {
  invariant(params.id, "id is required");

  const user = await requireUser({ request });
  const moderatedChannel = await requireUserCanModerateChannel({
    userId: user.id,
    channelId: params.id,
  });

  const session = await getSession(request.headers.get("Cookie"));
  const isActive = isSweepActive(session.get(`sweep:${moderatedChannel.id}`));

  return typedjson({
    user,
    isSweepActive: isActive,
    moderatedChannel,
    env: getSharedEnv(),
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  invariant(params.id, "id is required");

  const user = await requireUser({ request });
  const moderatedChannel = await requireUserCanModerateChannel({
    userId: user.id,
    channelId: params.id,
  });
  const session = await getSession(request.headers.get("Cookie"));

  const formData = await request.formData();
  const rawData = Object.fromEntries(formData.entries());
  const result = z
    .object({
      intent: z.enum(["sweep"]),
    })
    .safeParse(rawData);

  if (!result.success) {
    return errorResponse({
      request,
      message: formatZodError(result.error),
    });
  }

  if (result.data.intent === "sweep") {
    if (isSweepActive(session.get(`sweep:${moderatedChannel.id}`))) {
      return successResponse({
        request,
        message: "Sweep already in progress. Hang tight.",
      });
    }

    console.log(`Sweeping channel ${moderatedChannel.id}`);
    sweep({
      channelId: moderatedChannel.id,
      moderatedChannel,
      limit: SWEEP_LIMIT,
    }).then(() => {
      console.log(`Sweep of ${moderatedChannel.id} complete`);
    });

    session.set(`sweep:${moderatedChannel.id}`, new Date().toISOString());

    return successResponse({
      request,
      session,
      message:
        "Sweeping! This will take a while. Monitor progress in the logs.",
    });
  } else {
    return errorResponse({
      request,
      message: "Invalid intent",
    });
  }
}

export default function Screen() {
  const { isSweepActive } = useTypedLoaderData<typeof loader>();

  return (
    <main className="space-y-6">
      <div>
        <p className="text-lg font-semibold">Tools</p>
      </div>
      <hr />
      <div className="space-y-3">
        <div>
          <p className="font-medium">Sweep</p>
          <p className="text-sm text-gray-500">
            Apply your moderation rules to the last {SWEEP_LIMIT} casts in your
            channel. Applies to root level casts only.
          </p>
        </div>

        <Form method="post">
          <Button
            className="w-full sm:w-auto min-w-[150px]"
            name="intent"
            disabled={isSweepActive}
            value="sweep"
            variant={"secondary"}
          >
            {isSweepActive ? (
              <>
                <Loader2 className="animate-spin inline w-4 h-4 mr-2" />
                Sweeping...
              </>
            ) : (
              "Sweep"
            )}
          </Button>
        </Form>
      </div>
    </main>
  );
}

export type SweepArgs = {
  channelId: string;
  moderatedChannel: FullModeratedChannel;
  limit: number;
};

export async function sweep(args: SweepArgs) {
  const channel = await getChannel({ name: args.channelId });

  let castsChecked = 0;
  for await (const page of pageChannelCasts({ id: args.channelId })) {
    if (castsChecked >= args.limit) {
      console.log(
        `${channel.id} sweep: reached limit of ${args.limit} casts checked, stopping sweep`
      );
      break;
    }

    castsChecked += page.casts.length;

    const alreadyProcessed = await db.moderationLog.findMany({
      select: {
        castHash: true,
      },
      where: {
        castHash: {
          in: page.casts.map((cast) => cast.hash),
        },
      },
    });

    const alreadyProcessedHashes = new Set(
      alreadyProcessed
        .filter((log): log is { castHash: string } => !!log.castHash)
        .map((log) => log.castHash)
    );

    const unprocessedCasts = page.casts.filter(
      (cast) => !alreadyProcessedHashes.has(cast.hash)
    );

    for (const cast of unprocessedCasts) {
      console.log(`${channel.id} sweep: processing cast ${cast.hash}...`);

      await validateCast({
        cast,
        channel,
        moderatedChannel: args.moderatedChannel,
      });

      await sleep(500);
    }
  }
}

function isSweepActive(dateCreatedString: string | undefined): boolean {
  if (!dateCreatedString) {
    return false;
  }

  const dateCreated = new Date(dateCreatedString);
  return Date.now() - dateCreated.getTime() < 1000 * 60 * 15;
}