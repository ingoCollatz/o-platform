import Contacts from "./o-contacts/pages/Contacts.svelte";
import ProfilePage from "./o-contacts/pages/Profile.svelte";
import Chat from "./o-contacts/pages/Chat.svelte";
import ChatDetail from "./o-contacts/pages/ChatDetail.svelte";
import { Page } from "@o-platform/o-interfaces/dist/routables/page";
import { me } from "../shared/stores/me";
import { DappManifest } from "@o-platform/o-interfaces/dist/dappManifest";
import { init } from "./o-banking/init";
import Graph from "./o-contacts/pages/Graph.svelte";
import { RpcGateway } from "@o-platform/o-circles/dist/rpcGateway";
import { Jumplist } from "@o-platform/o-interfaces/dist/routables/jumplist";
import { transfer } from "./o-banking/processes/transfer";
import { setTrust } from "./o-banking/processes/setTrust";
import { loadProfileByProfileId } from "../shared/api/loadProfileByProfileId";
import { push } from "svelte-spa-router";
import { loadProfileBySafeAddress } from "../shared/api/loadProfileBySafeAddress";
import { Profile } from "../shared/api/data/types";

export interface DappState {
  // put state here
}

const index: Page<any, DappState> = {
  routeParts: [],
  component: Contacts,
  title: "Friends",
  icon: "friends",
  type: "page",
};

export class ContactsDappState {
  /**
   * The currently displayed profile (e.g. in the profile detail)
   */
  currentProfileId?: number;
  /**
   * The address of the currently displayed safe (e.g. in the profile detail)
   */
  currentSafeAddress?: string;

  trusted?: boolean;
}

const profileJumplist: Jumplist<any, ContactsDappState> = {
  type: "jumplist",
  title: "Actions",
  isSystem: false,
  routeParts: ["=actions"],
  items: async (params, runtimeDapp) => {
    const getRecipientProfile = async () => {
      if (RpcGateway.get().utils.isAddress(params.id)) {
        const profile = await loadProfileBySafeAddress(params.id);
        if (profile) {
          return profile;
        }
      } else if (Number.isInteger(params.id)) {
        const profile = await loadProfileByProfileId(parseInt(params.id));
        if (profile) {
          return profile;
        }
      }
      return undefined;
    };

    const recipientProfile = params.id
      ? await getRecipientProfile()
      : undefined;

    let mySafeAddress;
    const unsub = me.subscribe((o) => {
      mySafeAddress = o?.circlesAddress;
    });
    unsub();

    let actions = [];
    if (recipientProfile?.circlesAddress) {
      actions = actions.concat([
        {
          key: "transfer",
          icon: "sendmoney",
          title: "Send Money",
          action: async () => {
            window.o.runProcess(transfer, {
              safeAddress: mySafeAddress,
              recipientAddress: recipientProfile.circlesAddress,
              privateKey: sessionStorage.getItem("circlesKey"),
            });
          },
        },
        recipientProfile.id
          ? {
              key: "chat",
              icon: "chat",
              title: "Chat",
              action: async () => {
                push("#/friends/chat/" + recipientProfile.circlesAddress);
              },
            }
          : "",
        recipientProfile.youTrust
          ? {
              key: "setTrust",
              icon: "untrust",
              title: "Untrust",
              colorClass: "text-alert",
              action: async () => {
                window.o.runProcess(setTrust, {
                  trustLimit: 0,
                  trustReceiver: recipientProfile.circlesAddress,
                  safeAddress: mySafeAddress,
                  privateKey: sessionStorage.getItem("circlesKey"),
                });
              },
            }
          : {
              key: "setTrust",
              icon: "trust",
              title: "Trust",
              action: async () => {
                window.o.runProcess(setTrust, {
                  trustLimit: 100,
                  trustReceiver: recipientProfile.circlesAddress,
                  safeAddress: mySafeAddress,
                  privateKey: sessionStorage.getItem("circlesKey"),
                });
              },
            },
      ]);
    }

    if (!recipientProfile) {
      actions = actions.concat({
        key: "setTrust",
        icon: "trust",
        title: "Trust",
        action: async () => {
          window.o.runProcess(setTrust, {
            trustLimit: 100,
            safeAddress: mySafeAddress,
            privateKey: sessionStorage.getItem("circlesKey"),
          });
        },
      });
    }

    return actions;
  },
};

export const profile: Page<any, ContactsDappState> = {
  type: "page",
  isSystem: true,
  position: "modal",
  routeParts: [":id"],
  title: "Profile",
  component: ProfilePage,
};

const graph: Page<any, ContactsDappState> = {
  routeParts: ["=graph"],
  component: Graph,
  title: "Network",
  icon: "network",
  type: "page",
};

export const chatdetail: Page<any, ContactsDappState> = {
  type: "page",
  isSystem: true,
  position: "modal",
  routeParts: ["=chat", ":id"],
  title: "Chat",
  component: ChatDetail,
};

export const chat: Page<any, ContactsDappState> = {
  routeParts: ["=chat"],
  component: Chat,
  title: "Chat",
  icon: "chat",
  type: "page",
};

export const friends: DappManifest<DappState> = {
  type: "dapp",
  dappId: "friends:1",
  isSingleton: true,
  icon: "group",
  title: "Friends",
  routeParts: ["=friends"],
  defaultRoute: [],
  tag: Promise.resolve("alpha"),
  isEnabled: true,
  jumplist: profileJumplist,
  hideFooter: true,
  initialize: async (stack, runtimeDapp) => {
    // Do init stuff here
    const myProfileResult = await new Promise<Profile>((resolve) => {
      const unsub = me.subscribe((myProfile) => {
        resolve(myProfile);
      });
      unsub();
    });

    if (myProfileResult) {
      await init();
    }

    return {
      initialRoutable: index,
      cancelDependencyLoading: false,
    };
  },
  routables: [chat, chatdetail, profile],
};
