/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cast } from "@neynar/nodejs-sdk/build/neynar-api/v2";
import RE2 from "re2";
import { z } from "zod";
import {
  ban,
  cooldown,
  hideQuietly,
  isCohost,
  mute,
  warnAndHide,
} from "./warpcast.server";
import { ModeratedChannel } from "@prisma/client";

export type RuleDefinition = {
  friendlyName: string;
  description: string;
  hidden: boolean;
  invertable: boolean;
  args: Record<
    string,
    {
      type: string;
      friendlyName: string;
      description: string;
      required?: boolean;
    }
  >;
};

export const ruleDefinitions: Record<RuleName, RuleDefinition> = {
  and: {
    friendlyName: "And",
    description: "Combine multiple rules together",
    hidden: true,
    invertable: false,
    args: {},
  },

  or: {
    friendlyName: "Or",
    hidden: true,
    invertable: false,
    description: "Combine multiple rules together",
    args: {},
  },

  containsText: {
    friendlyName: "Contains Text",
    description: "Check if the text contains a specific string",
    hidden: false,
    invertable: true,
    args: {
      searchText: {
        type: "string",
        friendlyName: "Search Text",
        description: "The text to search for",
      },
      caseSensitive: {
        type: "boolean",
        friendlyName: "Case Sensitive",
        description: "If checked, 'abc' is different from 'ABC'",
      },
    },
  },

  textMatchesPattern: {
    friendlyName: "Text Matches Pattern (Regex)",
    description: "Check if the text matches a specific pattern",
    hidden: false,
    invertable: true,
    args: {
      pattern: {
        type: "string",
        friendlyName: "Pattern",
        description:
          "The regular expression to match against. No leading or trailing slashes.",
      },
    },
  },

  containsTooManyMentions: {
    friendlyName: "Contains Mentions",
    description: "Check if the text contains a certain amount of mentions",
    invertable: true,
    hidden: false,
    args: {
      maxMentions: {
        type: "number",
        required: true,
        friendlyName: "Max Mentions",
        description: "The maximum number of mentions allowed",
      },
    },
  },
  containsLinks: {
    friendlyName: "Contains Links",
    description: "Check if the text contains any links",
    hidden: false,
    invertable: true,
    args: {
      maxLinks: {
        type: "number",
        friendlyName: "Max Links",
        description: "The maximum number of links allowed",
      },
    },
  },
  userProfileContainsText: {
    friendlyName: "User Profile Contains Text",
    description: "Check if the user's profile contains a specific string",
    hidden: false,

    invertable: true,
    args: {
      searchText: {
        type: "string",
        friendlyName: "Search Text",
        description: "The text to search for",
      },
      caseSensitive: {
        type: "boolean",
        friendlyName: "Case Sensitive",
        description: "If checked, 'abc' is different from 'ABC'",
      },
    },
  },
  userDisplayNameContainsText: {
    friendlyName: "User Display Name Contains Text",
    description: "Check if the user's display name contains a specific string",
    hidden: false,

    invertable: true,
    args: {
      searchText: {
        type: "string",
        friendlyName: "Search Text",
        description: "The text to search for",
      },
      caseSensitive: {
        type: "boolean",
        friendlyName: "Case Sensitive",
        description: "If checked 'abc' is different from 'ABC'",
      },
    },
  },

  userFollowerCount: {
    friendlyName: "User Follower Count",
    hidden: false,
    invertable: false,
    description: "Check if the user's follower count is within a range",
    args: {
      min: {
        type: "number",
        friendlyName: "Min",
        description: "The minimum number of followers",
      },
      max: {
        type: "number",
        friendlyName: "Max",
        description: "The maximum number of followers",
      },
    },
  },

  userIsNotActive: {
    friendlyName: "User Is Not Active",
    hidden: false,
    invertable: true,
    description: "Require the user is active",
    args: {},
  },

  userIsCohost: {
    friendlyName: "User Is Cohost",
    description: "Check if the user is a cohost",
    hidden: false,
    invertable: true,
    args: {},
  },

  userFidInRange: {
    friendlyName: "User FID In Range",
    description: "Check if the user's FID is within a range",
    hidden: false,
    invertable: false,
    args: {
      minFid: {
        type: "number",
        friendlyName: "Min FID",
        description: "The minimum FID",
      },
      maxFid: {
        type: "number",
        friendlyName: "Max FID",
        description: "The maximum FID",
      },
    },
  },
} as const;

export type ActionDefinition = {
  friendlyName: string;
  description: string;
  hidden?: boolean;
  args: Record<
    string,
    | {
        type: "number" | "string" | "boolean";
        friendlyName: string;
        description: string;
        required?: boolean;
      }
    | {
        type: "radio" | "select";
        friendlyName: string;
        description: string;
        options: Array<{ value: string; label: string }>;
        required?: boolean;
      }
  >;
};

