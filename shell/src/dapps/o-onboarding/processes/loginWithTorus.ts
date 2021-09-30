import { ProcessContext } from "@o-platform/o-process/dist/interfaces/processContext";
import { createMachine } from "xstate";
import { fatalError } from "@o-platform/o-process/dist/states/fatalError";
import { ProcessDefinition } from "@o-platform/o-process/dist/interfaces/processManifest";
import { promptChoice } from "../../o-passport/processes/identify/prompts/promptChoice";
import ButtonStackSelector from "@o-platform/o-editors/src/ButtonStackSelector.svelte";
import OpenLogin from "@toruslabs/openlogin";
import NumberEditor from "../../../../../packages/o-editors/src/NumberEditor.svelte";
import * as yup from "yup";
import {prompt} from "@o-platform/o-process/dist/states/prompt";
import {KeyManager} from "../../o-passport/data/keyManager";
import {RpcGateway} from "@o-platform/o-circles/dist/rpcGateway";
import HtmlViewer from "../../../../../packages/o-editors/src/HtmlViewer.svelte";
import {PlatformEvent} from "@o-platform/o-events/dist/platformEvent";
import {show} from "@o-platform/o-process/dist/actions/show";
import ErrorView from "../../../shared/atoms/Error.svelte";

export type LoginWithTorusContextData = {
  chooseFlow?: {
    key: string;
    label: string;
  };
  userInfo?: any;
  privateKey?:string;
  encryptionPin?:string;
  decryptionPin?:string;
  accountAddress?:string;
  successAction?: (data:LoginWithTorusContextData) => void;
};

export type LoginWithTorusContext = ProcessContext<LoginWithTorusContextData>;

