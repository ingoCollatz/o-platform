import { passport } from "./dapps/o-passport.manifest";
import { banking } from "./dapps/o-banking.manifest";
import { home } from "./dapps/o-dashboard.manifest";
import { homepage } from "./dapps/o-homepage.manifest";
import { marketplace } from "./dapps/o-marketplace.manifest";
import { stats } from "./dapps/o-stats.manifest";
import { DappManifest } from "@o-platform/o-interfaces/dist/dappManifest";
import { friends } from "./dapps/o-contacts.manifest";
import { coop } from "./dapps/o-coop.manifest";

export const dapps: DappManifest<any>[] = [
  homepage,
  passport,
  banking,
  home,
  marketplace,
  stats,
  friends,
  coop,
];
