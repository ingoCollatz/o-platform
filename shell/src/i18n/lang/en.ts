export const en = {
  "en": {
    "common": {
      "empty": "",
      "trusted": "trusted",
      "untrusted": "untrusted",
      "you": "you",
      "tokens": "tokens"
    },
    "dapps": {
      "o-banking": {
        "atoms": {
          "transferConfirmation": {
            "paymentPath": "Payment Path",
            "recipientAddress": "Recipient Address"
          },
          "transferSummary": {
            "paymentPath": "Payment Path",
            "amount": "Amount",
            "recipientAddress": "Recipient Address",
            "transactionHash": "Transaction Hash"
          }
        },
        "pages": {
          "assets": {
            "loadingTokens": "Loading Tokens..."
          },
          "crcDetail": {
            "individualCircles": "Individual Circles",
            "loadingTokens": "Loading Tokens..."
          },
          "transactionDetail": {
            "paymentPath": "Payment Path",
            "fullAmountCrc": "Full amount in CRC",
            "amountCircles": "Amount Circles"
          }
        },
        "processes": {
          "setTrust": {
            "editorContent": {
              "recipient": {
                "title": "Select the person you want to trust",
                "description": "",
                "placeholder": "Select",
                "submitButtonText": "Set Trust"
              },
              "limit": {
                "title": "Please enter ther Amount",
                "description": "",
                "submitButtonText": "Submit"
              },
              "message": {
                "title": "Transfer Message",
                "description": "",
                "submitButtonText": "Submit"
              },
              "confirm": {
                "title": "Confirm",
                "description": "",
                "submitButtonText": "Confirm"
              },
              "success": {
                "title": "Trust successful",
                "description": "",
                "submitButtonText": "Close"
              }
            },
            "checkTrustLimit": {
              "contecxMessage": "'As soon as you trust yourself, you will know how to live.' --Johann Wolfgang von Goethe"
            },
            "setTrust": {
              "message": "Updating trust .."
            },
            "showSuccess": {
              "html": "<p>Trust changed</p>"
            },
            "success": {
              "return": "yeah!"
            }
          },
          "showAssetDetail": {
            "success": {
              "return": "yeah!"
            }
          },
          "showProfile": {
            "success": {
              "return": "yeah!"
            }
          },
          "showTransaction": {
            "success": {
              "return": "yeah!"
            }
          },
          "transfer": {
            "strings": {
              "labelRecipientAddress": "SSSSelect the recipient you want to send money to",
              "tokensLabel": "Please enter the amount",
              "currencyCircles": "CRC",
              "currencyXdai": "xDai",
              "summaryLabel": "Summary",
              "messageLabel": "Purpose of transfer"
            },
            "editorContent": {
              "recipient": {
                "title": "Select the recipient you want to send money to",
                "description": "",
                "placeholder": "Recipient",
                "submitButtonText": "Enter Name"
              },
              "recipientSafeAddress": {
                "title": "Enter the recipients safe address",
                "description": "Here you can enter the recipients safe address directly.",
                "placeholder": "Safe Address",
                "submitButtonText": "Next"
              },
              "currency": {
                "title": "Please enter ther Amount in Euro",
                "description": "",
                "submitButtonText": "Submit"
              },
              "message": {
                "title": "Transfer Message",
                "description": "",
                "submitButtonText": "Submit"
              },
              "confirm": {
                "title": "You are about to transfer",
                "description": "",
                "submitButtonText": "Send Money"
              },
              "success": {
                "title": "Transfer successful",
                "description": "",
                "submitButtonText": "Close"
              }
            },
            "recipientAddress": {
              "submitButtonText": "Check send limit"
            },
            "tokens": {
              "dataSchema": {
                "min": "Please enter at least 0.1",
                "typeError": "Please enter a valid number.",
                "required": "Please enter a valid amount.",
                "positive": "Please enter a valid amounr."
              },
              "currency": "Please select a vlid currency"
            },
            "findMaxFlow": {
              "entry": {
                "message": "Calcilating the maximum transfer amoubt .."
              },
              "invoke": { "error": "No recipient address on context" }
            },
            "checkAmount": {
              "contextMessages": "The chosen amount exceeds the maximum transfarable amount of (${formattedMax})."
            }
          },
          "transferCircles": {
            "strings": {
              "labelRecipientAddress": "",
              "labelAmount": ""
            }
          },
          "trasnferXdai": {
            "strings": {
              "labelRecipientAddress": "",
              "labelAmount": ""
            },
            "trasnferXdai": {
              "entry": {
                "message": "Processing xDai transfer .."
              }
            }
          }
        }
      },
      "o-contacts": {
        "chatListItems": {
          "atoms": {
            "crcHubTransfer": {
              "getValues": {
                "icon": "sendmoney",
                "title": "",
                "titleClass": "",
                "text": "",
                "ifIn": "Sent you",
                "ifOut": {
                  "youSent": "You sent",
                  "to": "to"
                }
              }
            },
            "crcTrust": {
              "getValues": {
                "icon": "trust",
                "title": "",
                "titleClass": "",
                "ifIn&&=0": "untrusted you",
                "ifIn&&>0": "trusted you",
                "ifOut&&=0": "You untrusted",
                "ifOut&&>0": "You trusted"
              }
            },
            "erc20Transfer": {
              "getValues": {
                "icon": "sendmoney",
                "title": "",
                "titleClass": "",
                "text": "",
                "ifIn": {
                  "title": {
                    "sentYou": "sent you",
                    "tokens": "tokens"
                  }
                },
                "ifOut": {
                  "youSent": "You sent",
                  "tokensTo": "tokens to"
                }
              }
            },
            "invitationRedeemed": {
              "getValues": {
                "icon": "trust",
                "title": "",
                "titleClass": "",
                "text": "",
                "invitationRedeemed": {
                  "title": "redeemed your invitation"
                }
              }
            }
          },
          "chatListCard": {
            "trustStatus": "",
            "mutualTrust": "mutual trust",
            "trustedByYou": "trusted by you",
            "isTrustingYou": "is trusting you",
            "notTrusted": "not trusted"
          }
        }
      },
      "o-coop": "",
      "o-dashboard": "",
      "o-homepage": "",
      "o-maketplace": "",
      "o-onboardeing": "",
      "o-passport": "",
      "o-stats": "",
      "o-verification": ""
    },
    "shared": {}
  }
}