import {assign, createMachine} from "xstate";
import {SafeInfo, Profile, SafeInfoDocument, SafeInfoQueryVariables} from "./api/data/types";
import {me} from "./stores/me";
import {ApiClient} from "./apiConnection";
import {CirclesSafe} from "../dapps/o-banking/chain/circlesSafe";
import {DefaultExecutionContext} from "../dapps/o-banking/chain/actions/defaultExecutionContext";

export type UbiTimerContext = {
  nextUbiAt: number|null
  tokenAddress: string|null
};

export type UbiEvents = {
  type: "GOT_PREVIOUS_PAYOUT",
  lastPayoutAt: Date,
  randomValue: String
} | {
  type: "NO_PREVIOUS_PAYOUT",
  randomValue: String
}

export async function getUbiInfo() : Promise<SafeInfo> {
  const ubiInfo = await ApiClient.query<SafeInfo, SafeInfoQueryVariables>(SafeInfoDocument, {});
  if (!ubiInfo) {
    console.log(`No ubiInfo.`);
  }
  return ubiInfo;
}

export async function getUbi(context:UbiTimerContext) {
  let $me: Profile|null = null;
  const unsub = me.subscribe(o => {
    $me = o;
  });
  unsub();
  if (!$me)
    throw new Error(window.o.i18n("shared.ubiTimer2.errors.couldNotLoadYourProfile"));

  const privateKey = sessionStorage.getItem("circlesKey");
  if (!privateKey)
    throw new Error(window.o.i18n("shared.ubiTimer2.errors.yourPrivateKeyIsLocked"));

  if (!context.tokenAddress)
    throw new Error(window.o.i18n("shared.ubiTimer2.errors.cannotGetUbi"));

  const result = await new CirclesSafe($me.circlesAddress, DefaultExecutionContext.fromKey(privateKey)).requestUbi();
  console.log(`Ubi request result (transactionHash):`, result.txHash);
  return result;
}

export const ubiMachine = createMachine<UbiTimerContext, UbiEvents>({
  id: `ubi`,
  initial: "waitFor5Seconds",
  context: {
    nextUbiAt: null,
    tokenAddress: null
  },
  states: {
    waitFor600Seconds: {
      entry: (context, event) => {
        console.log("Waiting for 600 sec. until next UBI-retrieval try. Previous event was:", event);
      },
      after: {
        600000: "checkLastPayout"
      }
    },
    waitFor60Seconds: {
      entry: (context, event) => {
        console.log("Waiting for 60 sec. until next UBI-retrieval try. Previous event was:", event);
      },
      after: {
        60000: "checkLastPayout"
      }
    },
    waitFor5Seconds: {
      entry: (context, event) => {
        console.log("Waiting for 5 sec. until next UBI-retrieval try. Previous event was:", event);
      },
      after: {
        5000: "checkLastPayout"
      }
    },
    checkLastPayout: {
      invoke: {
        src: "getUbiInfo"
      },
      on: {
        GOT_PREVIOUS_PAYOUT: [{
          cond: "previousPayoutIsNewerThan24Hours",
          actions: "calculateAndAssignNextUbiAt",
          target: "waitForNextUbiAt"
        },{
          cond: "previousPayoutIsOlderThan24Hours",
          target: "getUbi"
        }],
        NO_PREVIOUS_PAYOUT: [{
          cond: "noUbiInfo",
          target: "waitFor60Seconds"
        }, {
          target: "getUbi"
        }]
      }
    },
    waitForNextUbiAt: {
      after: {
        NEXT_UBI_DELAY: "getUbi"
      }
    },
    getUbi: {
      entry: "clearContext",
      invoke: {
        src: "getUbi",
        onDone: "waitFor600Seconds",
        onError: "waitFor60Seconds"
      }
    }
  }
}, {
  guards: {
    noUbiInfo: (ctx, _) => !ctx.tokenAddress,
    previousPayoutIsNewerThan24Hours: (ctx, event: {type: "GOT_PREVIOUS_PAYOUT", lastPayoutAt:Date, randomValue:string}) => Date.now() < event.lastPayoutAt.getTime() + (24 * 60 * 60 * 1000),
    previousPayoutIsOlderThan24Hours: (ctx, event: {type: "GOT_PREVIOUS_PAYOUT", lastPayoutAt:Date, randomValue:string}) => Date.now() >= event.lastPayoutAt.getTime() + (24 * 60 * 60 * 1000)
  },
  delays: {
    NEXT_UBI_DELAY: (context, _) => {
      return context.nextUbiAt - Date.now();
    }
  },
  services: {
    getUbi: async (context) => {
      let $me: Profile|null = null;
      const unsub = me.subscribe(o => {
        $me = o;
      });
      unsub();
      if (!$me)
        throw new Error(`Couldn't load your profile`);

      const privateKey = sessionStorage.getItem("circlesKey");
      if (!privateKey)
        throw new Error(`Your private key is locked.`);

      if (!context.tokenAddress)
        throw new Error(`Cannot get the ubi. The context.tokenAddress is empty.`);

      const result = await new CirclesSafe($me.circlesAddress, DefaultExecutionContext.fromKey(privateKey)).requestUbi();
      console.log(`Ubi request result (transactionHash):`, result.txHash);
      return result;
    },
    getUbiInfo: (context) => async (callback) => {
      const ubiInfo = await ApiClient.query<SafeInfo, SafeInfoQueryVariables>(SafeInfoDocument, {});
      if (!ubiInfo) {
        console.log(`No ubiInfo.`);
        callback({
          type: "GOT_PREVIOUS_PAYOUT",
          lastPayoutAt: new Date(parseFloat(ubiInfo.lastUbiAt)),
          randomValue: ubiInfo.randomValue
        });
        return;
      }
      if (ubiInfo.safeAddress && ubiInfo.tokenAddress) {
        context.tokenAddress = ubiInfo.tokenAddress;
      }
      if (ubiInfo.lastUbiAt) {
        callback({
          type: "GOT_PREVIOUS_PAYOUT",
          lastPayoutAt: new Date(parseFloat(ubiInfo.lastUbiAt)),
          randomValue: ubiInfo.randomValue
        });
      } else {
        callback({
          type: "NO_PREVIOUS_PAYOUT",
          randomValue: ubiInfo.randomValue
        });
      }
    }
  },
  actions: {
    clearContext: assign({
      nextUbiAt: () => null,
      tokenAddress: (context) => context.tokenAddress
    }),
    calculateAndAssignNextUbiAt: assign({
      nextUbiAt: (ctx, event:UbiEvents) => {
        const nextUbiAt = event.type === "GOT_PREVIOUS_PAYOUT"
          ? event.lastPayoutAt.getTime() + (24 * 60 * 60 * 1000) + Math.ceil((event.randomValue.charCodeAt(0) - 32) * 1000)
          : null;
        console.log("nextUbiAt:", nextUbiAt);
        return nextUbiAt;
      }
    })
  }
});
