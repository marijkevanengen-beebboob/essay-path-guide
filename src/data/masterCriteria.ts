// Masterlijst met beoordelingscriteria per referentieniveau

export type CriterionCategory = {
  id: string;
  category: string;
  criteria: MasterCriterion[];
};

export type MasterCriterion = {
  id: string;
  label: string;
  description: string;
  category: string;
};

export type LevelCriteria = {
  level: string;
  levelName: string;
  description: string;
  categories: CriterionCategory[];
};

export const masterCriteria: LevelCriteria[] = [
  {
    level: "1F",
    levelName: "1F - Basisniveau",
    description: "Kan korte, eenvoudige teksten schrijven over alledaagse onderwerpen of over onderwerpen uit de leefwereld.",
    categories: [
      {
        id: "samenhang-1f",
        category: "Samenhang",
        criteria: [
          {
            id: "1f-1",
            label: "Informatieordening",
            description: "Eenvoudige, lineaire opbouw zonder hak-op-de-tak",
            category: "Samenhang"
          },
          {
            id: "1f-2",
            label: "Basisvoegwoorden",
            description: "Correct gebruik van en, maar, want, omdat",
            category: "Samenhang"
          },
          {
            id: "1f-3",
            label: "Boodschap helder ondanks fouten",
            description: "Complexere voegwoorden mogen fouten bevatten als betekenis duidelijk blijft",
            category: "Samenhang"
          }
        ]
      },
      {
        id: "doel-publiek-1f",
        category: "Afstemming op Doel en Publiek",
        criteria: [
          {
            id: "1f-4",
            label: "Schrijfdoel kiezen",
            description: "Tekst is direct herkenbaar als het gevraagde type (uitnodiging, instructie, etc.)",
            category: "Afstemming op Doel en Publiek"
          },
          {
            id: "1f-5",
            label: "Register",
            description: "Verschil tussen formeel (u, geachte) en informeel (je, hoi) toepassen",
            category: "Afstemming op Doel en Publiek"
          }
        ]
      },
      {
        id: "woordgebruik-1f",
        category: "Woordgebruik en Woordenschat",
        criteria: [
          {
            id: "1f-6",
            label: "Frequent voorkomende woorden",
            description: "Alledaagse, directe en concrete woordenschat",
            category: "Woordgebruik en Woordenschat"
          }
        ]
      },
      {
        id: "taalverzorging-1f",
        category: "Taalverzorging",
        criteria: [
          {
            id: "1f-7",
            label: "Grammatica",
            description: "Redelijk accuraat gebruik van eenvoudige zinsconstructies",
            category: "Taalverzorging"
          },
          {
            id: "1f-8",
            label: "Werkwoordspelling (d/t)",
            description: "Incidentele fouten toegestaan, geen systematische fouten in tegenwoordige tijd",
            category: "Taalverzorging"
          },
          {
            id: "1f-9",
            label: "Interpunctie",
            description: "Hoofdletter aan begin, punt/vraagteken aan einde van elke zin",
            category: "Taalverzorging"
          }
        ]
      },
      {
        id: "leesbaarheid-1f",
        category: "Leesbaarheid",
        criteria: [
          {
            id: "1f-10",
            label: "Titelgebruik",
            description: "Duidelijke titel of vermelden afzender/ontvanger bij brief",
            category: "Leesbaarheid"
          },
          {
            id: "1f-11",
            label: "Briefconventies",
            description: "Correct gebruik van aanhef, afsluiting, datering",
            category: "Leesbaarheid"
          },
          {
            id: "1f-12",
            label: "Alineaverdeling",
            description: "Witregels of inspringingen voor logische blokken",
            category: "Leesbaarheid"
          }
        ]
      }
    ]
  },
  {
    level: "2F",
    levelName: "2F - Midden",
    description: "Kan samenhangende teksten schrijven met een eenvoudige, lineaire opbouw over uiteenlopende vertrouwde onderwerpen.",
    categories: [
      {
        id: "samenhang-2f",
        category: "Samenhang",
        criteria: [
          {
            id: "2f-1",
            label: "Voegwoorden met woordvolgorde",
            description: "Correct gebruik van als, hoewel, omdat, terwijl met juiste woordvolgorde",
            category: "Samenhang"
          },
          {
            id: "2f-2",
            label: "Inleiding-kern-slot structuur",
            description: "Duidelijke driedeling met aanleiding, uitleg en afsluiting",
            category: "Samenhang"
          },
          {
            id: "2f-3",
            label: "Alineagebruik",
            description: "Witregels tussen onderdelen, één onderwerp per alinea",
            category: "Samenhang"
          },
          {
            id: "2f-4",
            label: "Verwijzingen meestal duidelijk",
            description: "Die/dat fouten toegestaan als betekenis helder blijft",
            category: "Samenhang"
          }
        ]
      },
      {
        id: "doel-2f",
        category: "Afstemming op Doel",
        criteria: [
          {
            id: "2f-5",
            label: "Schrijfdoelen combineren",
            description: "Informeren, overtuigen en mening geven in één tekst",
            category: "Afstemming op Doel"
          }
        ]
      },
      {
        id: "publiek-2f",
        category: "Afstemming op Publiek",
        criteria: [
          {
            id: "2f-6",
            label: "Formeel en informeel taalgebruik",
            description: "Correct gebruik van u/je, passende aanhef en afsluiting",
            category: "Afstemming op Publiek"
          },
          {
            id: "2f-7",
            label: "Toon en woordkeuze",
            description: "Geen straattaal in formele context, beleefde toon bij klachten",
            category: "Afstemming op Publiek"
          }
        ]
      },
      {
        id: "woordgebruik-2f",
        category: "Woordgebruik",
        criteria: [
          {
            id: "2f-8",
            label: "Variatie om herhaling te voorkomen",
            description: "Niet steeds dezelfde woorden, vermijden van 'en toen'-stijl",
            category: "Woordgebruik"
          },
          {
            id: "2f-9",
            label: "Adequate woordkeuze",
            description: "Kleine fouten toegestaan als betekenis duidelijk blijft",
            category: "Woordgebruik"
          }
        ]
      },
      {
        id: "taalverzorging-2f",
        category: "Spelling en Grammatica",
        criteria: [
          {
            id: "2f-10",
            label: "Werkwoordspelling d/t (80% regel)",
            description: "Tegenwoordige tijd grotendeels correct, lastige gevallen mogen fout",
            category: "Spelling en Grammatica"
          },
          {
            id: "2f-11",
            label: "Algemene spelling",
            description: "Hoogfrequente woorden correct, moeilijke woorden mogen fouten bevatten",
            category: "Spelling en Grammatica"
          },
          {
            id: "2f-12",
            label: "Grammaticale constructies",
            description: "Standaard meervoud en verbuiging correct",
            category: "Spelling en Grammatica"
          },
          {
            id: "2f-13",
            label: "Hoofdletters en punten",
            description: "Zinnen beginnen met hoofdletter, eindigen met punt",
            category: "Spelling en Grammatica"
          }
        ]
      },
      {
        id: "leesbaarheid-2f",
        category: "Leesbaarheid",
        criteria: [
          {
            id: "2f-14",
            label: "Titel en tekstkopjes",
            description: "Scan-test: tekst is overzichtelijk met functionele kopjes",
            category: "Leesbaarheid"
          },
          {
            id: "2f-15",
            label: "Layout ondersteuning",
            description: "Bij langere teksten mag template/format gebruikt worden",
            category: "Leesbaarheid"
          }
        ]
      }
    ]
  },
  {
    level: "3F",
    levelName: "3F - Gevorderd",
    description: "Kan gedetailleerde teksten schrijven waarin informatie en argumenten uit verschillende bronnen bijeengevoegd en beoordeeld worden.",
    categories: [
      {
        id: "samenhang-3f",
        category: "Samenhang",
        criteria: [
          {
            id: "3f-1",
            label: "Rode draad zichtbaar",
            description: "Duidelijk doel, lezer begrijpt bij elke alinea waarom informatie gegeven wordt",
            category: "Samenhang"
          },
          {
            id: "3f-2",
            label: "Logische ordening",
            description: "Informatie past bij tekstsoort (chronologisch, thematisch, causaal)",
            category: "Samenhang"
          },
          {
            id: "3f-3",
            label: "Klein zijspoor toegestaan",
            description: "Mag uitweiden over details, keert terug naar hoofdlijn",
            category: "Samenhang"
          },
          {
            id: "3f-4",
            label: "Oorzaak en gevolg duidelijk",
            description: "Expliciet gebruik van doordat, waardoor, hieruit volgt",
            category: "Samenhang"
          },
          {
            id: "3f-5",
            label: "Voor- en nadelen afwegen",
            description: "Gebruik van echter, daarentegen, enerzijds/anderzijds",
            category: "Samenhang"
          },
          {
            id: "3f-6",
            label: "Vergelijkingen helder",
            description: "Duidelijk gebruik van in tegenstelling tot, vergelijkbaar met",
            category: "Samenhang"
          }
        ]
      },
      {
        id: "verbinding-3f",
        category: "Verwijs- en Verbindingswoorden",
        criteria: [
          {
            id: "3f-7",
            label: "Verwijswoorden correct",
            description: "Correct gebruik van deze, die, dit, dat om herhaling te voorkomen",
            category: "Verwijs- en Verbindingswoorden"
          },
          {
            id: "3f-8",
            label: "Gevarieerde verbindingswoorden",
            description: "Bovendien, daarnaast, desondanks, waarin, waarover",
            category: "Verwijs- en Verbindingswoorden"
          },
          {
            id: "3f-9",
            label: "Correcte woordvolgorde bij inversie",
            description: "Werkwoord en onderwerp draaien correct om na daarom, echter",
            category: "Verwijs- en Verbindingswoorden"
          }
        ]
      },
      {
        id: "alineas-3f",
        category: "Alinea's en Structuur",
        criteria: [
          {
            id: "3f-10",
            label: "Kernzin per alinea",
            description: "Elke alinea begint met sterke kernzin, daarna uitleg/bewijs",
            category: "Alinea's en Structuur"
          },
          {
            id: "3f-11",
            label: "Alinea's verbonden",
            description: "Inhoudelijke herhaling of signaalwoorden tussen alinea's",
            category: "Alinea's en Structuur"
          }
        ]
      },
      {
        id: "doel-3f",
        category: "Afstemming op Doel",
        criteria: [
          {
            id: "3f-12",
            label: "Opbouw past bij tekstsoort",
            description: "Herkent welke structuur past bij verslag, betoog, brief",
            category: "Afstemming op Doel"
          }
        ]
      },
      {
        id: "publiek-3f",
        category: "Afstemming op Publiek",
        criteria: [
          {
            id: "3f-13",
            label: "Register consequent toegepast",
            description: "Kiest toon en houdt die vol, formeel niet geforceerd",
            category: "Afstemming op Publiek"
          },
          {
            id: "3f-14",
            label: "Schrijven voor verschillende doelgroepen",
            description: "Past toon aan bij eigen omgeving én algemeen publiek",
            category: "Afstemming op Publiek"
          }
        ]
      },
      {
        id: "woordgebruik-3f",
        category: "Woordgebruik",
        criteria: [
          {
            id: "3f-15",
            label: "Geen merkbare beperkingen",
            description: "Genoeg woorden om precies te zeggen wat bedoeld wordt",
            category: "Woordgebruik"
          },
          {
            id: "3f-16",
            label: "Adequate variatie",
            description: "Gebruikt synoniemen, tekst leest prettig zonder herhalingen",
            category: "Woordgebruik"
          }
        ]
      },
      {
        id: "taalverzorging-3f",
        category: "Spelling en Grammatica",
        criteria: [
          {
            id: "3f-17",
            label: "Complexe zinsbouw correct",
            description: "Kan lange zinnen bouwen zonder struikelen over woordvolgorde",
            category: "Spelling en Grammatica"
          },
          {
            id: "3f-18",
            label: "Werkwoordspelling grotendeels foutloos",
            description: "95% correct, incidentele vergissing mag",
            category: "Spelling en Grammatica"
          },
          {
            id: "3f-19",
            label: "Interpunctie correct",
            description: "Komma's bij voegwoorden, hoofdletters bij namen",
            category: "Spelling en Grammatica"
          }
        ]
      },
      {
        id: "leesbaarheid-3f",
        category: "Leesbaarheid",
        criteria: [
          {
            id: "3f-20",
            label: "Helder gestructureerd",
            description: "Witregels, marges en kopjes ondersteunen begrip",
            category: "Leesbaarheid"
          },
          {
            id: "3f-21",
            label: "Paragraafindeling logisch",
            description: "Lezer ziet in oogopslag waar inleiding, kern en conclusie zijn",
            category: "Leesbaarheid"
          }
        ]
      }
    ]
  },
  {
    level: "4F",
    levelName: "4F - Expert",
    description: "Kan goed gestructureerde, complexe teksten schrijven met intellectuele eigenaarschap en stilistische aantrekkelijkheid.",
    categories: [
      {
        id: "samenhang-4f",
        category: "Samenhang",
        criteria: [
          {
            id: "4f-1",
            label: "Complexe gedachtegangen helder",
            description: "Rode draad blijft zichtbaar bij abstracte onderwerpen",
            category: "Samenhang"
          },
          {
            id: "4f-2",
            label: "Hiërarchische ordening",
            description: "Onderscheid tussen kernargumenten en ondersteunende bewijzen",
            category: "Samenhang"
          },
          {
            id: "4f-3",
            label: "Lange samengestelde zinnen",
            description: "Complexe zinnen blijven perfect leesbaar",
            category: "Samenhang"
          },
          {
            id: "4f-4",
            label: "Meanderen zonder verdwalen",
            description: "Kan uitweiden over nuances, keert naadloos terug",
            category: "Samenhang"
          }
        ]
      },
      {
        id: "argumentatie-4f",
        category: "Relaties en Argumentatie",
        criteria: [
          {
            id: "4f-5",
            label: "Nuancering en afweging",
            description: "Gebruik van ogenschijnlijk, wellicht, in zekere zin",
            category: "Relaties en Argumentatie"
          },
          {
            id: "4f-6",
            label: "Verbanden tussen onderwerpen",
            description: "Koppelt onderwerpen aan maatschappelijke trends (helikopterview)",
            category: "Relaties en Argumentatie"
          },
          {
            id: "4f-7",
            label: "Overtuigen met stijl",
            description: "Anticipeert op twijfel, weerlegt tegenargumenten expliciet",
            category: "Relaties en Argumentatie"
          }
        ]
      },
      {
        id: "verbinding-4f",
        category: "Verwijs- en Verbindingswoorden",
        criteria: [
          {
            id: "4f-8",
            label: "Onzichtbare lijm",
            description: "Verbindingen zo natuurlijk dat ze niet opvallen",
            category: "Verwijs- en Verbindingswoorden"
          },
          {
            id: "4f-9",
            label: "Foutloos verwijzen",
            description: "Correct gebruik die/dat, hen/hun, wiens/wier over grotere afstand",
            category: "Verwijs- en Verbindingswoorden"
          },
          {
            id: "4f-10",
            label: "Functionele variatie",
            description: "Verschil kennen tussen omdat/doordat, gebruik van immers/evenwel",
            category: "Verwijs- en Verbindingswoorden"
          }
        ]
      },
      {
        id: "structuur-4f",
        category: "Alinea's en Structuur",
        criteria: [
          {
            id: "4f-11",
            label: "Strategische alinea-indeling",
            description: "Alinea's bewust kort of lang voor nadruk of uitdieping",
            category: "Alinea's en Structuur"
          },
          {
            id: "4f-12",
            label: "Kopjes dekken lading",
            description: "Prikkelend of zakelijk, afhankelijk van tekstsoort",
            category: "Alinea's en Structuur"
          }
        ]
      },
      {
        id: "doel-publiek-4f",
        category: "Afstemming op Doel en Publiek",
        criteria: [
          {
            id: "4f-13",
            label: "Meerdere registers hanteren",
            description: "Schakelen tussen formeel, persoonlijk, humoristisch waar passend",
            category: "Afstemming op Doel en Publiek"
          },
          {
            id: "4f-14",
            label: "Eigen stem en stijl",
            description: "Persoonlijke stijl zichtbaar, diplomatie bij zakelijke correspondentie",
            category: "Afstemming op Doel en Publiek"
          },
          {
            id: "4f-15",
            label: "Doelen vervlechten",
            description: "Tegelijkertijd informeren én overtuigen zonder rommeligheid",
            category: "Afstemming op Doel en Publiek"
          }
        ]
      },
      {
        id: "woordgebruik-4f",
        category: "Woordgebruik",
        criteria: [
          {
            id: "4f-16",
            label: "Zeer rijk en gevarieerd",
            description: "Uitgebreide woordenschat, hoeft nooit te zoeken",
            category: "Woordgebruik"
          },
          {
            id: "4f-17",
            label: "Precisie in woordkeuze",
            description: "Kiest niet zomaar een woord, maar hét woord",
            category: "Woordgebruik"
          },
          {
            id: "4f-18",
            label: "Stijlfiguren",
            description: "Gebruikt beeldspraak of metaforen waar passend",
            category: "Woordgebruik"
          }
        ]
      },
      {
        id: "taalverzorging-4f",
        category: "Spelling en Grammatica",
        criteria: [
          {
            id: "4f-19",
            label: "Consistent hoge correctheid",
            description: "Tekst vrijwel foutloos, straalt professionaliteit uit",
            category: "Spelling en Grammatica"
          },
          {
            id: "4f-20",
            label: "Complexiteit geen excuus",
            description: "Ook in lange zinnen kloppen verwijzingen en persoonsvormen exact",
            category: "Spelling en Grammatica"
          },
          {
            id: "4f-21",
            label: "Interpunctie als stijlmiddel",
            description: "Correct gebruik puntkomma, beletselteken, haakjes voor leesritme",
            category: "Spelling en Grammatica"
          }
        ]
      },
      {
        id: "leesbaarheid-4f",
        category: "Leesbaarheid",
        criteria: [
          {
            id: "4f-22",
            label: "Nodigt uit tot lezen",
            description: "Bladspiegel rustig, opmaak bewust ingezet",
            category: "Leesbaarheid"
          },
          {
            id: "4f-23",
            label: "Publicatie-waardig",
            description: "Tekst ziet eruit alsof deze zo gepubliceerd kan worden",
            category: "Leesbaarheid"
          }
        ]
      }
    ]
  }
];

