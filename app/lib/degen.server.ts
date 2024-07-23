import { User } from "@prisma/client";
import axios from "axios";
import invariant from "tiny-invariant";

export type PointsResponse = {
  allowance: number;
  remaining: number;
  raw: Array<{
    snapshot_date: Date;
    user_rank: string;
    wallet_address: string;
    avatar_url: string;
    display_name: string;
    tip_allowance: string;
    remaining_allowance: string;
  }>;
};

export type PointsResponseV2 = Array<{
  snapshot_day: Date;
  fid: string;
  user_rank: string;
  tip_allowance: string;
  remaining_tip_allowance: string;
  wallet_addresses: string[];
}>;

export type TipAllowance = {
  allowance: number;
  remaining: number;
  raw: PointsResponseV2[number];
};

export async function tipAllowance(args: { fid: string }): Promise<TipAllowance | null> {
  const response = await axios.get<PointsResponseV2>(
    `https://api.degen.tips/airdrop2/allowances?fid=${args.fid}`
  );

  const latest = response.data[0];
  if (!latest) {
    return null;
  }

  return {
    raw: latest,
    allowance: parseInt(latest.tip_allowance),
    remaining: parseInt(latest.remaining_tip_allowance),
  };
}

export function computeTipAmount(args: { tipAllowance: TipAllowance; type: "pct" | "amt"; amount: number }) {
  const { allowance, remaining } = args.tipAllowance;

  let tipAmount = 0;
  if (args.type === "pct") {
    tipAmount = Math.ceil(allowance * (args.amount / 100));
  } else {
    tipAmount = args.amount;
  }

  return Math.min(tipAmount, remaining);
}
