/* eslint-disable react/no-unescaped-entities */
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, NavLink, Outlet, useFetcher } from "@remix-run/react";
import {
  ArrowLeft,
  Power,
  PowerCircle,
  PowerOff,
  Zap,
  ZapOff,
} from "lucide-react";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import invariant from "tiny-invariant";
import { z } from "zod";
import { SidebarNav } from "~/components/sub-nav";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { FieldLabel } from "~/components/ui/fields";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { db } from "~/lib/db.server";
import {
  requireUserIsChannelLead,
  requireUser,
  requireUserOwnsChannel,
  requireUserIsCohost,
} from "~/lib/utils.server";
import { getChannelHosts } from "~/lib/warpcast.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  invariant(params.id, "id is required");

  const user = await requireUser({ request });
  const channel = await requireUserOwnsChannel({
    userId: user.id,
    channelId: params.id,
  });

  const [channelHosts, automodCohosts] = await Promise.all([
    getChannelHosts({ channel: channel.id }),
    db.comods.findMany({
      where: {
        channelId: channel.id,
      },
    }),
  ]);

  return typedjson({
    user,
    channel,
    channelHosts: channelHosts.result.hosts,
    automodCohosts,
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  invariant(params.id, "id is required");

  const user = await requireUser({ request });
  const channel = await requireUserIsChannelLead({
    userId: user.id,
    channelId: params.id,
  });

  const formData = await request.formData();
  const cohostId = (formData.get("cohostId") as string) ?? undefined;

  if (!cohostId) {
    return typedjson({ message: "cohostId is required" }, { status: 400 });
  }

  const currentStatus = await db.comods.findFirst({
    where: {
      channelId: channel.id,
      fid: cohostId,
    },
  });

  if (currentStatus) {
    await db.comods.delete({
      where: {
        id: currentStatus.id,
        channelId: channel.id,
        fid: cohostId,
      },
    });
  } else {
    const cohost = await requireUserIsCohost({
      fid: +cohostId,
      channelId: params.id,
    });

    await db.comods.create({
      data: {
        channelId: channel.id,
        fid: cohostId,
        username: cohost.username,
        avatarUrl: cohost.pfp.url,
      },
    });
  }

  return typedjson({ message: "success" });
}

export default function Screen() {
  const { user, channel, channelHosts, automodCohosts } =
    useTypedLoaderData<typeof loader>();

  const allCohosts = [
    ...automodCohosts.map((h) => ({
      ...h,
      fid: h.fid,
      hasAccess: true,
    })),
    ...channelHosts
      .filter((h) => !automodCohosts.some((ah) => +ah.fid === h.fid))
      .map((h) => ({
        fid: h.fid,
        username: h.username,
        avatarUrl: h.pfp.url,
        hasAccess: false,
      })),
  ].sort((a, b) => a.username.localeCompare(b.username));

  return (
    <div>
      <p className="font-semibold">Add Cohosts to Automod</p>
      <p className="text-gray-500">
        Collaborators can manage all moderation settings except for adding or
        removing other collaborators.
      </p>

      <div className="divide-y border-t border-b mt-8">
        {allCohosts.map((cohost) => (
          <Form
            key={cohost.fid}
            method="post"
            className="flex items-center justify-between py-2"
          >
            <div className="flex items-center gap-2">
              <Avatar className="w-9 h-9">
                <AvatarImage
                  src={cohost.avatarUrl ?? undefined}
                  alt={"@" + cohost.username}
                />
                <AvatarFallback>
                  {cohost.username.slice(0, 2).toLocaleUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className=" font-medium">{cohost.username}</p>
                <p className="text-gray-400 text-xs">#{cohost.fid}</p>
              </div>
            </div>
            {cohost.fid != user.id && (
              <div>
                <input type="hidden" name="cohostId" value={cohost.fid} />
                {cohost.hasAccess ? (
                  <Button variant="ghost" size="sm">
                    Revoke
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm">
                    Add
                  </Button>
                )}
              </div>
            )}
          </Form>
        ))}
      </div>
    </div>
  );
}