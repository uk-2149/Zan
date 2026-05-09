/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/escrow.json`.
 */
export type Escrow = {
  "address": "G4AGRutZdKry9rMnJiZt2Noz42ifwghgZxiXCETfXHGg",
  "metadata": {
    "name": "escrow",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "assignProviderToEscrow",
      "discriminator": [
        237,
        53,
        57,
        87,
        107,
        182,
        178,
        159
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "jobEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "job_escrow.job_id",
                "account": "jobEscrow"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "provider",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "closeJobEscrow",
      "discriminator": [
        206,
        68,
        178,
        40,
        243,
        55,
        225,
        191
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "jobEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "job_escrow.job_id",
                "account": "jobEscrow"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "createJobEscrow",
      "discriminator": [
        42,
        204,
        194,
        53,
        124,
        113,
        189,
        230
      ],
      "accounts": [
        {
          "name": "client",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "jobEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "arg",
                "path": "jobId"
              }
            ]
          }
        },
        {
          "name": "jobVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "jobId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "jobId",
          "type": "u64"
        },
        {
          "name": "depositLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeConfig",
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "platformTreasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "authority",
          "type": "pubkey"
        },
        {
          "name": "platformFeeBps",
          "type": "u16"
        },
        {
          "name": "maxJobDepositLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializePlatformTreasury",
      "discriminator": [
        35,
        40,
        189,
        111,
        59,
        198,
        69,
        211
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "platformTreasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeProviderStake",
      "discriminator": [
        146,
        253,
        225,
        23,
        125,
        53,
        19,
        213
      ],
      "accounts": [
        {
          "name": "provider",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "providerStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  118,
                  105,
                  100,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "provider"
              }
            ]
          }
        },
        {
          "name": "providerVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  118,
                  105,
                  100,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "provider"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "initialStakeLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "refundJob",
      "discriminator": [
        194,
        186,
        15,
        90,
        246,
        119,
        89,
        240
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "jobEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "job_escrow.job_id",
                "account": "jobEscrow"
              }
            ]
          }
        },
        {
          "name": "jobVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "job_escrow.job_id",
                "account": "jobEscrow"
              }
            ]
          }
        },
        {
          "name": "clientWallet",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "setPause",
      "discriminator": [
        63,
        32,
        154,
        2,
        56,
        103,
        79,
        45
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "settleJob",
      "discriminator": [
        246,
        155,
        221,
        34,
        168,
        70,
        173,
        72
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "jobEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "job_escrow.job_id",
                "account": "jobEscrow"
              }
            ]
          }
        },
        {
          "name": "jobVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "job_escrow.job_id",
                "account": "jobEscrow"
              }
            ]
          }
        },
        {
          "name": "providerWallet",
          "writable": true
        },
        {
          "name": "clientWallet",
          "writable": true
        },
        {
          "name": "platformTreasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "actualCostLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "slashProviderStake",
      "discriminator": [
        20,
        107,
        22,
        118,
        26,
        1,
        159,
        96
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "providerStake",
          "writable": true
        },
        {
          "name": "provider",
          "relations": [
            "providerStake"
          ]
        },
        {
          "name": "providerVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  118,
                  105,
                  100,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "provider"
              }
            ]
          }
        },
        {
          "name": "platformTreasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountLamports",
          "type": "u64"
        },
        {
          "name": "evidenceHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "evidenceUri",
          "type": "string"
        },
        {
          "name": "jobId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "topUpProviderStake",
      "discriminator": [
        15,
        87,
        46,
        162,
        208,
        27,
        36,
        159
      ],
      "accounts": [
        {
          "name": "provider",
          "writable": true,
          "signer": true,
          "relations": [
            "providerStake"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "providerStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  118,
                  105,
                  100,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "provider"
              }
            ]
          }
        },
        {
          "name": "providerVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  118,
                  105,
                  100,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "provider"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateAuthority",
      "discriminator": [
        32,
        46,
        64,
        28,
        149,
        75,
        243,
        88
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "withdrawProviderStake",
      "discriminator": [
        37,
        99,
        92,
        42,
        228,
        107,
        182,
        112
      ],
      "accounts": [
        {
          "name": "provider",
          "writable": true,
          "signer": true,
          "relations": [
            "providerStake"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "providerStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  118,
                  105,
                  100,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "provider"
              }
            ]
          }
        },
        {
          "name": "providerVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  118,
                  105,
                  100,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "provider"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountLamports",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "jobEscrow",
      "discriminator": [
        189,
        224,
        160,
        70,
        105,
        78,
        115,
        151
      ]
    },
    {
      "name": "providerStake",
      "discriminator": [
        39,
        255,
        183,
        188,
        247,
        241,
        155,
        213
      ]
    }
  ],
  "events": [
    {
      "name": "jobEscrowCreated",
      "discriminator": [
        197,
        138,
        94,
        245,
        33,
        17,
        244,
        110
      ]
    },
    {
      "name": "jobProviderAssigned",
      "discriminator": [
        73,
        113,
        109,
        209,
        64,
        84,
        153,
        151
      ]
    },
    {
      "name": "jobRefunded",
      "discriminator": [
        156,
        171,
        111,
        37,
        17,
        174,
        8,
        167
      ]
    },
    {
      "name": "jobSettled",
      "discriminator": [
        130,
        105,
        205,
        34,
        87,
        86,
        152,
        27
      ]
    },
    {
      "name": "providerSlashed",
      "discriminator": [
        2,
        171,
        201,
        137,
        189,
        61,
        50,
        27
      ]
    },
    {
      "name": "providerStakeUpdated",
      "discriminator": [
        85,
        234,
        66,
        63,
        3,
        204,
        202,
        101
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidFeeBps",
      "msg": "Invalid platform fee bps"
    },
    {
      "code": 6001,
      "name": "programPaused",
      "msg": "Program is paused"
    },
    {
      "code": 6002,
      "name": "insufficientInitialStake",
      "msg": "Initial provider stake is below minimum (2 SOL)"
    },
    {
      "code": 6003,
      "name": "invalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6004,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6005,
      "name": "insufficientStakeBalance",
      "msg": "Insufficient provider stake balance"
    },
    {
      "code": 6006,
      "name": "cannotDropBelowMinimumStake",
      "msg": "Cannot withdraw below minimum required stake"
    },
    {
      "code": 6007,
      "name": "providerMismatch",
      "msg": "Provider account does not match provider stake account"
    },
    {
      "code": 6008,
      "name": "invalidJobState",
      "msg": "Job is not in the expected state for this operation"
    },
    {
      "code": 6009,
      "name": "actualCostExceedsDeposit",
      "msg": "Actual settlement cost exceeds deposited amount"
    },
    {
      "code": 6010,
      "name": "exceedsExposureCap",
      "msg": "Job deposit exceeds max exposure cap"
    },
    {
      "code": 6011,
      "name": "providerNotAssigned",
      "msg": "Provider not yet assigned to this job"
    }
  ],
  "types": [
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "platformFeeBps",
            "type": "u16"
          },
          {
            "name": "maxJobDepositLamports",
            "type": "u64"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "jobEscrow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "jobId",
            "type": "u64"
          },
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "provider",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "depositLamports",
            "type": "u64"
          },
          {
            "name": "settledLamports",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "jobStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "completedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "jobEscrowCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "jobId",
            "type": "u64"
          },
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "depositLamports",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "jobProviderAssigned",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "jobId",
            "type": "u64"
          },
          {
            "name": "provider",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "jobRefunded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "jobId",
            "type": "u64"
          },
          {
            "name": "refundLamports",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "jobSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "jobId",
            "type": "u64"
          },
          {
            "name": "providerPaidLamports",
            "type": "u64"
          },
          {
            "name": "platformFeeLamports",
            "type": "u64"
          },
          {
            "name": "clientRefundLamports",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "jobStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "funded"
          },
          {
            "name": "completed"
          },
          {
            "name": "refunded"
          },
          {
            "name": "cancelled"
          },
          {
            "name": "assigned"
          }
        ]
      }
    },
    {
      "name": "providerSlashed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "provider",
            "type": "pubkey"
          },
          {
            "name": "amountLamports",
            "type": "u64"
          },
          {
            "name": "remainingStakeLamports",
            "type": "u64"
          },
          {
            "name": "evidenceHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "evidenceUri",
            "type": "string"
          },
          {
            "name": "jobId",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "providerStake",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "provider",
            "type": "pubkey"
          },
          {
            "name": "totalStakedLamports",
            "type": "u64"
          },
          {
            "name": "totalSlashedLamports",
            "type": "u64"
          },
          {
            "name": "lastSlashAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "providerStakeUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "provider",
            "type": "pubkey"
          },
          {
            "name": "totalStakedLamports",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
