import Home from "./o-homepage/pages/Home.svelte";
import { Page } from "@o-platform/o-interfaces/dist/routables/page";
import { DappManifest } from "@o-platform/o-interfaces/dist/dappManifest";
import { Link } from "@o-platform/o-interfaces/dist/routables/link";
import Terms from "./o-homepage/pages/Terms.svelte";
import Privacy from "./o-homepage/pages/Privacy.svelte";
import Survey from "./o-homepage/pages/Survey.svelte";

const externalChat: Link<any, DappState> = {
  type: "link",
  title: "common.support",
  icon: "support",
  routeParts: ["=chat"],
  openInNewTab: true,
  url: () => "https://api.whatsapp.com/send?phone=6281381556669",
};
const externalForum: Link<any, DappState> = {
  type: "link",
  title: "common.forum",
  icon: "forum",
  routeParts: ["=forum"],
  openInNewTab: true,
  url: () => "https://aboutcircles.com/c/earth-circle-dao/13",
};
const login: Page<any, DappState> = {
  isSystem: true,
  routeParts: ["=login"],
  component: Home,
  title: "<span class='text-3xl'>CIRCLES</span><span class='text-2xl'>UBI.ID</span>",
  type: "page",
};

const index: Page<any, DappState> = {
  isSystem: true,
  routeParts: [],
  component: Home,
  title: "<span class='text-3xl'>CIRCLES</span><span class='text-2xl'>UBI.ID</span>",
  icon: "homeSidemenu",
  type: "page",
};

const invite: Page<{ inviteCode: string }, DappState> = {
  isSystem: true,
  anonymous: true,
  routeParts: ["=invite", ":inviteCode"],
  component: Home,
  title: "<span class='text-3xl'>CIRCLES</span><span class='text-2xl'>UBI.ID</span>",
  type: "page",
};

const terms: Page<any, DappState> = {
  type: "page",
  isSystem: true,
  anonymous: true,
  title: "common.termsOfService",
  routeParts: ["=terms"],
  icon: "forum",
  component: Terms,
};

const privacy: Page<any, DappState> = {
  type: "page",
  isSystem: true,
  anonymous: true,
  title: "common.privacyPolicy",
  routeParts: ["=privacy"],
  icon: "forum",
  component: Privacy,
};

const survey: Page<any, DappState> = {
  type: "page",
  isSystem: true,
  anonymous: true,
  title: "dapps.o-homepage.pages.survey.title",
  pageBackgroundClass: "bg-cpurple",
  routeParts: ["=survey", ":id"],
  icon: "forum",
  component: Survey,
};

export interface DappState {
  // put state here
}

export const homepage: DappManifest<DappState> = {
  type: "dapp",
  dappId: "homepage:1",
  isSingleton: true,
  isHidden: true,
  icon: "home",
  anonymous: true,
  title: "<span class='text-3xl'>CIRCLES</span><span class='text-2xl'>UBI.ID</span>",
  routeParts: [],
  tag: Promise.resolve("alpha"),
  isEnabled: true,
  hideFooter: false,
  isFullWidth: true,
  initialize: async (stack, runtimeDapp) => {
    // Do init stuff here
    return {
      initialRoutable: index,
      cancelDependencyLoading: false,
    };
  },
  routables: [index, invite, login, terms, privacy, externalChat, survey],
};