// Helper function to get all criteria for a specific level
export const getCriteriaForLevel = (level: string): MasterCriterion[] => {
  const levelData = masterCriteria.find(l => l.level === level);
  if (!levelData) return [];
  
  return levelData.categories.flatMap(category => category.criteria);
};

// Helper function to get criteria grouped by category
export const getCategorizedCriteria = (level: string): CriterionCategory[] => {
  const levelData = masterCriteria.find(l => l.level === level);
  return levelData?.categories || [];
};

// Helper function to group criteria into three main categories: Vorm, Inhoud, Taal
export const getGroupedCriteria = (level: string): { group: string; categories: CriterionCategory[] }[] => {
  const levelData = masterCriteria.find(l => l.level === level);
  if (!levelData) return [];

  const vormCategories = ["Leesbaarheid", "Alinea's en Structuur"];
  const inhoudCategories = ["Samenhang", "Afstemming op Doel", "Afstemming op Publiek", "Afstemming op Doel en Publiek", "Relaties en Argumentatie", "Woordgebruik", "Woordgebruik en Woordenschat"];
  const taalCategories = ["Taalverzorging", "Spelling en Grammatica", "Verwijs- en Verbindingswoorden"];

  const grouped = [
    {
      group: "Inhoud",
      categories: levelData.categories.filter(cat => inhoudCategories.includes(cat.category))
    },
    {
      group: "Vorm",
      categories: levelData.categories.filter(cat => vormCategories.includes(cat.category))
    },
    {
      group: "Taal",
      categories: levelData.categories.filter(cat => taalCategories.includes(cat.category))
    }
  ];

  return grouped.filter(g => g.categories.length > 0);
};
