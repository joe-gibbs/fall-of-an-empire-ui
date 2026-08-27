// Auto-generated from Automation/Schemas/native_bridge_protocol.json.
// Do not edit - run: python Automation/generate_bridge_types.py

export const NATIVE_BRIDGE_PROTOCOL = {
  "version": 1,
  "events": {
    "worldGlanceHover": "StrategyWorldGlanceHover",
    "worldAnchorRasterScale": "StrategyWorldAnchorRasterScale",
    "battleData": "StrategyBattleData",
    "battleFrame": "StrategyBattleFrame",
    "worldGlancesFrame": "StrategyWorldGlancesFrame",
    "modWorldGlancesFrame": "StrategyModWorldGlancesFrame",
    "notificationAnchorsFrame": "StrategyNotificationAnchorsFrame",
    "bridgeJson": "StrategyBridgeEventNative"
  },
  "strides": {
    "battleFrameFormationNumbers": 13,
    "battleFrameAgentNumbers": 4,
    "battleParticipantStrings": 11,
    "battleParticipantNumbers": 6,
    "battleSideNumbers": 6,
    "battleFormationStrings": 19,
    "battleFormationDetailNumbers": 18,
    "battleUnitStrings": 4,
    "battleUnitNumbers": 2,
    "battleActionStrings": 5,
    "battleActionNumbers": 7,
    "battleObstacleStrings": 2,
    "battleObstacleNumbers": 10,
    "projectedWorldGlanceNumbers": 7,
    "worldGlanceEntryNumbers": 8,
    "worldGlanceFrameHeaderNumbers": 7,
    "worldGlanceBattleNumbers": 6,
    "modWorldGlanceFrameHeaderNumbers": 2,
    "modWorldGlanceEntryNumbers": 5,
    "notificationAnchorNumbers": 5
  },
  "flags": {
    "battleFrameFormation": {
      "manualTarget": 1,
      "routing": 2,
      "withdrawing": 4
    },
    "battleFrameAgent": {
      "melee": 1,
      "detached": 2
    },
    "battleParticipant": {
      "navy": 1,
      "playerControlled": 2,
      "canRetreat": 4
    },
    "battleFormation": {
      "playerControlled": 8,
      "commandable": 16
    },
    "battleAction": {
      "canActivate": 1,
      "active": 2
    },
    "battle": {
      "found": 1,
      "snowAttrition": 2,
      "desertAttrition": 4,
      "playerAttacker": 8,
      "playerDefender": 16,
      "canIssueCommands": 32
    },
    "worldGlance": {
      "selected": 1,
      "targeted": 2,
      "besieged": 4,
      "hasBuildItem": 8,
      "sourceIndexShift": 4
    }
  },
  "jsonNodeTypes": {
    "null": 0,
    "false": 1,
    "true": 2,
    "int32": 3,
    "float": 4,
    "string": 5,
    "array": 6,
    "object": 7
  }
} as const;