const processDefinition = (processId: string) =>
  createMachine<LoginWithTorusContext, any>({
    id: `${processId}:loginWithTorus`,
    initial: "init",
    states: {
      // Include a default 'error' state that propagates the error by re-throwing it in an action.
      // TODO: Check if this works as intended
      ...fatalError<LoginWithTorusContext, any>("error"),

      init: {
        invoke: {
          src: async (context) => {
            const keyManager = new KeyManager(null);
            await keyManager.load();
            const accAddress = keyManager.torusKeyAddress;
            if (accAddress) {
              context.data.accountAddress = accAddress;
            } else {
              (<any>context).openLogin = new OpenLogin({
                clientId: "BI3cr1l8ztZhkaRFFsh2cY77o6H74JHP0KaigRdh30Y53YDpMatb9QDiPh14zl176ciAUMbi7JlmjNe5MPLwzAE",
                network: "mainnet",
                // redirectUrl: "http://localhost:5000/#/banking/transactions", // your app url where user will be redirected
                uxMode: "popup", // default is redirect , popup mode is also supported,
              });
              await (<any>context).openLogin.init();
            }
          },
          onDone: [{
            cond: (context) => (<any>context).openLogin !== undefined,
            target:"chooseFlow"
          },{
            cond: (context) => context.data.accountAddress !== undefined,
            target:"#enterDecryptionPin"
          }]
        }
      },
      chooseFlow: promptChoice({
        id: "chooseFlow",
        component: ButtonStackSelector,
        entry: () => console.log("chooseFlow"),
        params: {
          view: {
            title: "Please choose a sign-in option:",
            description: "Hello World",
            placeholder: "",
            submitButtonText: "",
          },
        },
        options: [
          {
            key: "google",
            label: "Login with Google",
            target: "#google",
            class: "btn-info",
          },
          {
            key: "apple",
            label: "Login with Apple",
            target: "#apple",
            class: "btn-info",
          },
          {
            key: "github",
            label: "Login with Github",
            target: "#github",
            class: "btn-info",
          },
          {
            key: "email",
            label: "Login with E-Mail",
            target: "#email",
            class: "btn-info",
          }
        ],
      }),

      google: {
        id: "google",
        invoke: {
          src: async (context) => {
            const openLogin: OpenLogin = (<any>context).openLogin;
            const privateKey = await openLogin.login({
              loginProvider: "google"
            });
            return {
              privateKey: privateKey,
              userInfo: await openLogin.getUserInfo()
            };
          },
          onDone: {
            actions: "assignPrivateKeyAndUserInfoToContext",
            target: "#enterEncryptionPin"
          }
        }
      },
      apple: {
        id: "apple",
        invoke: {
          src: async (context) => {
            const openLogin: OpenLogin = (<any>context).openLogin;
            const privateKey = await openLogin.login({
              loginProvider: "apple"
            });
            return {
              privateKey: privateKey,
              userInfo: await openLogin.getUserInfo()
            };
          },
          onDone: {
            actions: "assignPrivateKeyAndUserInfoToContext",
            target: "#enterEncryptionPin"
          }
        }
      },
      github: {
        id: "github",
        invoke: {
          src: async (context) => {
            const openLogin: OpenLogin = (<any>context).openLogin;
            const privateKey = await openLogin.login({
              loginProvider: "github"
            });
            return {
              privateKey: privateKey,
              userInfo: await openLogin.getUserInfo()
            };
          },
          onDone: {
            actions: "assignPrivateKeyAndUserInfoToContext",
            target: "#enterEncryptionPin"
          }
        }
      },
      email: {
        id: "email",
        invoke: {
          src: async (context) => {
            const openLogin: OpenLogin = (<any>context).openLogin;
            const privateKey = await openLogin.login({
              loginProvider: "email_passwordless",
            });
            return {
              privateKey: privateKey,
              userInfo: await openLogin.getUserInfo()
            };
          },
          onDone: {
            actions: "assignPrivateKeyAndUserInfoToContext",
            target: "#enterEncryptionPin"
          }
        }
      },
      enterEncryptionPin: prompt<LoginWithTorusContext, any>({
        id: "enterEncryptionPin",
        field: "encryptionPin",
        component: NumberEditor,
        isSensitive: true,
        params: {
          view: {
            title: "Please enter a pin",
            description: "The pin will be used to encrypt your private key on your device.",
            placeholder: "Enter Pin",
            submitButtonText: "Store private key on this device",
          }
        },
        dataSchema: yup.string().required("Please enter a pin to protect your private key."),
        navigation: {
          next: "#storeKey",
        }
      }),
      enterDecryptionPin: prompt<LoginWithTorusContext, any>({
        id: "enterDecryptionPin",
        field: "decryptionPin",
        component: NumberEditor,
        isSensitive: true,
        params: {
          view: {
            title: "Please your pin",
            description: "The pin will be used to decrypt your private key on your device.",
            placeholder: "Enter Pin",
            submitButtonText: "Unlock",
          }
        },
        dataSchema: yup.string().required("Please enter a encryptingPin to protect your private key."),
        navigation: {
          next: "#unlockKey",
        }
      }),
      unlockKey: {
        id: "unlockKey",
        invoke: {
          src: async (context) => {
            const km = new KeyManager(null);
            await km.load();
            let privateKey:string|null = null;
            try {
              privateKey = await km.getKey(context.data.accountAddress, context.data.decryptionPin);
            } catch (e) {
              context.messages["decryptionPin"] = `Couldn't decrypt your key: ${e.message}`;
              throw e;
            }

            if (!privateKey || privateKey == "") {
              delete context.data.decryptionPin;
              delete context.data.privateKey;
              context.messages["decryptionPin"] = "Couldn't decrypt your key. Have you entered the correct pin?"
              throw new Error(context.messages["decryptionPin"]);
            }

            sessionStorage.setItem("circlesKey", privateKey);

            delete context.data.privateKey;
            delete context.data.decryptionPin;
          },
          onDone: "#showSuccess",
          onError: {
            target: "#enterDecryptionPin"
          }
        }
      },
      storeKey: {
        id: "storeKey",
        invoke: {
          src: async (context) => {
            const km = new KeyManager(null);
            const account = RpcGateway.get().eth.accounts.privateKeyToAccount(context.data.privateKey);

            await km.addEoa(account.address, account.privateKey, context.data.encryptionPin, "torus");

            context.data.accountAddress = account.address;
            sessionStorage.setItem("circlesKey", account.privateKey);

            delete context.data.privateKey;
            delete context.data.encryptionPin;
          },
          onDone: "#showSuccess",
          onError: {
            actions: (context, event) => {
              window.o.lastError = event.data;
            },
            target: "#showError"
          }
        }
      },
      showError:{
        id: "showError",
        entry: show({ // TODO: fix <any> cast
          component: ErrorView,
          params: {},
          field: {
            name: "",
            get:() => undefined,
            set:(o:any) => {}
          }
        })
      },
      showSuccess: prompt({
        id: "showSuccess",
        field: "__",
        component: HtmlViewer,
        params: {
          html: (context) => `<p>You successfully logged on as ${context.data.accountAddress}.</p>`,
          view: {
            submitButtonText: "Close",
            hideNav: false
          }
        },
        navigation: {
          next: "#success",
        },
      }),
      success: {
        id: "success",
        type: "final",
        entry: (context, event: PlatformEvent) => {
          if (context.data.successAction) {
            context.data.successAction(context.data);
          }
        },
        data: (context, event) => {
          return context.data.accountAddress;
        }
      }
    }
  }, {
    actions: {
      assignPrivateKeyAndUserInfoToContext: (context, event) => {
        context.data.privateKey = event.data.privateKey.privKey;
        context.data.userInfo = event.data.userInfo;
      }
    }
  });

export const loginWithTorus: ProcessDefinition<void, LoginWithTorusContext> = {
  name: "loginWithTorus",
  stateMachine: <any>processDefinition,
};
