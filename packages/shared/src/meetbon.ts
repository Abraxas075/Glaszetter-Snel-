// Fields transcribed from the supplied Meetbon Glaszettersnel digitaal.xlsx.
export const MEETBON_SECTIONS = [
  {
    "title": "Klantgegevens",
    "fields": [
      {
        "key": "name",
        "label": "Naam"
      },
      {
        "key": "street",
        "label": "Straat"
      },
      {
        "key": "postalCode",
        "label": "Postcode"
      },
      {
        "key": "city",
        "label": "Plaats"
      },
      {
        "key": "email",
        "label": "E-mail"
      },
      {
        "key": "phone",
        "label": "Tel / GSM"
      },
      {
        "key": "date",
        "label": "Datum"
      }
    ],
    "checks": []
  },
  {
    "title": "Werk",
    "fields": [
      {
        "key": "emergencySize",
        "label": "Noodvoorziening (mm)"
      }
    ],
    "checks": [
      {
        "key": "g1c0",
        "label": "Oud werk"
      },
      {
        "key": "g1c1",
        "label": "Nieuw werk"
      },
      {
        "key": "g1c2",
        "label": "Noodvoorziening"
      }
    ]
  },
  {
    "title": "Soort kozijn",
    "fields": [
      {
        "key": "otherFrame",
        "label": "Ander kozijn"
      }
    ],
    "checks": [
      {
        "key": "g2c0",
        "label": "Kunststof"
      },
      {
        "key": "g2c1",
        "label": "Hout"
      },
      {
        "key": "g2c2",
        "label": "Aluminium"
      },
      {
        "key": "g2c3",
        "label": "Staal"
      },
      {
        "key": "g2c4",
        "label": "Dakruit"
      },
      {
        "key": "g2c5",
        "label": "Velux dakraam"
      },
      {
        "key": "g2c6",
        "label": "Balkonafscheiding"
      }
    ]
  },
  {
    "title": "Soort latten",
    "fields": [
      {
        "key": "otherBead",
        "label": "Andere latten"
      }
    ],
    "checks": [
      {
        "key": "g3c0",
        "label": "Kunststof"
      },
      {
        "key": "g3c1",
        "label": "Hout"
      },
      {
        "key": "g3c2",
        "label": "Aluminium"
      },
      {
        "key": "g3c3",
        "label": "Staal"
      },
      {
        "key": "g3c4",
        "label": "Patentroede"
      },
      {
        "key": "g3c5",
        "label": "Vliesgevel"
      },
      {
        "key": "g3c6",
        "label": "Stopverf"
      }
    ]
  },
  {
    "title": "Latten en afdichting",
    "fields": [
      {
        "key": "replacementBead",
        "label": "Type vervangende latten"
      },
      {
        "key": "sealant",
        "label": "Kleur / type kit"
      },
      {
        "key": "tape",
        "label": "Kleur band"
      }
    ],
    "checks": [
      {
        "key": "g4c0",
        "label": "Latten binnen"
      },
      {
        "key": "g4c1",
        "label": "Latten buiten"
      },
      {
        "key": "g4c2",
        "label": "Latten geschroefd"
      },
      {
        "key": "g4c3",
        "label": "Freeswerk"
      },
      {
        "key": "g4c4",
        "label": "Latten vervangen"
      },
      {
        "key": "g4c5",
        "label": "Butyleen"
      }
    ]
  },
  {
    "title": "Verdieping en toegang",
    "fields": [
      {
        "key": "floor",
        "label": "Verdieping"
      }
    ],
    "checks": [
      {
        "key": "g5c0",
        "label": "Begane grond"
      },
      {
        "key": "g5c1",
        "label": "1e verdieping"
      },
      {
        "key": "g5c2",
        "label": "Lift aanwezig"
      },
      {
        "key": "g5c3",
        "label": "Past in lift"
      },
      {
        "key": "g5c4",
        "label": "Kan over de trap"
      },
      {
        "key": "g5c5",
        "label": "Loopkar mee"
      }
    ]
  },
  {
    "title": "Klimmateriaal",
    "fields": [
      {
        "key": "ownScaffoldHeight",
        "label": "Eigen steiger: werkhoogte (mm)"
      },
      {
        "key": "rentalScaffoldHeight",
        "label": "Huursteiger: werkhoogte (mm)"
      },
      {
        "key": "platformHeight",
        "label": "Hoogwerker: werkhoogte (mm)"
      },
      {
        "key": "platformReach",
        "label": "Hoogwerker: reikhoogte (mm)"
      },
      {
        "key": "craneHeight",
        "label": "Kraanwagen: werkhoogte (mm)"
      },
      {
        "key": "craneReach",
        "label": "Kraanwagen: reikhoogte (mm)"
      }
    ],
    "checks": [
      {
        "key": "g6c0",
        "label": "Klimmateriaal nodig"
      },
      {
        "key": "g6c1",
        "label": "Trap"
      },
      {
        "key": "g6c2",
        "label": "Ladder"
      },
      {
        "key": "g6c3",
        "label": "Kamersteiger"
      },
      {
        "key": "g6c4",
        "label": "Eigen steiger"
      },
      {
        "key": "g6c5",
        "label": "Huursteiger"
      },
      {
        "key": "g6c6",
        "label": "Hoogwerker"
      },
      {
        "key": "g6c7",
        "label": "Kraanwagen"
      }
    ]
  },
  {
    "title": "Bezetting",
    "fields": [
      {
        "key": "crew",
        "label": "Aantal mensen"
      },
      {
        "key": "duration",
        "label": "Verwachte tijdsduur"
      }
    ],
    "checks": []
  },
  {
    "title": "Extra werkzaamheden",
    "fields": [
      {
        "key": "remarks",
        "label": "Overige opmerkingen"
      }
    ],
    "checks": [
      {
        "key": "g8c0",
        "label": "Bestickerd"
      },
      {
        "key": "g8c1",
        "label": "Schilderwerk"
      }
    ]
  },
  {
    "title": "Timmerwerk",
    "fields": [],
    "checks": [
      {
        "key": "g9c0",
        "label": "Timmerman nodig"
      },
      {
        "key": "g9c1",
        "label": "Houten deuren"
      },
      {
        "key": "g9c2",
        "label": "Houten kozijnen"
      },
      {
        "key": "g9c3",
        "label": "Timmerherstelwerkzaamheden"
      }
    ]
  }
] as const;
export interface MeetbonLine { quantity: number; width: number; height: number; glassType: string; notes: string; }
export interface Meetbon { fields: Record<string, string>; checks: Record<string, boolean>; lines: MeetbonLine[]; }
export const emptyMeetbon = (): Meetbon => ({ fields: {}, checks: {}, lines: [] });
export function isMeetbon(value: unknown): value is Meetbon {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Meetbon;
  const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
  if (!object(v.fields) || !object(v.checks) || !Array.isArray(v.lines) || v.lines.length > 200) return false;
  const fields = new Set<string>(MEETBON_SECTIONS.flatMap(s => s.fields.map(f => f.key)));
  const checks = new Set<string>(MEETBON_SECTIONS.flatMap(s => s.checks.map(f => f.key)));
  return Object.entries(v.fields).every(([k,x]) => fields.has(k) && typeof x === 'string' && x.length <= 2000)
    && Object.entries(v.checks).every(([k,x]) => checks.has(k) && typeof x === 'boolean')
    && v.lines.every(l => object(l) && Number.isInteger(l.quantity) && l.quantity > 0 && l.quantity <= 10000
      && Number.isFinite(l.width) && l.width > 0 && l.width <= 100000
      && Number.isFinite(l.height) && l.height > 0 && l.height <= 100000
      && typeof l.glassType === 'string' && l.glassType.length <= 2000
      && typeof l.notes === 'string' && l.notes.length <= 2000);
}
