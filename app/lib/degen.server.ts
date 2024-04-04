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

export async function tipAllowance(args: { fid: string }) {
  const response = await axios.get<PointsResponse["raw"]>(
    `https://www.degen.tips/api/airdrop2/tip-allowance?fid=${args.fid}`
  );

  const raw = response.data;

  console.log(raw);

  const degenAllowance = raw.reduce((acc, curr) => acc + Number(curr.tip_allowance), 0);
  const degenRemaining = raw.reduce((acc, curr) => acc + Number(curr.remaining_allowance), 0);

  return {
    raw,
    allowance: degenAllowance,
    remaining: degenRemaining,
  };
}

export function computeTipAmount(args: {
  tipAllowance: PointsResponse;
  type: "pct" | "amt";
  amount: number;
}) {
  const { allowance, remaining } = args.tipAllowance;

  let tipAmount = 0;
  if (args.type === "pct") {
    tipAmount = allowance * (args.amount / 100);
  } else {
    tipAmount = args.amount;
  }

  return Math.min(tipAmount, remaining);
}
