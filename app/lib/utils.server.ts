import sharp from "sharp";
import { v4 as uuid } from "uuid";
import * as Sentry from "@sentry/remix";
import { authenticator, commitSession, getSession } from "./auth.server";
import axios from "axios";
import { MessageResponse } from "./types";
import { redirect, typedjson } from "remix-typedjson";
import { Session, json } from "@remix-run/node";
import { db } from "./db.server";
import { ZodIssue, ZodError } from "zod";
import { erc20Abi, getAddress, getContract } from "viem";
import { clientsByChainId } from "./viem.server";
import { cache } from "./cache.server";

export async function requireUser({ request }: { request: Request }) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: `/`,
  });

  if (user && process.env.NODE_ENV === "production") {
    Sentry.setUser({ id: user.username });
  }

  const updatedUser = await db.user.findFirstOrThrow({
    where: {
      id: user.id,
    },
  });

  return updatedUser;
}

export async function requireSuperAdmin({ request }: { request: Request }) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: `/`,
  });

  if (user.role !== "superadmin") {
    throw redirect(`/`, { status: 403 });
  }
}

export function getSharedEnv() {
  return {
    infuraProjectId: process.env.INFURA_PROJECT_ID!,
    postHogApiKey: process.env.POSTHOG_API_KEY!,
    neynarClientId: process.env.NEYNAR_CLIENT_ID!,
    nodeEnv: process.env.NODE_ENV!,
    hostUrl: process.env.NODE_ENV === "production" ? process.env.PROD_URL! : process.env.DEV_URL!,
  };
}

export async function parseMessage(payload: any) {
  const res = await axios.post(
    `https://api.neynar.com/v2/farcaster/frame/validate`,
    {
      message_bytes_in_hex: payload.trustedData.messageBytes,
      follow_context: true,
    },
    {
      headers: {
        accept: "application/json",
        api_key: process.env.NEYNAR_API_KEY,
        "content-type": "application/json",
        Accept: "application/json",
      },
    }
  );

  const message = res.data as MessageResponse;
  if (!message.valid) {
    throw new Error("Invalid message");
  }

  const host = new URL(message.action.url).host;
  if (host !== new URL(getSharedEnv().hostUrl).host) {
    throw new Error("No spoofs sir");
  }

  return message;
}

export async function successResponse<T>({
  request,
  message,
  session: passedSession,
  data,
  status,
}: {
  request: Request;
  session?: Session;
  message: string;
  data?: T;
  status?: number;
}) {
  const session = passedSession || (await getSession(request.headers.get("Cookie")));
  session.flash("message", {
    id: uuid(),
    type: "success",
    message,
  });

  return typedjson(
    {
      message,
      data,
    },
    {
      status: status || 200,
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    }
  );
}

export async function errorResponse(props: { request: Request; message: string; status?: number }) {
  const session = await getSession(props.request.headers.get("Cookie"));
  session.flash("message", {
    id: uuid(),
    type: "error",
    message: props.message,
  });

  return json(
    {
      message: props.message,
    },
    {
      status: props.status || 400,
      headers: { "Set-Cookie": await commitSession(session) },
    }
  );
}

export function formatZodIssue(issue: ZodIssue): string {
  const { path, message } = issue;
  const pathString = path.join(".");

  return `${pathString}: ${message}`;
}

// Format the Zod error message with only the current error
export function formatZodError(error: ZodError): string {
  const { issues } = error;

  if (issues.length) {
    const currentIssue = issues[0];

    return formatZodIssue(currentIssue);
  }

  return "";
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatHash(hash: string) {
  return `${hash.slice(0, 3)}...${hash.slice(-3)}`;
}

export function isCastHash(value: string): boolean {
  return value.match(/0x[a-fA-F0-9]{40}/) !== null;
}

export function isWarpcastCastUrl(value: string): boolean {
  return value.match(/https:\/\/warpcast.com\/[a-zA-Z0-9]+\/0x[a-fA-F0-9]{8}/) !== null;
}

export async function getSetCache<T>(props: {
  key: string;
  ttlSeconds?: number;
  get: () => Promise<T>;
}): Promise<T> {
  const { key, ttlSeconds, get } = props;
  const cachedValue = await cache.get<T>(key);

  if (cachedValue) {
    return cachedValue;
  }

  const freshValue = await get();
  cache.set(key, freshValue, ttlSeconds ?? 0);
  return freshValue;
}
