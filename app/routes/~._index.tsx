/* eslint-disable react/no-unescaped-entities */
import { typedjson, useTypedLoaderData } from "remix-typedjson";

import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useClipboard } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  errorResponse,
  formatZodError,
  getSharedEnv,
  requireUser,
  successResponse,
} from "~/lib/utils.server";
import { Form, useNavigation } from "@remix-run/react";
import { tipAllowance } from "~/lib/degen.server";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Card, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { db } from "~/lib/db.server";
import { z } from "zod";

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser({ request });

  const formData = await request.formData();
  const data = Object.fromEntries(formData.entries());
  const result = TipSettingsSchema.safeParse(data);

  if (!result.success) {
    return errorResponse({
      request,
      message: `Oops${formatZodError(result.error)}`,
    });
  }

  if (
    result.data.degenTipType === "pct" &&
    (Number(result.data.degenTipAmount) < 0 || Number(result.data.degenTipAmount) > 100)
  ) {
    return errorResponse({
      request,
      message: "Choose a percentage between 0 and 100",
    });
  }

  if (result.data.degenTipType === "amt" && Number(result.data.degenTipAmount) < 0) {
    return errorResponse({
      request,
      message: "Choose an amount greater than 0",
    });
  }
  // validate and save the data to a DATABASE
  await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      degenTipAmount: result.data.degenTipAmount,
      degenTipType: result.data.degenTipType,
    },
  });

  return successResponse({
    request,
    message: "Settings saved",
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser({ request });

  const { allowance, remaining } = await tipAllowance({ fid: user.id });

  return typedjson({
    user,
    degenAllowance: allowance,
    degenRemaining: remaining,
    env: getSharedEnv(),
  });
}

export const actionTypes = ["degen"] as const;
export type ActionType = (typeof actionTypes)[number];

export default function FrameConfig() {
  const { user, degenAllowance, degenRemaining } = useTypedLoaderData<typeof loader>();
  const navigation = useNavigation();

  return (
    <div className="space-y-12 max-w-md">
      <Form method="post" className="space-y-8">
        <p className="font-medium">Degen</p>
        <hr />
        <Card className="pb-4">
          <CardHeader className="pb-2">
            <CardDescription>Degen Tip Allowance</CardDescription>
            <CardTitle className="text-2xl">{Number(degenAllowance).toLocaleString()} Per Day</CardTitle>
          </CardHeader>
        </Card>

        <hr />

        <div className="space-y-4">
          <div>
            <p className="font-medium">Tip Amount</p>
            <p className="text-sm text-gray-400">The amount to tip when someone sends a tip command.</p>
          </div>
          <div>
            <div className="flex gap-1">
              <Select name="degenTipType" defaultValue={user.degenTipType || "pct"}>
                <SelectTrigger className="w-[75px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pct">%</SelectItem>
                  <SelectItem value="amt">🎩</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="max-w-[200px]"
                name="degenTipAmount"
                required
                pattern="\d+"
                defaultValue={user.degenTipAmount || 10}
              />
            </div>
          </div>
        </div>

        <Button className="w-full" disabled={navigation.state === "submitting"} type="submit">
          {navigation.state === "submitting" ? "Saving..." : "Save"}
        </Button>
      </Form>
    </div>
  );
}

export function CopyButton({ frame, env }: { frame: { slug: string }; env: { hostUrl: string } }) {
  const { copy, copied } = useClipboard();

  return (
    <Button
      className="w-[100px]"
      size={"sm"}
      variant={"outline"}
      onClick={() => copy(`${env.hostUrl}/${frame.slug}`)}
    >
      {copied ? "Copied!" : "Copy URL"}
    </Button>
  );
}

export const TipSettingsSchema = z
  .object({
    degenTipAmount: z.coerce.number(),
    degenTipType: z.union([z.literal("pct"), z.literal("amt")]),
  })
  .refine(
    (data) => {
      if (data.degenTipType === "pct") {
        return data.degenTipAmount >= 0 && data.degenTipAmount <= 100;
      }

      return true;
    },
    { message: "Choose a percentage between 0 and 100" }
  );
