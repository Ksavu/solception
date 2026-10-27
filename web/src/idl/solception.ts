/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solception.json`.
 */
export type Solception = {
  "address": "64vyMDCVvEUQXdNG6oiRq3K4MjKE7zpU921VWD296Q7q",
  "metadata": {
    "name": "solception",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Solception - a launchpad that launches launchpads on Solana"
  },
  "instructions": [
    {
      "name": "buy",
      "discriminator": [
        102,
        6,
        61,
        18,
        1,
        218,
        235,
        234
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "platform",
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
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "launchpad",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104,
                  112,
                  97,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "launchpad.id",
                "account": "launchpad"
              }
            ]
          },
          "relations": [
            "bondingCurve"
          ]
        },
        {
          "name": "mint",
          "relations": [
            "bondingCurve"
          ]
        },
        {
          "name": "bondingCurve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  114,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "curveVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "bondingCurve"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "maxSolCost",
          "type": "u64"
        },
        {
          "name": "minTokensOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claimFees",
      "discriminator": [
        82,
        251,
        233,
        156,
        12,
        52,
        184,
        202
      ],
      "accounts": [
        {
          "name": "platform",
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
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "launchpad",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104,
                  112,
                  97,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "launchpad.id",
                "account": "launchpad"
              }
            ]
          },
          "relations": [
            "bondingCurve"
          ]
        },
        {
          "name": "bondingCurve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  114,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "bonding_curve.mint",
                "account": "bondingCurve"
              }
            ]
          }
        },
        {
          "name": "recipient",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "bucket",
          "type": {
            "defined": {
              "name": "feeBucket"
            }
          }
        }
      ]
    },
    {
      "name": "createLaunchpad",
      "discriminator": [
        193,
        189,
        26,
        187,
        44,
        137,
        43,
        190
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "platform",
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
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "launchpad",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104,
                  112,
                  97,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "platform.launchpad_count",
                "account": "platform"
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
          "name": "params",
          "type": {
            "defined": {
              "name": "createLaunchpadParams"
            }
          }
        }
      ]
    },
    {
      "name": "initializePlatform",
      "discriminator": [
        119,
        201,
        101,
        45,
        75,
        122,
        89,
        3
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Must be the program's upgrade authority, so nobody can front-run init."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "platform",
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
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "program",
          "address": "64vyMDCVvEUQXdNG6oiRq3K4MjKE7zpU921VWD296Q7q"
        },
        {
          "name": "programData"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "initializePlatformParams"
            }
          }
        }
      ]
    },
    {
      "name": "launchToken",
      "discriminator": [
        10,
        128,
        86,
        171,
        3,
        137,
        161,
        244
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "platform",
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
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "launchpad",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104,
                  112,
                  97,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "launchpad.id",
                "account": "launchpad"
              }
            ]
          }
        },
        {
          "name": "mint",
          "docs": [
            "Fresh keypair from the client (lets you grind vanity \"...pad\" addresses)."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "bondingCurve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  114,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "curveVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "bondingCurve"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "metadata",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "tokenMetadataProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "account",
              "path": "tokenMetadataProgram"
            }
          }
        },
        {
          "name": "tokenMetadataProgram"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "launchTokenParams"
            }
          }
        }
      ]
    },
    {
      "name": "sell",
      "discriminator": [
        51,
        230,
        133,
        164,
        1,
        127,
        131,
        173
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "platform",
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
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "launchpad",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104,
                  112,
                  97,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "launchpad.id",
                "account": "launchpad"
              }
            ]
          },
          "relations": [
            "bondingCurve"
          ]
        },
        {
          "name": "mint",
          "relations": [
            "bondingCurve"
          ]
        },
        {
          "name": "bondingCurve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  114,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "curveVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "bondingCurve"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tokenAmount",
          "type": "u64"
        },
        {
          "name": "minSolOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateLaunchpad",
      "discriminator": [
        73,
        253,
        42,
        252,
        2,
        113,
        239,
        192
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "launchpad"
          ]
        },
        {
          "name": "platform",
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
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "launchpad",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104,
                  112,
                  97,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "launchpad.id",
                "account": "launchpad"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "updateLaunchpadParams"
            }
          }
        }
      ]
    },
    {
      "name": "updatePlatform",
      "discriminator": [
        46,
        78,
        138,
        189,
        47,
        163,
        120,
        85
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "platform"
          ]
        },
        {
          "name": "platform",
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
                  109
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "updatePlatformParams"
            }
          }
        }
      ]
    },
    {
      "name": "withdrawForMigration",
      "discriminator": [
        229,
        30,
        82,
        104,
        62,
        251,
        75,
        69
      ],
      "accounts": [
        {
          "name": "migrationAuthority",
          "writable": true,
          "signer": true,
          "relations": [
            "platform"
          ]
        },
        {
          "name": "platform",
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
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "mint",
          "relations": [
            "bondingCurve"
          ]
        },
        {
          "name": "bondingCurve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  114,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "curveVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "bondingCurve"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "migrationTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "migrationAuthority"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "bondingCurve",
      "discriminator": [
        23,
        183,
        248,
        55,
        96,
        216,
        172,
        96
      ]
    },
    {
      "name": "launchpad",
      "discriminator": [
        247,
        20,
        16,
        242,
        203,
        38,
        169,
        160
      ]
    },
    {
      "name": "platform",
      "discriminator": [
        77,
        92,
        204,
        58,
        187,
        98,
        91,
        12
      ]
    }
  ],
  "events": [
    {
      "name": "curveCompleted",
      "discriminator": [
        1,
        174,
        164,
        127,
        219,
        129,
        243,
        14
      ]
    },
    {
      "name": "feesClaimed",
      "discriminator": [
        22,
        104,
        110,
        222,
        38,
        157,
        14,
        62
      ]
    },
    {
      "name": "launchpadCreated",
      "discriminator": [
        106,
        35,
        175,
        174,
        239,
        105,
        208,
        84
      ]
    },
    {
      "name": "launchpadUpdated",
      "discriminator": [
        191,
        38,
        85,
        105,
        93,
        177,
        138,
        227
      ]
    },
    {
      "name": "liquidityWithdrawnForMigration",
      "discriminator": [
        239,
        204,
        23,
        231,
        104,
        193,
        233,
        17
      ]
    },
    {
      "name": "platformInitialized",
      "discriminator": [
        16,
        222,
        212,
        5,
        213,
        140,
        112,
        162
      ]
    },
    {
      "name": "tokenLaunched",
      "discriminator": [
        225,
        232,
        190,
        147,
        213,
        192,
        220,
        168
      ]
    },
    {
      "name": "trade",
      "discriminator": [
        24,
        254,
        218,
        152,
        253,
        43,
        18,
        81
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Signer is not authorized for this action"
    },
    {
      "code": 6001,
      "name": "platformPaused",
      "msg": "Platform is paused"
    },
    {
      "code": 6002,
      "name": "launchpadPaused",
      "msg": "Launchpad is paused"
    },
    {
      "code": 6003,
      "name": "invalidBps",
      "msg": "Basis points value out of range"
    },
    {
      "code": 6004,
      "name": "tradeFeeTooHigh",
      "msg": "Trade fee exceeds the platform maximum"
    },
    {
      "code": 6005,
      "name": "invalidCurveConfig",
      "msg": "Invalid curve configuration"
    },
    {
      "code": 6006,
      "name": "stringTooLong",
      "msg": "Name or URI too long"
    },
    {
      "code": 6007,
      "name": "emptyName",
      "msg": "Name must not be empty"
    },
    {
      "code": 6008,
      "name": "zeroAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6009,
      "name": "slippageExceeded",
      "msg": "Slippage limit exceeded"
    },
    {
      "code": 6010,
      "name": "curveComplete",
      "msg": "Bonding curve has completed; trade on the DEX"
    },
    {
      "code": 6011,
      "name": "curveNotComplete",
      "msg": "Bonding curve has not completed yet"
    },
    {
      "code": 6012,
      "name": "alreadyMigrated",
      "msg": "Liquidity already migrated"
    },
    {
      "code": 6013,
      "name": "insufficientSolReserves",
      "msg": "Not enough SOL in the curve"
    },
    {
      "code": 6014,
      "name": "nothingToClaim",
      "msg": "Nothing to claim"
    },
    {
      "code": 6015,
      "name": "wrongFeeRecipient",
      "msg": "Recipient does not match the fee bucket"
    },
    {
      "code": 6016,
      "name": "mathOverflow",
      "msg": "Math overflow"
    }
  ],
  "types": [
    {
      "name": "bondingCurve",
      "docs": [
        "Layer 2 — a token's bonding curve. Holds the raised SOL and accrued fees."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "launchpad",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "virtualSolReserves",
            "type": "u64"
          },
          {
            "name": "virtualTokenReserves",
            "type": "u64"
          },
          {
            "name": "realSolReserves",
            "type": "u64"
          },
          {
            "name": "realTokenReserves",
            "type": "u64"
          },
          {
            "name": "lpTokenReserve",
            "type": "u64"
          },
          {
            "name": "tokenTotalSupply",
            "type": "u64"
          },
          {
            "name": "platformFeesAccrued",
            "docs": [
              "Fees are accrued here per trade (no global write-lock), then claimed."
            ],
            "type": "u64"
          },
          {
            "name": "launchpadFeesAccrued",
            "type": "u64"
          },
          {
            "name": "creatorFeesAccrued",
            "type": "u64"
          },
          {
            "name": "complete",
            "type": "bool"
          },
          {
            "name": "migrated",
            "type": "bool"
          },
          {
            "name": "createdAt",
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
      "name": "createLaunchpadParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "feeRecipient",
            "type": "pubkey"
          },
          {
            "name": "tradeFeeBps",
            "type": "u16"
          },
          {
            "name": "creatorFeeShareBps",
            "type": "u16"
          },
          {
            "name": "tokenLaunchFee",
            "type": "u64"
          },
          {
            "name": "curve",
            "type": {
              "defined": {
                "name": "curveConfig"
              }
            }
          }
        ]
      }
    },
    {
      "name": "curveCompleted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "launchpad",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "realSolReserves",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "curveConfig",
      "docs": [
        "Curve economics a launchpad applies to every token it launches."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "initialVirtualSol",
            "docs": [
              "Starting virtual SOL reserve (lamports)."
            ],
            "type": "u64"
          },
          {
            "name": "initialVirtualTokens",
            "docs": [
              "Starting virtual token reserve (base units)."
            ],
            "type": "u64"
          },
          {
            "name": "curveTokenSupply",
            "docs": [
              "Tokens sold through the curve. Curve completes when all are sold."
            ],
            "type": "u64"
          },
          {
            "name": "lpTokenReserve",
            "docs": [
              "Tokens held back to pair with raised SOL on the DEX after graduation."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "feeBucket",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "platform"
          },
          {
            "name": "launchpad"
          },
          {
            "name": "creator"
          }
        ]
      }
    },
    {
      "name": "feesClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "bucket",
            "type": {
              "defined": {
                "name": "feeBucket"
              }
            }
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "initializePlatformParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "migrationAuthority",
            "type": "pubkey"
          },
          {
            "name": "launchpadCreationFee",
            "type": "u64"
          },
          {
            "name": "platformFeeShareBps",
            "type": "u16"
          },
          {
            "name": "maxTradeFeeBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "launchTokenParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "docs": [
              "Metaplex JSON (image, description, socials)."
            ],
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "launchpad",
      "docs": [
        "Layer 1 — a launchpad created through Solception."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "feeRecipient",
            "docs": [
              "Where the launchpad's share of fees is claimed to."
            ],
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "docs": [
              "Off-chain branding JSON (logo, colors, domain, socials)."
            ],
            "type": "string"
          },
          {
            "name": "tradeFeeBps",
            "docs": [
              "Total fee on each buy/sell."
            ],
            "type": "u16"
          },
          {
            "name": "creatorFeeShareBps",
            "docs": [
              "Share of the post-platform fee that goes to the token creator."
            ],
            "type": "u16"
          },
          {
            "name": "tokenLaunchFee",
            "docs": [
              "Lamports charged to launch a token on this pad."
            ],
            "type": "u64"
          },
          {
            "name": "curve",
            "type": {
              "defined": {
                "name": "curveConfig"
              }
            }
          },
          {
            "name": "tokenCount",
            "type": "u64"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "createdAt",
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
      "name": "launchpadCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "launchpad",
            "type": "pubkey"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "tradeFeeBps",
            "type": "u16"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "launchpadUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "launchpad",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "liquidityWithdrawnForMigration",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "launchpad",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "solAmount",
            "type": "u64"
          },
          {
            "name": "tokenAmount",
            "type": "u64"
          },
          {
            "name": "migrationAuthority",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "platform",
      "docs": [
        "Layer 0 — the Solception platform itself (singleton)."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "docs": [
              "Receives launchpad creation fees and claimed platform trade/launch fees."
            ],
            "type": "pubkey"
          },
          {
            "name": "migrationAuthority",
            "docs": [
              "Wallet allowed to pull graduated liquidity to seed the DEX pool."
            ],
            "type": "pubkey"
          },
          {
            "name": "launchpadCreationFee",
            "docs": [
              "Lamports paid to the treasury to create a launchpad."
            ],
            "type": "u64"
          },
          {
            "name": "platformFeeShareBps",
            "docs": [
              "Platform's cut of every fee generated by every launchpad."
            ],
            "type": "u16"
          },
          {
            "name": "maxTradeFeeBps",
            "docs": [
              "Max trade fee a launchpad may charge."
            ],
            "type": "u16"
          },
          {
            "name": "launchpadCount",
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
      "name": "platformInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "tokenLaunched",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "launchpad",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "bondingCurve",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "virtualSolReserves",
            "type": "u64"
          },
          {
            "name": "virtualTokenReserves",
            "type": "u64"
          },
          {
            "name": "totalSupply",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "trade",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "launchpad",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "isBuy",
            "type": "bool"
          },
          {
            "name": "solAmount",
            "docs": [
              "Net SOL that moved in/out of the curve reserves (excl. fee)."
            ],
            "type": "u64"
          },
          {
            "name": "tokenAmount",
            "type": "u64"
          },
          {
            "name": "fee",
            "type": "u64"
          },
          {
            "name": "virtualSolReserves",
            "type": "u64"
          },
          {
            "name": "virtualTokenReserves",
            "type": "u64"
          },
          {
            "name": "realSolReserves",
            "type": "u64"
          },
          {
            "name": "realTokenReserves",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "updateLaunchpadParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newOwner",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "feeRecipient",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "uri",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "tradeFeeBps",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "creatorFeeShareBps",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "tokenLaunchFee",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "curve",
            "docs": [
              "Applies to tokens launched after the update only."
            ],
            "type": {
              "option": {
                "defined": {
                  "name": "curveConfig"
                }
              }
            }
          },
          {
            "name": "paused",
            "type": {
              "option": "bool"
            }
          }
        ]
      }
    },
    {
      "name": "updatePlatformParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newAuthority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "treasury",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "migrationAuthority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "launchpadCreationFee",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "platformFeeShareBps",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "maxTradeFeeBps",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "paused",
            "type": {
              "option": "bool"
            }
          }
        ]
      }
    }
  ]
};
