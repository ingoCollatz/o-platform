import {assign, createMachine, send} from "xstate";
import {actions} from "xstate";
import {getSessionInfo} from "../../o-passport/processes/identify/services/getSessionInfo";
import {BN} from "ethereumjs-util";
import {loadProfile} from "../../o-passport/processes/identify/services/loadProfile";
import {
  ClaimedInvitationDocument, HubSignupTransactionDocument,
  InvitationTransactionDocument,
  SafeFundingTransactionDocument,
  WhoamiDocument
} from "../../../shared/api/data/types";
import {RpcGateway} from "@o-platform/o-circles/dist/rpcGateway";
import {upsertIdentity} from "../../o-passport/processes/upsertIdentity";
import {upsertRegistration} from "./registration/promptRegistration";
import {promptConnectOrCreate} from "./connectOrCreate/promptConnectOrCreate";
import {promptRedeemInvitation} from "./invitation/promptRedeemInvitation";
import {promptGetInvited} from "./invitation/promptGetInvited";
import {acquireSession} from "../../o-passport/processes/identify/aquireSession/acquireSession2";
import {fundSafeFromEoa} from "./fundSafeFromEoa/fundSafeFromEoa";
import {CirclesHub} from "@o-platform/o-circles/dist/circles/circlesHub";
import {HUB_ADDRESS} from "@o-platform/o-circles/dist/consts";
import {GnosisSafeProxy} from "@o-platform/o-circles/dist/safe/gnosisSafeProxy";
import {PlatformEvent} from "@o-platform/o-events/dist/platformEvent";
import {KeyManager} from "../../o-passport/data/keyManager";
import {unlockKey} from "./unlockKey/unlockKey";
import {InitEvent, UbiData} from "./initEvent";
import {InitContext} from "./initContext";
import {push} from "svelte-spa-router";

