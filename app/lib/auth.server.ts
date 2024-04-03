import type { User } from "@prisma/client";
import { Authenticator } from "remix-auth";
import { db } from "~/lib/db.server";
import { createCookieSessionStorage } from "@remix-run/node";
import { GodStrategy } from "./god-strategy";
import { NeynarStrategy } from "./neynar-strategy";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: [process.env.SESSION_SECRET || "STRONG_SECRET"],
    secure: process.env.NODE_ENV === "production",
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;

export const authenticator = new Authenticator<User>(sessionStorage, {
  throwOnError: true,
});

authenticator.use(
  new GodStrategy(async ({ username }) => {
    return db.user.findFirstOrThrow({
      where: {
        username,
      },
    });
  })
);

authenticator.use(
  new NeynarStrategy(async ({ farcasterUser, signerUuid, request }) => {
    const user = await db.user.findFirst({
      where: {
        id: String(farcasterUser.fid),
        signerUuid,
      },
    });

    if (!user) {
      return await db.user.upsert({
        where: {
          id: String(farcasterUser.fid),
        },
        create: {
          id: String(farcasterUser.fid),
          username: farcasterUser.username,
          avatarUrl: farcasterUser.pfp_url,
          signerUuid,
        },
        update: {
          id: String(farcasterUser.fid),
          username: farcasterUser.username,
          avatarUrl: farcasterUser.pfp_url,
          signerUuid,
        },
      });
    }

    return user;
  })
);
