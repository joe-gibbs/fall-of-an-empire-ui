import type { GetPaganWorshipResponse } from '../bridge-types.generated';

// Development fixtures. Production worship always comes from the game bridge.
export const paganPreviewFixtures: Record<string, GetPaganWorshipResponse> = {
  "blodskurr": {
    "subscriptionId": "",
    "religionId": "blodskurr",
    "canManage": true,
    "dedicated": false,
    "capitalId": "mock-settlement-capital",
    "capitalName": "Hariwald",
    "capitalOwnerId": "mock-faction-player",
    "capitalOwnerName": "Player realm",
    "hallState": "Hall standing",
    "currentDay": 0,
    "nextFestivalDay": 28,
    "activeGodKey": "",
    "riteStartDay": 0,
    "riteEndDay": 0,
    "activeRiteTarget": "",
    "paidGold": 0,
    "paidPopulation": 0,
    "gods": [
      {
        "key": "Blodskurr_Blothgrim",
        "name": "Blothgrim",
        "description": "Scarred war god of Blodskurr. He carries a broad iron axe and a round shield.",
        "parentKey": "",
        "isMajor": true,
        "foregroundPath": "/assets/pagan/gods/Blodskurr_Blothgrim.png",
        "backgroundPath": "/assets/pagan/backgrounds/Blodskurr.png",
        "dedicated": false,
        "canDedicate": true,
        "dedicationReason": "",
        "bonus": [
          {
            "label": "Host morale",
            "amount": 0.06,
            "isPercent": true
          }
        ],
        "penalty": [
          {
            "label": "Settlement unrest",
            "amount": 0.025,
            "isPercent": true
          }
        ],
        "rite": {
          "name": "Offering from the Raid",
          "description": "Take 40 extra people from the settlement your host is raiding and sacrifice them to Blothgrim. The offering strengthens host morale. The killings also increase unrest for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 0,
          "populationCost": 0,
          "raidCaptives": 40,
          "durationDays": 3,
          "cooldownDays": 168,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": false,
          "sacrificesCharacter": false,
          "needsSettlement": false,
          "needsRaidingHost": true,
          "festivalDue": false,
          "effects": [
            {
              "label": "Host morale",
              "amount": 0.08,
              "isPercent": true
            },
            {
              "label": "Settlement unrest",
              "amount": 0.02,
              "isPercent": true
            }
          ]
        }
      },
      {
        "key": "Blodskurr_Skaldhari",
        "name": "Skaldhari",
        "description": "Elder singer of Blodskurr. He holds a bone drinking horn and a small lyre.",
        "parentKey": "",
        "isMajor": true,
        "foregroundPath": "/assets/pagan/gods/Blodskurr_Skaldhari.png",
        "backgroundPath": "/assets/pagan/backgrounds/Blodskurr.png",
        "dedicated": false,
        "canDedicate": true,
        "dedicationReason": "",
        "bonus": [
          {
            "label": "Cunning",
            "amount": 1,
            "isPercent": false
          }
        ],
        "penalty": [
          {
            "label": "Tax income",
            "amount": -0.04,
            "isPercent": true
          }
        ],
        "rite": {
          "name": "War Hall Song",
          "description": "Pay the singers at Hariwald to recount campaigns before Skaldhari. Studying these accounts improves cunning for a time. Time away from work reduces tax income for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 100,
          "populationCost": 0,
          "raidCaptives": 0,
          "durationDays": 14,
          "cooldownDays": 168,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": false,
          "sacrificesCharacter": false,
          "needsSettlement": false,
          "needsRaidingHost": false,
          "festivalDue": false,
          "effects": [
            {
              "label": "Cunning",
              "amount": 1,
              "isPercent": false
            },
            {
              "label": "Tax income",
              "amount": -0.02,
              "isPercent": true
            }
          ]
        }
      },
      {
        "key": "Blodskurr_Rauthkoning",
        "name": "Rauthkoning",
        "description": "War king of Blodskurr. He carries a red battle standard.",
        "parentKey": "",
        "isMajor": true,
        "foregroundPath": "/assets/pagan/gods/Blodskurr_Rauthkoning.png",
        "backgroundPath": "/assets/pagan/backgrounds/Blodskurr.png",
        "dedicated": false,
        "canDedicate": true,
        "dedicationReason": "",
        "bonus": [
          {
            "label": "Raid yield",
            "amount": 0.08,
            "isPercent": true
          }
        ],
        "penalty": [
          {
            "label": "Opinion",
            "amount": -4,
            "isPercent": false
          }
        ],
        "rite": {
          "name": "Offering at Hariwald",
          "description": "Sacrifice 35 of your own people at Hariwald to Rauthkoning. The rite encourages raiders to gather more plunder. The killings also increase unrest for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 0,
          "populationCost": 35,
          "raidCaptives": 0,
          "durationDays": 7,
          "cooldownDays": 168,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": false,
          "sacrificesCharacter": false,
          "needsSettlement": true,
          "needsRaidingHost": false,
          "festivalDue": false,
          "effects": [
            {
              "label": "Raid yield",
              "amount": 0.12,
              "isPercent": true
            },
            {
              "label": "Settlement unrest",
              "amount": 0.02,
              "isPercent": true
            }
          ]
        }
      },
      {
        "key": "Blodskurr_Isarnfaust",
        "name": "Isarnfaust",
        "description": "Broad-shouldered war god of Blodskurr. He carries a heavy iron hammer and an oval wooden shield.",
        "parentKey": "",
        "isMajor": true,
        "foregroundPath": "/assets/pagan/gods/Blodskurr_Isarnfaust.png",
        "backgroundPath": "/assets/pagan/backgrounds/Blodskurr.png",
        "dedicated": false,
        "canDedicate": false,
        "dedicationReason": "The required relic is held in another realm.",
        "bonus": [
          {
            "label": "Tactics",
            "amount": 1,
            "isPercent": false
          }
        ],
        "penalty": [
          {
            "label": "Recruitment speed",
            "amount": -0.06,
            "isPercent": true
          }
        ],
        "rite": {
          "name": "Iron Crown Sacrifice",
          "description": "Name a free adult man for sacrifice to Isarnfaust in the standing hall at Hariwald. He dies when the rite finishes; the host gains tactics for a time. The sacrifice worsens relations with followers of other faiths for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 120,
          "populationCost": 0,
          "raidCaptives": 0,
          "durationDays": 28,
          "cooldownDays": 672,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": true,
          "sacrificesCharacter": true,
          "needsSettlement": false,
          "needsRaidingHost": false,
          "festivalDue": false,
          "effects": [
            {
              "label": "Tactics",
              "amount": 2,
              "isPercent": false
            },
            {
              "label": "Opinion",
              "amount": -5,
              "isPercent": false
            }
          ]
        }
      },
      {
        "key": "Blodskurr_Blothmena",
        "name": "Blothmena",
        "description": "Offering-bearer under Blothgrim. She wears a dark red cloak and carries a bowl.",
        "parentKey": "Blodskurr_Blothgrim",
        "isMajor": false,
        "foregroundPath": "/assets/pagan/gods/Blodskurr_Blothmena.png",
        "backgroundPath": "/assets/pagan/backgrounds/Blodskurr.png",
        "dedicated": false,
        "canDedicate": false,
        "dedicationReason": "The required relic is held in another realm.",
        "bonus": [
          {
            "label": "Host morale",
            "amount": 0.03,
            "isPercent": true
          }
        ],
        "penalty": [
          {
            "label": "Settlement unrest",
            "amount": 0.0125,
            "isPercent": true
          }
        ],
        "rite": {
          "name": "Offering from the Raid",
          "description": "Take 20 extra people from the settlement your host is raiding and sacrifice them to Blothmena. The offering strengthens host morale. The killings also increase unrest for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 0,
          "populationCost": 0,
          "raidCaptives": 20,
          "durationDays": 3,
          "cooldownDays": 168,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": false,
          "sacrificesCharacter": false,
          "needsSettlement": false,
          "needsRaidingHost": true,
          "festivalDue": false,
          "effects": [
            {
              "label": "Host morale",
              "amount": 0.04,
              "isPercent": true
            },
            {
              "label": "Settlement unrest",
              "amount": 0.01,
              "isPercent": true
            }
          ]
        }
      },
      {
        "key": "Blodskurr_Kampgaist",
        "name": "Kampgaist",
        "description": "Young warrior under Blothgrim. He beats a battered shield.",
        "parentKey": "Blodskurr_Blothgrim",
        "isMajor": false,
        "foregroundPath": "/assets/pagan/gods/Blodskurr_Kampgaist.png",
        "backgroundPath": "/assets/pagan/backgrounds/Blodskurr.png",
        "dedicated": false,
        "canDedicate": false,
        "dedicationReason": "The required relic is held in another realm.",
        "bonus": [
          {
            "label": "Host morale",
            "amount": 0.03,
            "isPercent": true
          }
        ],
        "penalty": [
          {
            "label": "Settlement unrest",
            "amount": 0.0125,
            "isPercent": true
          }
        ],
        "rite": {
          "name": "Offering from the Raid",
          "description": "Take 20 extra people from the settlement your host is raiding and sacrifice them to Kampgaist. The offering strengthens host morale. The killings also increase unrest for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 0,
          "populationCost": 0,
          "raidCaptives": 20,
          "durationDays": 3,
          "cooldownDays": 168,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": false,
          "sacrificesCharacter": false,
          "needsSettlement": false,
          "needsRaidingHost": true,
          "festivalDue": false,
          "effects": [
            {
              "label": "Host morale",
              "amount": 0.04,
              "isPercent": true
            },
            {
              "label": "Settlement unrest",
              "amount": 0.01,
              "isPercent": true
            }
          ]
        }
      },
      {
        "key": "Blodskurr_Sahsadans",
        "name": "Sahsadans",
        "description": "Sword dancer under Skaldhari. She holds a short blade low.",
        "parentKey": "Blodskurr_Skaldhari",
        "isMajor": false,
        "foregroundPath": "/assets/pagan/gods/Blodskurr_Sahsadans.png",
        "backgroundPath": "/assets/pagan/backgrounds/Blodskurr.png",
        "dedicated": false,
        "canDedicate": false,
        "dedicationReason": "The required relic is held in another realm.",
        "bonus": [
          {
            "label": "Cunning",
            "amount": 0.5,
            "isPercent": false
          }
        ],
        "penalty": [
          {
            "label": "Tax income",
            "amount": -0.02,
            "isPercent": true
          }
        ],
        "rite": {
          "name": "War Hall Song",
          "description": "Pay the singers at Hariwald to recount campaigns before Sahsadans. Studying these accounts improves cunning for a time. Time away from work reduces tax income for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 60,
          "populationCost": 0,
          "raidCaptives": 0,
          "durationDays": 14,
          "cooldownDays": 168,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": false,
          "sacrificesCharacter": false,
          "needsSettlement": false,
          "needsRaidingHost": false,
          "festivalDue": false,
          "effects": [
            {
              "label": "Cunning",
              "amount": 0.5,
              "isPercent": false
            },
            {
              "label": "Tax income",
              "amount": -0.01,
              "isPercent": true
            }
          ]
        }
      },
      {
        "key": "Blodskurr_Sahlokij",
        "name": "Sahlokij",
        "description": "Hooded adviser under Skaldhari. He carries carved wooden counters.",
        "parentKey": "Blodskurr_Skaldhari",
        "isMajor": false,
        "foregroundPath": "/assets/pagan/gods/Blodskurr_Sahlokij.png",
        "backgroundPath": "/assets/pagan/backgrounds/Blodskurr.png",
        "dedicated": false,
        "canDedicate": false,
        "dedicationReason": "The required relic is held in another realm.",
        "bonus": [
          {
            "label": "Cunning",
            "amount": 0.5,
            "isPercent": false
          }
        ],
        "penalty": [
          {
            "label": "Tax income",
            "amount": -0.02,
            "isPercent": true
          }
        ],
        "rite": {
          "name": "War Hall Song",
          "description": "Pay the singers at Hariwald to recount campaigns before Sahlokij. Studying these accounts improves cunning for a time. Time away from work reduces tax income for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 60,
          "populationCost": 0,
          "raidCaptives": 0,
          "durationDays": 14,
          "cooldownDays": 168,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": false,
          "sacrificesCharacter": false,
          "needsSettlement": false,
          "needsRaidingHost": false,
          "festivalDue": false,
          "effects": [
            {
              "label": "Cunning",
              "amount": 0.5,
              "isPercent": false
            },
            {
              "label": "Tax income",
              "amount": -0.01,
              "isPercent": true
            }
          ]
        }
      },
      {
        "key": "Blodskurr_Wighari",
        "name": "Wighari",
        "description": "Host captain under Rauthkoning. He is grey-haired and carries a plain spear.",
        "parentKey": "Blodskurr_Rauthkoning",
        "isMajor": false,
        "foregroundPath": "/assets/pagan/gods/Blodskurr_Wighari.png",
        "backgroundPath": "/assets/pagan/backgrounds/Blodskurr.png",
        "dedicated": false,
        "canDedicate": false,
        "dedicationReason": "The required relic is held in another realm.",
        "bonus": [
          {
            "label": "Raid yield",
            "amount": 0.04,
            "isPercent": true
          }
        ],
        "penalty": [
          {
            "label": "Opinion",
            "amount": -2.0,
            "isPercent": false
          }
        ],
        "rite": {
          "name": "Offering at Hariwald",
          "description": "Sacrifice 20 of your own people at Hariwald to Wighari. The rite encourages raiders to gather more plunder. The killings also increase unrest for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 0,
          "populationCost": 20,
          "raidCaptives": 0,
          "durationDays": 7,
          "cooldownDays": 168,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": false,
          "sacrificesCharacter": false,
          "needsSettlement": true,
          "needsRaidingHost": false,
          "festivalDue": false,
          "effects": [
            {
              "label": "Raid yield",
              "amount": 0.06,
              "isPercent": true
            },
            {
              "label": "Settlement unrest",
              "amount": 0.01,
              "isPercent": true
            }
          ]
        }
      },
      {
        "key": "Blodskurr_Wrakjand",
        "name": "Wrakjand",
        "description": "Avenger under Rauthkoning. He holds a notched sword.",
        "parentKey": "Blodskurr_Rauthkoning",
        "isMajor": false,
        "foregroundPath": "/assets/pagan/gods/Blodskurr_Wrakjand.png",
        "backgroundPath": "/assets/pagan/backgrounds/Blodskurr.png",
        "dedicated": false,
        "canDedicate": false,
        "dedicationReason": "The required relic is held in another realm.",
        "bonus": [
          {
            "label": "Raid yield",
            "amount": 0.04,
            "isPercent": true
          }
        ],
        "penalty": [
          {
            "label": "Opinion",
            "amount": -2.0,
            "isPercent": false
          }
        ],
        "rite": {
          "name": "Offering at Hariwald",
          "description": "Sacrifice 20 of your own people at Hariwald to Wrakjand. The rite encourages raiders to gather more plunder. The killings also increase unrest for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 0,
          "populationCost": 20,
          "raidCaptives": 0,
          "durationDays": 7,
          "cooldownDays": 168,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": false,
          "sacrificesCharacter": false,
          "needsSettlement": true,
          "needsRaidingHost": false,
          "festivalDue": false,
          "effects": [
            {
              "label": "Raid yield",
              "amount": 0.06,
              "isPercent": true
            },
            {
              "label": "Settlement unrest",
              "amount": 0.01,
              "isPercent": true
            }
          ]
        }
      },
      {
        "key": "Blodskurr_Wundohail",
        "name": "Wundohail",
        "description": "Wounded veteran under Isarnfaust. He binds an arm with linen.",
        "parentKey": "Blodskurr_Isarnfaust",
        "isMajor": false,
        "foregroundPath": "/assets/pagan/gods/Blodskurr_Wundohail.png",
        "backgroundPath": "/assets/pagan/backgrounds/Blodskurr.png",
        "dedicated": false,
        "canDedicate": false,
        "dedicationReason": "The required relic is held in another realm.",
        "bonus": [
          {
            "label": "Tactics",
            "amount": 0.5,
            "isPercent": false
          }
        ],
        "penalty": [
          {
            "label": "Recruitment speed",
            "amount": -0.03,
            "isPercent": true
          }
        ],
        "rite": {
          "name": "Warrior Muster",
          "description": "Pay for a muster at Hariwald in honour of Wundohail. Shared drills improve tactics for a time. Time away from work reduces tax income for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 60,
          "populationCost": 0,
          "raidCaptives": 0,
          "durationDays": 14,
          "cooldownDays": 168,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": false,
          "sacrificesCharacter": false,
          "needsSettlement": false,
          "needsRaidingHost": false,
          "festivalDue": false,
          "effects": [
            {
              "label": "Tactics",
              "amount": 0.5,
              "isPercent": false
            },
            {
              "label": "Tax income",
              "amount": -0.01,
              "isPercent": true
            }
          ]
        }
      },
      {
        "key": "Blodskurr_Skildubrek",
        "name": "Skildubrek",
        "description": "Shield breaker under Isarnfaust. He holds a split wooden shield.",
        "parentKey": "Blodskurr_Isarnfaust",
        "isMajor": false,
        "foregroundPath": "/assets/pagan/gods/Blodskurr_Skildubrek.png",
        "backgroundPath": "/assets/pagan/backgrounds/Blodskurr.png",
        "dedicated": false,
        "canDedicate": false,
        "dedicationReason": "The required relic is held in another realm.",
        "bonus": [
          {
            "label": "Tactics",
            "amount": 0.5,
            "isPercent": false
          }
        ],
        "penalty": [
          {
            "label": "Recruitment speed",
            "amount": -0.03,
            "isPercent": true
          }
        ],
        "rite": {
          "name": "Warrior Muster",
          "description": "Pay for a muster at Hariwald in honour of Skildubrek. Shared drills improve tactics for a time. Time away from work reduces tax income for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 60,
          "populationCost": 0,
          "raidCaptives": 0,
          "durationDays": 14,
          "cooldownDays": 168,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": false,
          "sacrificesCharacter": false,
          "needsSettlement": false,
          "needsRaidingHost": false,
          "festivalDue": false,
          "effects": [
            {
              "label": "Tactics",
              "amount": 0.5,
              "isPercent": false
            },
            {
              "label": "Tax income",
              "amount": -0.01,
              "isPercent": true
            }
          ]
        }
      }
    ],
    "relics": [
      {
        "key": "Blodskurr_RauthaStridaksoofBlothgrim",
        "name": "Rautha Stridakso of Blothgrim",
        "description": "The relic of Blothgrim. Its settlement must belong to your realm before you can dedicate to this god.",
        "iconPath": "/assets/pagan/relics/Blodskurr_RauthaStridaksoofBlothgrim.png",
        "godName": "Blothgrim",
        "religionId": "blodskurr",
        "religionName": "Blodskurr",
        "settlementId": "mock-settlement-capital",
        "settlementName": "Hariwald",
        "ownerId": "mock-faction-player",
        "ownerName": "Player realm"
      },
      {
        "key": "Blodskurr_BainhornDrinkanan",
        "name": "Bainhorn Drinkanan",
        "description": "The relic of Skaldhari. Its settlement must belong to your realm before you can dedicate to this god.",
        "iconPath": "/assets/pagan/relics/Blodskurr_BainhornDrinkanan.png",
        "godName": "Skaldhari",
        "religionId": "blodskurr",
        "religionName": "Blodskurr",
        "settlementId": "mock-settlement-port",
        "settlementName": "Rephsis",
        "ownerId": "mock-faction-rival",
        "ownerName": "Neighbouring realm"
      },
      {
        "key": "Blodskurr_BlothdrunkaKampomerk",
        "name": "Blothdrunka Kampomerk",
        "description": "The relic of Rauthkoning. Its settlement must belong to your realm before you can dedicate to this god.",
        "iconPath": "/assets/pagan/relics/Blodskurr_BlothdrunkaKampomerk.png",
        "godName": "Rauthkoning",
        "religionId": "blodskurr",
        "religionName": "Blodskurr",
        "settlementId": "mock-settlement-port",
        "settlementName": "Rephsis",
        "ownerId": "mock-faction-rival",
        "ownerName": "Neighbouring realm"
      },
      {
        "key": "Blodskurr_IsarnkrunaofSkulls",
        "name": "Isarnkruna of Skulls",
        "description": "The relic of Isarnfaust. Its settlement must belong to your realm before you can dedicate to this god.",
        "iconPath": "/assets/pagan/relics/Blodskurr_IsarnkrunaofSkulls.png",
        "godName": "Isarnfaust",
        "religionId": "blodskurr",
        "religionName": "Blodskurr",
        "settlementId": "mock-settlement-port",
        "settlementName": "Rephsis",
        "ownerId": "mock-faction-rival",
        "ownerName": "Neighbouring realm"
      }
    ],
    "followerPlaces": [
      {
        "settlementId": "mock-settlement-capital",
        "name": "Hariwald",
        "followers": 292000
      }
    ],
    "timedEffects": []
  },
  "rephsianpantheon": {
    "subscriptionId": "",
    "religionId": "rephsianpantheon",
    "canManage": true,
    "dedicated": false,
    "capitalId": "mock-settlement-capital",
    "capitalName": "Rephsis",
    "capitalOwnerId": "mock-faction-player",
    "capitalOwnerName": "Player realm",
    "hallState": "Hall standing",
    "currentDay": 0,
    "nextFestivalDay": 28,
    "activeGodKey": "",
    "riteStartDay": 0,
    "riteEndDay": 0,
    "activeRiteTarget": "",
    "paidGold": 0,
    "paidPopulation": 0,
    "gods": [
      {
        "key": "RephsianPantheon_Celsor",
        "name": "Celsor",
        "description": "Civic sky father of the Rephsian pantheon. He wears a laurel wreath and carries an ivory sceptre and an eagle standard.",
        "parentKey": "",
        "isMajor": true,
        "foregroundPath": "/assets/pagan/gods/RephsianPantheon_Celsor.png",
        "backgroundPath": "/assets/pagan/backgrounds/RephsianPantheon.png",
        "dedicated": false,
        "canDedicate": true,
        "dedicationReason": "",
        "bonus": [
          {
            "label": "Settlement unrest",
            "amount": -0.02,
            "isPercent": true
          }
        ],
        "penalty": [
          {
            "label": "Conversion resistance",
            "amount": -0.08,
            "isPercent": true
          }
        ],
        "rite": {
          "name": "Civic Games",
          "description": "Pay for games at Rephsis in honour of Celsor. The celebration reduces unrest. No people are sacrificed. Time away from work reduces tax income for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 140,
          "populationCost": 0,
          "raidCaptives": 0,
          "durationDays": 14,
          "cooldownDays": 168,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": false,
          "sacrificesCharacter": false,
          "needsSettlement": false,
          "needsRaidingHost": false,
          "festivalDue": false,
          "effects": [
            {
              "label": "Settlement unrest",
              "amount": -0.015,
              "isPercent": true
            },
            {
              "label": "Tax income",
              "amount": -0.02,
              "isPercent": true
            }
          ]
        }
      },
      {
        "key": "RephsianPantheon_Materia",
        "name": "Materia",
        "description": "Earth mother of the Rephsian pantheon. She wears an ochre stola and holds a cornucopia.",
        "parentKey": "",
        "isMajor": true,
        "foregroundPath": "/assets/pagan/gods/RephsianPantheon_Materia.png",
        "backgroundPath": "/assets/pagan/backgrounds/RephsianPantheon.png",
        "dedicated": false,
        "canDedicate": true,
        "dedicationReason": "",
        "bonus": [
          {
            "label": "Conversion resistance",
            "amount": 0.08,
            "isPercent": true
          }
        ],
        "penalty": [
          {
            "label": "Settlement unrest",
            "amount": 0.015,
            "isPercent": true
          }
        ],
        "rite": {
          "name": "Public Granary Feast",
          "description": "Pay for a public meal at Rephsis in honour of Materia. The celebration reduces unrest. No people are sacrificed. Time away from work reduces tax income for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 140,
          "populationCost": 0,
          "raidCaptives": 0,
          "durationDays": 14,
          "cooldownDays": 168,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": false,
          "sacrificesCharacter": false,
          "needsSettlement": false,
          "needsRaidingHost": false,
          "festivalDue": false,
          "effects": [
            {
              "label": "Settlement unrest",
              "amount": -0.015,
              "isPercent": true
            },
            {
              "label": "Tax income",
              "amount": -0.02,
              "isPercent": true
            }
          ]
        }
      },
      {
        "key": "RephsianPantheon_Sapientia",
        "name": "Sapientia",
        "description": "Scholar goddess under Celsor. She carries a wax tablet and a stylus.",
        "parentKey": "RephsianPantheon_Celsor",
        "isMajor": false,
        "foregroundPath": "/assets/pagan/gods/RephsianPantheon_Sapientia.png",
        "backgroundPath": "/assets/pagan/backgrounds/RephsianPantheon.png",
        "dedicated": false,
        "canDedicate": true,
        "dedicationReason": "",
        "bonus": [
          {
            "label": "Settlement unrest",
            "amount": -0.01,
            "isPercent": true
          }
        ],
        "penalty": [
          {
            "label": "Conversion resistance",
            "amount": -0.04,
            "isPercent": true
          }
        ],
        "rite": {
          "name": "Civic Games",
          "description": "Pay for games at Rephsis in honour of Sapientia. The celebration reduces unrest. No people are sacrificed. Time away from work reduces tax income for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 70,
          "populationCost": 0,
          "raidCaptives": 0,
          "durationDays": 14,
          "cooldownDays": 168,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": false,
          "sacrificesCharacter": false,
          "needsSettlement": false,
          "needsRaidingHost": false,
          "festivalDue": false,
          "effects": [
            {
              "label": "Settlement unrest",
              "amount": -0.0075,
              "isPercent": true
            },
            {
              "label": "Tax income",
              "amount": -0.01,
              "isPercent": true
            }
          ]
        }
      },
      {
        "key": "RephsianPantheon_Agrippus",
        "name": "Agrippus",
        "description": "Farmer god under Materia. He wears a plain tunic and holds sheaves and a pruning knife.",
        "parentKey": "RephsianPantheon_Materia",
        "isMajor": false,
        "foregroundPath": "/assets/pagan/gods/RephsianPantheon_Agrippus.png",
        "backgroundPath": "/assets/pagan/backgrounds/RephsianPantheon.png",
        "dedicated": false,
        "canDedicate": false,
        "dedicationReason": "The required relic is held in another realm.",
        "bonus": [
          {
            "label": "Conversion resistance",
            "amount": 0.04,
            "isPercent": true
          }
        ],
        "penalty": [
          {
            "label": "Settlement unrest",
            "amount": 0.0075,
            "isPercent": true
          }
        ],
        "rite": {
          "name": "Public Granary Feast",
          "description": "Pay for a public meal at Rephsis in honour of Agrippus. The celebration reduces unrest. No people are sacrificed. Time away from work reduces tax income for the same period.",
          "requirements": "Own the required relic. Lesser gods also require their parent dedication and faith capital.",
          "result": "Completing the rite applies its effects.",
          "goldCost": 70,
          "populationCost": 0,
          "raidCaptives": 0,
          "durationDays": 14,
          "cooldownDays": 168,
          "cooldownEndDay": 0,
          "oathDays": 0,
          "effectDurationDays": 84,
          "needsCharacter": false,
          "sacrificesCharacter": false,
          "needsSettlement": false,
          "needsRaidingHost": false,
          "festivalDue": false,
          "effects": [
            {
              "label": "Settlement unrest",
              "amount": -0.0075,
              "isPercent": true
            },
            {
              "label": "Tax income",
              "amount": -0.01,
              "isPercent": true
            }
          ]
        }
      }
    ],
    "relics": [
      {
        "key": "RephsianPantheon_AquilaAureaCelsori",
        "name": "Aquila Aurea Celsori",
        "description": "The relic of Celsor. Its settlement must belong to your realm before you can dedicate to this god.",
        "iconPath": "/assets/pagan/relics/RephsianPantheon_AquilaAureaCelsori.png",
        "godName": "Celsor",
        "religionId": "rephsianpantheon",
        "religionName": "Rephsian Pantheon",
        "settlementId": "mock-settlement-capital",
        "settlementName": "Rephsis",
        "ownerId": "mock-faction-player",
        "ownerName": "Player realm"
      },
      {
        "key": "RephsianPantheon_CornucopiaMateriae",
        "name": "Cornucopia Materiae",
        "description": "The relic of Materia. Its settlement must belong to your realm before you can dedicate to this god.",
        "iconPath": "/assets/pagan/relics/RephsianPantheon_CornucopiaMateriae.png",
        "godName": "Materia",
        "religionId": "rephsianpantheon",
        "religionName": "Rephsian Pantheon",
        "settlementId": "mock-settlement-port",
        "settlementName": "Rephsis",
        "ownerId": "mock-faction-rival",
        "ownerName": "Neighbouring realm"
      }
    ],
    "followerPlaces": [
      {
        "settlementId": "mock-settlement-capital",
        "name": "Rephsis",
        "followers": 292000
      }
    ],
    "timedEffects": []
  }
};