export const initMachine = createMachine<InitContext, InitEvent>({
  id: `init`,
  initial: "initial",
  context: {
    session: null,
    registration: null,
    invitation: null,
    profile: null,
    eoa: null,
    eoaInvitationTransaction: null,
    safe: null,
    safeInvitationTransaction: null,
    ubi: null
  },
  on: {
    CANCEL: "cancelled"
  },
  states: {
    initial: {
      invoke: {src: "loadSession"},
      on: {
        NO_SESSION: {
          actions: "acquireSessionAndRestart"
        },
        LOGGED_IN: {
          target: "initial"
        },
        CANCELLED: {
          actions: [
            send({type: "CANCEL"})
          ]
        },
        GOT_SESSION: {
          actions: "assignSessionInfoToContext",
          target: "register"
        }
      }
    },
    register: {
      invoke: {src: "loadRegistration"},
      on: {
        NO_REGISTRATION: {
          actions: "upsertRegistrationAndRestart"
        },
        REGISTERED: {
          target: "register"
        },
        CANCELLED: {
          actions: [
            send({type: "CANCEL"})
          ],
        },
        REGISTRATION_ERROR: {
          actions: [
            (ctx, event) => {
              console.error(event);
              throw event.error;
            },
            send({type: "CANCEL"})
          ]
        },
        GOT_REGISTRATION: {
          actions: "assignRegistrationToContext",
          target: "invitation"
        }
      }
    },
    invitation: {
      invoke: {src: "loadClaimedInvitation"},
      on: {
        NO_INVITATION: {
          actions: "promptGetInvitedAndRestart"
        },
        NO_INVITATION_NECESSARY: {
          target: "safe"
        },
        GOT_INVITED: {
          target: "invitation"
        },
        INVITATION_ERROR: {
          actions: [
            (ctx, event) => {
              console.error(event);
              throw event.error;
            },
            send({type: "CANCEL"})
          ]
        },
        GOT_INVITATION: {
          actions: "assignInvitationToContext",
          target: "eoa"
        }
      }
    },
    eoa: {
      initial: "load",
      states: {
        load: {
          invoke: {src: "loadEoa"},
          on: {
            LOCKED_EOA: {
              target: "tryUnlockEoa"
            },
            NO_EOA: {
              target: "connectOrCreate"
            },
            GOT_EOA: {
              actions: "assignEoaToContext",
              target: "checkInvitation"
            }
          }
        },
        tryUnlockEoa: {
          entry: "unlockEoaAndRestart"
        },
        connectOrCreate: {
          entry: "promptConnectOrCreateAndRestart",
          on: {
            CANCELLED: {
              actions: [
                send({type: "CANCEL"})
              ]
            },
            EOA_CONNECTED: {
              target: "load"
            },
            EOA_CREATED: {
              target: "load"
            }
          }
        },
        checkInvitation: {
          invoke: {src: "loadEoaInvitationTransaction"},
          on: {
            NOT_REDEEMED: {
              target: "redeemInvitation"
            },
            GOT_REDEEMED: {
              actions: "assignEoaInvitationTransactionToContext",
              target: "eoaReady"
            }
          }
        },
        redeemInvitation: {
          entry: "promptRedeemInvitationAndRestart",
          on: {
            REDEEMED: {
              target: "load"
            },
            CANCELLED: {
              actions: [
                send({type: "CANCEL"})
              ]
            }
          }
        },
        eoaReady: {
          type: "final"
        }
      },
      onDone: "safe"
    },
    safe: {
      initial: "load",
      states: {
        load: {
          invoke: {src: "loadSafe"},
          on: {
            NO_SAFE: {
              target: "connectOrCreate"
            },
            GOT_SAFE: {
              actions: "assignSafeToContext",
              target: "checkInvitation"
            }
          }
        },
        connectOrCreate: {
          entry: [
            () => {
              window.o.runProcess(promptConnectOrCreate, {
                successAction: (data) => {
                 // (<any>window).runInitMachine();
                }
              });
            }
          ],
          on: {
            CANCELLED: {
              actions: send({type: "CANCEL"})
            },
            SAFE_CONNECTED: {
              target: "load"
            },
            SAFE_CREATED: {
              target: "load"
            }
          }
        },
        checkInvitation: {
          invoke: {src: "loadSafeInvitationTransaction"},
          on: {
            SAFE_NOT_FUNDED: {
              target: "fundSafeFromEoa"
            },
            GOT_SAFE_FUNDED: {
              actions: "assignSafeInvitationTransactionToContext",
              target: "safeReady"
            }
          }
        },
        fundSafeFromEoa: {
          entry: "fundSafeFromEoaAndRestart",
          on: {
            FUNDED: {
              target: "load"
            },
            CANCELLED: {
              actions: send({type: "CANCEL"})
            }
          }
        },
        safeReady: {
          type: "final"
        }
      },
      onDone: "profile"
    },
    profile: {
      invoke: {src: "loadProfile"},
      on: {
        NO_PROFILE: {
          actions: "upsertIdentityAndRestart"
        },
        CANCELLED: {
          actions: [
            send({type: "CANCEL"})
          ]
        },
        PROFILE_CREATED: {
          target: "profile"
        },
        GOT_PROFILE: {
          actions: "assignProfileToContext",
          target: "ubi"
        }
      }
    },
    ubi: {
      invoke: {src: "loadUbi"},
      on: {
        NO_UBI: {
          target: "signupForUbi"
        },
        GOT_UBI: {
          actions: "assignUbiToContext",
          target: "finalize"
        }
      }
    },
    signupForUbi: {
      invoke: {
        src: "signupForUbi",
        onDone: "success"
      },
      on: {
        UBI_ERROR: {
          target: "cancelled"
        },
        GOT_UBI: {
          actions: "assignUbiToContext",
          target: "finalize"
        }
      }
    },
    finalize: {
      invoke: {
        src: "sendAuthenticatedEvent",
        onDone: "success"
      }
    },
    cancelled: {
      type: "final"
    },
    success: {
      entry: () => {
        push("#/dashboard");
      },
      type: "final"
    }
  }
}, {
  services: {
    loadSession: () => (callback) => {
      getSessionInfo()
        .then(sessionInfo => {
          if (sessionInfo.isLoggedOn) {
            callback(<any>{type: "GOT_SESSION", session: sessionInfo});
          } else {
            callback({type: "NO_SESSION"});
          }
        })
        .catch(e => {
          console.warn(`Couldn't determine the session state -> Assuming "NO_SESSION".`, e);
          callback({type: "NO_SESSION"});
        });
    },
    loadRegistration: (ctx) => (callback) => {
      if (!ctx.session) throw new Error(`ctx.session is not set`);

      if (!ctx.session.profileId) {
        callback({type: "NO_REGISTRATION"});
        return;
      }

      let email: string;

      window.o.apiClient.client.subscribeToResult()
        .then(apiClient => {
          return apiClient.query({
            query: WhoamiDocument,
          })
        })
        .then(result => {
          if (result.errors) {
            callback({
              type: "REGISTRATION_ERROR",
              error: new Error(`Couldn't load the registration for the following reason: ${JSON.stringify(result.errors)}`)
            });
          } else {
            email = result.data.whoami;
            return loadProfile(ctx.session.profileId)
          }
        })
        .then(profile => {
          callback({
            type: "GOT_REGISTRATION",
            registration: {
              email: email,
              profileId: profile.id,
              circlesSafeOwner: profile.circlesSafeOwner,
              acceptedToSVersion: "", // TODO: Important in the context?
              subscribedToNewsletter: profile.newsletter
            }
          });
        })
        .catch(e => {
          callback({type: "REGISTRATION_ERROR", error: e});
        });
    },
    loadClaimedInvitation: (ctx) => (callback) => {
      if (!ctx.registration) throw new Error(`ctx.registration is not set`);

      /*callback({type: "NO_INVITATION"});
      return;*/

      window.o.apiClient.client.subscribeToResult()
        .then(apiClient => {
          return apiClient.query({
            query: ClaimedInvitationDocument
          })
        })
        .then(async result => {
          if (result.errors) {
            callback({
              type: "INVITATION_ERROR",
              error: new Error(`Couldn't load the registration for the following reason: ${JSON.stringify(result.errors)}`)
            });
            return;
          }
          if (!result.data.claimedInvitation) {

            // Maybe the user already has enough xDai to complete the process
            // if so we'll emit NO_INVITATION_NECESSARY
            const myProfile = await loadProfile();
            const eoaBalance = await RpcGateway.get().eth.getBalance(myProfile.circlesSafeOwner);
            if (new BN(eoaBalance).lt(new BN(RpcGateway.get().utils.toWei("0.1", "ether")))) {
              callback({type: "NO_INVITATION"});
            } else {
              callback({type: "NO_INVITATION_NECESSARY"});
            }
            return;
          }

          // TODO: Why is the any cast necessary for the "GOT_INVITATION" event?
          // callback({type: "NO_INVITATION"});
          callback(<InitEvent>{type: "GOT_INVITATION", invitation: result.data.claimedInvitation});
        })
        .catch(e => {
          callback({
            type: "INVITATION_ERROR",
            error: e
          });
        });
    },
    loadProfile: (ctx) => (callback) => {
      // if (!ctx.invitation) throw new Error(`ctx.invitation is not set`);

      loadProfile()
        .then(profile => {
          if (profile.firstName.trim() !== "") {
            callback({
              type: "GOT_PROFILE",
              profile: {
                id: profile.id,
                avatarUrl: profile.avatarUrl,
                lastName: profile.lastName,
                firstName: profile.firstName,
                cityId: profile.cityGeonameid,
                passion: profile.dream,
                circlesSafeOwner: profile.circlesSafeOwner
              }
            })
          } else {
            callback({type: "NO_PROFILE"});
          }
        })
        .catch(e => {
          callback({type: "PROFILE_ERROR", error: e});
        });
    },
    loadEoa: (ctx) => async (callback) => {
      if (!ctx.registration) throw new Error(`ctx.registration is not set`);

      const keyManager = new KeyManager(null);
      await keyManager.load();

      const key = sessionStorage.getItem("circlesKey");
      if (keyManager.torusKeyAddress && !key) {
        callback({type: "LOCKED_EOA"});
        return;
      }

      if (!key || !ctx.registration.circlesSafeOwner) {
        callback({type: "NO_EOA"});
        return;
      }
      try {
        const eoa = RpcGateway.get().eth.accounts.privateKeyToAccount(key);
        if (!eoa) {
          callback({
            type: "EOA_ERROR",
            error: new Error(`Couldn't derive the EOA address from the stored private key.`)
          });
          return;
        }
        RpcGateway.get().eth.getBalance(eoa.address).then(balance => {
          callback({
            type: "GOT_EOA", eoa: {
              address: eoa.address,
              privateKey: key,
              origin: "Created",
              balance: new BN(balance)
            }
          });
        }).catch(e => {
          callback({type: "EOA_ERROR", error: e});
        })
      } catch (e) {
        callback({type: "EOA_ERROR", error: e});
      }
    },
    loadEoaInvitationTransaction: (ctx) => (callback) => {
      if (!ctx.eoa) throw new Error(`ctx.eoa is not set`);

      window.o.apiClient.client.subscribeToResult().then(apiClient => {
        return apiClient.query({
          query: InvitationTransactionDocument
        });
      })
        .then(result => {
          // TODO: Find the transaction from the "invitation EOA" to the user's EOA (must be the only outgoing transaction from the invite-eoa)
          if (result.errors || !result.data?.invitationTransaction?.transaction_hash) {
            callback({type: "NOT_REDEEMED"});
          } else {
            callback({type: "GOT_REDEEMED", transaction: result.data.invitationTransaction.transaction_hash});
          }
        })
    },
    loadSafe: (ctx) => (callback) => {
      loadProfile().then(result => {
        if (!result.circlesAddress) {
          callback({type: "NO_SAFE"});
        } else {
          // TODO: Check if the safe is owned by the previously queried EOA.
          RpcGateway.get().eth.getBalance(result.circlesAddress).then(balance => {
            callback({
              type: "GOT_SAFE", safe: {
                address: result.circlesAddress,
                origin: "Created", // TODO: Find correct origin,
                balance: new BN(balance)
              }
            });
          })
            .catch(error => {
              callback({
                type: "SAFE_ERROR",
                error: error
              })
            });
        }
      })
        .catch(error => {
          callback({
            type: "SAFE_ERROR",
            error: error
          })
        })
    },
    loadSafeInvitationTransaction: (ctx) => (callback) => {
      if (!ctx.safe) throw new Error(`ctx.safe is not set`);

      window.o.apiClient.client.subscribeToResult().then(apiClient => {
        return apiClient.query({
          query: SafeFundingTransactionDocument
        });
      })
        .then(result => {
          // TODO: Find the invitation transaction from the user's EOA to the safe (use IndexedTransactions from the API.)
          if (result.errors || !result.data.safeFundingTransaction) {
            callback({type: "SAFE_NOT_FUNDED"});
          } else {
            callback({type: "GOT_SAFE_FUNDED", transaction: result.data.safeFundingTransaction});
          }
        });
    },
    loadUbi: (ctx) => (callback) => {
      window.o.apiClient.client.subscribeToResult()
        .then(apiClient => apiClient.query({
          query: HubSignupTransactionDocument
        }))
        .then(result => {
          if (result.errors || !result.data.hubSignupTransaction) {
            callback({type: "NO_UBI"});
          } else {
            callback({
              type: "GOT_UBI", ubi: <UbiData>{
                tokenAddress: result.data.hubSignupTransaction.payload.token
              }
            });
          }
        });

      // TODO: Check if the user's safe is already signed up at the UBI hub
    },
    signupForUbi: (ctx) => async (callback) => {
      const hub = new CirclesHub(RpcGateway.get(), HUB_ADDRESS);
      const privateKey = sessionStorage.getItem("circlesKey");
      if (!privateKey)
        throw new Error(`The private key is not unlocked`);
      const safeProxy = new GnosisSafeProxy(RpcGateway.get(), ctx.safe.address);
      const receipt = await (await hub.signup(privateKey, safeProxy)).toPromise();
      console.log(receipt);
    },
    validateInvitation: async (context, event) => {
      send({type: "INVITATION_USED"});
      // send({type: "INVITATION_UNUSED"});
    },
    sendAuthenticatedEvent: async (context) => {
      window.o.publishEvent(<PlatformEvent>{
        type: "shell.authenticated",
        profile: await loadProfile()
      });
    }
  },
  actions: {
    acquireSessionAndRestart: () => {
      window.o.runProcess(acquireSession, {
        successAction: (data) => {
          (<any>window).runInitMachine();
        }
      })
    },
    upsertRegistrationAndRestart: () => {
      window.o.runProcess(upsertRegistration, {
        successAction: (data) => {
          (<any>window).runInitMachine();
        }
      })
    },
    promptGetInvitedAndRestart: () => {
      window.o.runProcess(promptGetInvited, {
        successAction: (data) => {
          (<any>window).runInitMachine();
        }
      })
    },
    upsertIdentityAndRestart: (context) => {
      window.o.runProcess(upsertIdentity, {
        id: context.registration.profileId,
        successAction: (data) => {
          (<any>window).runInitMachine();
        }
      })
    },
    unlockEoaAndRestart: (context) => {
      window.o.runProcess(unlockKey, {
        successAction: (data) => {
          (<any>window).runInitMachine();
        }});
    },
    promptConnectOrCreateAndRestart: (context) => {
      window.o.runProcess(promptConnectOrCreate, {
        successAction: (data) => {
          (<any>window).runInitMachine();
        }});
    },
    promptRedeemInvitationAndRestart: () => {
      window.o.runProcess(promptRedeemInvitation, {});
    },
    fundSafeFromEoaAndRestart: () => {
      loadProfile().then(profile => {
        window.o.runProcess(fundSafeFromEoa, {
          successAction: (data) => {
            (<any>window).runInitMachine();
          },
          safeAddress: profile.circlesAddress,
          eoaAddress: profile.circlesSafeOwner
        });
      });
    },
    assignSessionInfoToContext: assign({
      session: (ctx, event) => {
        return event.type == "GOT_SESSION" ? event.session : undefined
      }
    }),
    assignRegistrationToContext: assign({
      registration: (ctx, event) => {
        return event.type == "GOT_REGISTRATION" ? event.registration : undefined
      }
    }),
    assignInvitationToContext: assign({
      invitation: (ctx, event) => {
        return event.type == "GOT_INVITATION" ? event.invitation : undefined
      }
    }),
    assignProfileToContext: assign({
      profile: (ctx, event) => {
        return event.type == "GOT_PROFILE" ? event.profile : undefined
      }
    }),
    assignEoaToContext: assign({
      eoa: (ctx, event) => {
        return event.type == "GOT_EOA" ? event.eoa : undefined
      }
    }),
    assignSafeToContext: assign({
      safe: (ctx, event) => {
        return event.type == "GOT_SAFE" ? event.safe : undefined
      }
    }),
    assignEoaInvitationTransactionToContext: assign({
      eoaInvitationTransaction: (ctx, event) => {
        return event.type == "GOT_REDEEMED" ? event.transaction : undefined
      }
    }),
    assignSafeInvitationTransactionToContext: assign({
      safeInvitationTransaction: (ctx, event) => {
        return event.type == "GOT_SAFE_FUNDED" ? event.transaction : undefined
      }
    }),
    fundSafeFromEoa: () => {
      // TODO: Transfer the invitation amount minus 0.02 xDai from the user's EOA to the safe
      //       and index the transaction.
    },
    assignUbiToContext: assign({
      ubi: (ctx, event) => event.type == "GOT_UBI" ? event.ubi : undefined
    })
  }
});