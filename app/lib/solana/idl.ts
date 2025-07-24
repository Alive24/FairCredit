export const IDL = {
  "version": "0.1.0",
  "name": "fair_credit",
  "instructions": [
    {
      "name": "initializeHub",
      "accounts": [
        {
          "name": "hub",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "hub"
              }
            ]
          }
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Hub",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "acceptedProviders",
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "acceptedEndorsers",
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "acceptedCourses",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "config",
            "type": {
              "defined": "HubConfig"
            }
          }
        ]
      }
    },
    {
      "name": "Course",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "string"
          },
          {
            "name": "created",
            "type": "i64"
          },
          {
            "name": "updated",
            "type": "i64"
          },
          {
            "name": "provider",
            "type": "publicKey"
          },
          {
            "name": "status",
            "type": {
              "defined": "CourseStatus"
            }
          },
          {
            "name": "rejectionReason",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "weightIds",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "workloadRequired",
            "type": "u32"
          },
          {
            "name": "workload",
            "type": "u32"
          },
          {
            "name": "collegeId",
            "type": "string"
          },
          {
            "name": "degreeId",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "resourceIds",
            "type": {
              "vec": "string"
            }
          }
        ]
      }
    },
    {
      "name": "Provider",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "publicKey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "website",
            "type": "string"
          },
          {
            "name": "email",
            "type": "string"
          },
          {
            "name": "providerType",
            "type": "string"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "suspendedBy",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "HubConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "requireProviderApproval",
            "type": "bool"
          },
          {
            "name": "requireEndorserApproval",
            "type": "bool"
          },
          {
            "name": "minReputationScore",
            "type": "u64"
          },
          {
            "name": "allowSelfEndorsement",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "CourseStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Draft"
          },
          {
            "name": "Published"
          },
          {
            "name": "Archived"
          }
        ]
      }
    }
  ]
}