// TODO: Action Args!
export const actionDefinitions: Record<ActionType, ActionDefinition> = {
  mute: {
    friendlyName: "Mute",
    description:
      "All this user's casts will be silently hidden from the channel until you unmute.",
    args: {},
  },
  hideQuietly: {
    friendlyName: "Hide Quietly",
    description: "Hide the cast without notifying the user",
    args: {},
  },
  bypass: {
    friendlyName: "Bypass",
    description: "Bypass the rule and let the cast be visible",
    hidden: true,
    args: {},
  },
  ban: {
    friendlyName: "Permanent Ban",
    description: "Permanently ban them. This cannot be undone at the moment.",
    args: {},
  },
  warnAndHide: {
    friendlyName: "Warn and Hide",
    description:
      "Hide the cast and let them know it was hidden via a notification",
    args: {},
  },
  unmuted: {
    friendlyName: "Unmuted",
    description: "Unmute the user",
    hidden: true,
    args: {},
  },
  cooldownEnded: {
    friendlyName: "End Cooldown",
    description: "End the user's cooldown period",
    hidden: true,
    args: {},
  },
  unhide: {
    friendlyName: "Unhide",
    description: "Unhide the cast",
    hidden: true,
    args: {},
  },
  cooldown: {
    friendlyName: "Cooldown",
    description:
      "New casts from this user will be automatically hidden for the duration specified.",
    args: {
      duration: {
        type: "number",
        friendlyName: "Duration (hours)",
        description: "The duration of the cool down in hours",
      },
    },
  },
} as const;

export const ruleNames = [
  "and",
  "or",
  "containsText",
  "textMatchesPattern",
  "containsTooManyMentions",
  "containsLinks",
  "userProfileContainsText",
  "userDisplayNameContainsText",
  "userFollowerCount",
  "userIsNotActive",
  "userFidInRange",
  "userIsCohost",
] as const;

export const actionTypes = [
  "bypass",
  "hideQuietly",
  "ban",
  "mute",
  "warnAndHide",
  "cooldown",
  "cooldownEnded",
  "unhide",
  "unmuted",
] as const;

export type RuleName = (typeof ruleNames)[number];
export type ActionType = (typeof actionTypes)[number];

export type CheckFunctionArgs = {
  channel: ModeratedChannel;
  cast: Cast;
  rule: Rule;
};

export type CheckFunction = (
  props: CheckFunctionArgs
) => (string | undefined) | Promise<string | undefined>;
export type ActionFunction<T = any> = (args: {
  channel: string;
  cast: Cast;
  action: Action;
}) => Promise<T>;

const BaseRuleSchema = z.object({
  name: z.enum(ruleNames),
  type: z.union([z.literal("CONDITION"), z.literal("LOGICAL")]),
  args: z.record(z.any()),
  operation: z.union([z.literal("AND"), z.literal("OR")]).optional(),
  invert: z.boolean().optional(),
});

export type Rule = z.infer<typeof BaseRuleSchema> & {
  conditions?: Rule[];
};

export const RuleSchema: z.ZodType<Rule> = BaseRuleSchema.extend({
  conditions: z.lazy(() => RuleSchema.array()).optional(), // z.lazy is used for recursive schemas
}).refine(
  (data) => {
    if (data.name === "textMatchesPattern") {
      try {
        new RE2(data.args.pattern);
      } catch (e) {
        return false;
      }

      return true;
    } else {
      return true;
    }
  },
  (value) => ({
    message: `The pattern "${value.name}" is no good. It should be javascript compatible. Backreferences and lookahead assertions are not supported.`,
  })
);

const ActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bypass") }),
  z.object({ type: z.literal("hideQuietly") }),
  z.object({ type: z.literal("ban") }),
  z.object({ type: z.literal("warnAndHide") }),
  z.object({ type: z.literal("mute") }),
  z.object({
    type: z.literal("cooldown"),
    args: z.object({ duration: z.coerce.number() }),
  }),
]);

export type Action = z.infer<typeof ActionSchema>;

export const RuleSetSchema = z.object({
  id: z.string().optional(),
  target: z.enum(["all", "root", "reply"]).default("all"),
  ruleParsed: RuleSchema,
  actionsParsed: z.array(ActionSchema).min(1),
});

export const ModeratedChannelSchema = z.object({
  id: z.string(),
  banThreshold: z.coerce.number().nullable(),
  ruleSets: z.array(RuleSetSchema).min(1),
});

export const ruleFunctions: Record<RuleName, CheckFunction> = {
  and: () => undefined,
  or: () => undefined, // TODO
  textMatchesPattern: textMatchesPattern,
  containsText: containsText,
  containsTooManyMentions: containsTooManyMentions,
  containsLinks: containsLinks,
  userProfileContainsText: userProfileContainsText,
  userIsCohost: userIsCohost,
  userDisplayNameContainsText: userDisplayNameContainsText,
  userFollowerCount: userFollowerCount,
  userIsNotActive: userIsNotActive,
  userFidInRange: userFidInRange,
};

