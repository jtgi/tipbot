import axios from "axios";

export type HamAllowance = {
  allowance: number;
  used: number;
  received: number;
  communityScore: number;
  tomatoes: number;
};

export async function hamAllowance({ fid }: { fid: string }) {
  const response = await axios.get<HamAllowance>(`https://farcaster.dep.dev/lp/tips/${fid}`);
  return response.data;
}
