import ChatDetail from "./o-contacts/pages/ChatDetail.svelte";
import Chat from "./o-contacts/pages/Chat.svelte";
import { Page } from "@o-platform/o-interfaces/dist/routables/page";
import { Profile } from "./o-banking/data/api/types";
import { me } from "../shared/stores/me";
import { DappManifest } from "@o-platform/o-interfaces/dist/dappManifest";
import { init} from "./o-banking/init";

export interface DappState {
  // put state here
}

export class ChatDappState {
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

export const chatdetail: Page<any, ChatDappState> = {
  type: "page",
  isSystem: true,
  position: "modal",
  routeParts: ["=chat", ":id"],
  title: "Chat",
  component: ChatDetail,
};

const index: Page<any, ChatDappState> = {
  routeParts: [],
  component: Chat,
  title: "Chat",
  icon: "chat",
  type: "page",
};

export const chat: DappManifest<DappState> = {
  type: "dapp",
  dappId: "chat:1",
  isSingleton: true,
  icon: "group",
  title: "Chat",
  routeParts: ["=chat"],
  defaultRoute: [],
  tag: Promise.resolve("alpha"),
  isEnabled: true,
  hideFooter: true,
  initialize: async (stack, runtimeDapp) => {
    // Do init stuff here
    const myProfileResult = await new Promise<Profile>((resolve) => {
      me.subscribe((myProfile) => {
        resolve(myProfile);
      });
    });

    if (myProfileResult) {
      await init();
    }

    return {
      initialRoutable: chat,
      cancelDependencyLoading: false,
    };
  },
  routables: [index, chatdetail],
};