export const actionFunctions: Record<ActionType, ActionFunction> = {
  hideQuietly: hideQuietly,
  mute: mute,
  bypass: () => Promise.resolve(),
  cooldownEnded: () => Promise.resolve(),
  unmuted: () => Promise.resolve(),
  unhide: () => Promise.resolve(),
  ban: ban,
  warnAndHide: warnAndHide,
  cooldown: cooldown,
} as const;

// Rule: contains text, option to ignore case
export function containsText(props: CheckFunctionArgs) {
  const { cast, rule } = props;
  const { searchText, caseSensitive } = rule.args;

  const text = caseSensitive ? cast.text : cast.text.toLowerCase();
  const search = caseSensitive ? searchText : searchText.toLowerCase();

  if (!rule.invert && text.includes(search)) {
    return `Text contains the text: ${searchText}`;
  } else if (rule.invert && !text.includes(search)) {
    return `Text does not contain the text: ${searchText}`;
  }
}

export function textMatchesPattern(args: CheckFunctionArgs) {
  const { cast, rule } = args;
  const { pattern } = rule.args;

  const re2 = new RE2(pattern);

  const isMatch = re2.test(cast.text);

  if (isMatch && !rule.invert) {
    return `Text matches pattern: ${pattern}`;
  } else if (!isMatch && rule.invert) {
    return `Text does not match pattern: ${pattern}`;
  }
}

// Rule: contains too many mentions (@...)
export function containsTooManyMentions(args: CheckFunctionArgs) {
  const { cast, rule } = args;
  const { maxMentions } = rule.args;

  const mentions = cast.text.match(/@\w+/g) || [];

  if (!rule.invert && mentions.length > maxMentions) {
    return `Too many mentions: ${mentions}. Max: ${maxMentions}`;
  } else if (rule.invert && mentions.length <= maxMentions) {
    return `Too few mentions: ${mentions}. Min: ${maxMentions}`;
  }
}

export function containsLinks(args: CheckFunctionArgs) {
  const { cast, rule } = args;
  const maxLinks = rule.args.maxLinks || 0;
  const regex = /https?:\/\/\S+/gi;
  const matches = cast.text.match(regex) || [];

  if (!rule.invert && matches.length > maxLinks) {
    return `Too many links. Max: ${maxLinks}`;
  } else if (rule.invert && matches.length <= maxLinks) {
    return `Too few links. Min: ${maxLinks}`;
  }
}

export function userProfileContainsText(args: CheckFunctionArgs) {
  const { cast, rule } = args;
  const { searchText, caseSensitive } = rule.args;
  const containsText = !caseSensitive
    ? cast.author.profile.bio.text
        .toLowerCase()
        .includes(searchText.toLowerCase())
    : cast.author.profile.bio.text.includes(searchText);

  if (!rule.invert && containsText) {
    return `User profile contains the specified text: ${searchText}`;
  } else if (rule.invert && !containsText) {
    return `User profile does not contain the specified text: ${searchText}`;
  }
}

export function userDisplayNameContainsText(args: CheckFunctionArgs) {
  const { cast, rule } = args;
  const { searchText, caseSensitive } = rule.args;
  const containsText = !caseSensitive
    ? cast.author.display_name.toLowerCase().includes(searchText.toLowerCase())
    : cast.author.display_name.includes(searchText);

  if (!rule.invert && containsText) {
    return `User display name contains text: ${searchText}`;
  } else if (rule.invert && !containsText) {
    return `User display name does not contain text: ${searchText}`;
  }
}

export function userFollowerCount(props: CheckFunctionArgs) {
  const { cast, rule } = props;
  const { min, max } = rule.args as { min?: number; max?: number };

  if (min) {
    if (cast.author.follower_count < min) {
      return `Follower count less than ${min}`;
    }
  }

  if (max) {
    if (cast.author.follower_count > max) {
      return `Follower count greater than ${max}`;
    }
  }
}

export async function userIsCohost(args: CheckFunctionArgs) {
  const { channel, rule } = args;

  const isUserCohost = await isCohost({
    fid: args.cast.author.fid,
    channel: channel.id,
  });

  if (rule.invert && !isUserCohost) {
    return `User is not a cohost`;
  } else if (!rule.invert && isUserCohost) {
    return `User is a cohost`;
  }
}

// Rule: user active_status must be active
export function userIsNotActive(args: CheckFunctionArgs) {
  const { cast, rule } = args;
  if (!rule.invert && cast.author.active_status !== "active") {
    return `User is not active`;
  } else if (rule.invert && cast.author.active_status === "active") {
    return `User is active`;
  }
}

// Rule: user fid must be in range
export function userFidInRange(args: CheckFunctionArgs) {
  const { cast, rule } = args;
  const { minFid, maxFid } = rule.args as { minFid?: number; maxFid?: number };

  if (minFid) {
    if (cast.author.fid < minFid) {
      return `FID ${cast.author.fid} is less than ${minFid}`;
    }
  }

  if (maxFid) {
    if (cast.author.fid > maxFid) {
      return `FID ${cast.author.fid} is greater than ${maxFid}`;
    }
  }
}
