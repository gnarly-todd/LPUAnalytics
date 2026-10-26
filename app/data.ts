export type Belt =
  | "White"
  | "Yellow"
  | "Orange"
  | "Green"
  | "Blue"
  | "Purple"
  | "Brown"
  | "Red"
  | "Black"
  | "Unranked";

export type LockRecord = {
  id: string;
  name: string;
  version?: string;
  mechanisms: string[];
  belt: Belt;
  beltLevel?: `Black ${1 | 2 | 3 | 4 | 5}`;
  status: "Owned" | "Wishlist";
  picked: boolean;
  resourceLinks?: {
    lpu?: string;
  };
};

export const profileSnapshotDate = "October 26, 2026 · 12:36 AM EDT";

export const profileCollectionsSnapshot: Record<string, string[]> = {"own":["901b35b2","2455f0ae","40f7d7c7","632f4069","74a00ae3","e1625c4d","2ae1e0b8","4f6bcdb7","c6529d9c","85d93eb1","959a6b9d","331c9d36","fb5a9eb7","c8259a23","45e3cde7","826c31e0","b13f4b57","d3ad5a73","b8350901","29ab2852","2ae6a691","104776ef","aeaa6a09","639c4f0b","3335df97","55053299","ab1e901f","e87f0ca2","d974b48f","efc01233","5c0d870b","ea1afad0","55511995","112d0034","f133510b","58307da0","779e7dcb","222bd1fa","b8350900","2484ce70","9ec8706c","171f76e9","2ff8a738","7168d463","37951bc4","9ca2c109","e35a3c91","a460c971","1459e2c6","bf8970de","366d5f50","5a6170fb","06a28ac7","d9e3829f","506b242a","35330d19","3198fffc","aee424c0","0b604114","cd0c2ff9","3c73c705","1d80c9bb","a1233156","5103e650","562e964e","13b06cba","71833308","f1e92541","d08aa492","dd764207","111062fc","814c5368","0b82681f","c942490e","ea1d1d8c","da09d849","e4bb0668","07034c0f","626da374","07bc680a"],"picked":["07034c0f","901b35b2","2455f0ae","40f7d7c7","632f4069","2ae1e0b8","fb5a9eb7","779e7dcb","959a6b9d","efc01233","562e964e"],"wishlist":["8d67f9b7","1ae40987","e957e0d6","73a718cb","32fa52a6","5b842c0e","1add3dd0","ebcb29b9","2801996f","aa7fc00e","9b94b1c0","c11aca1a","40e50dd4","ab9df828","c0af329b","0418a174","aec0c82d","a0ec1618","6e0bfdd2","37dc53bb","b0d2e04c","5e3397a9","dd1dd313","ef221c67","f3666121","ed9fa926","1f3a8ff9","71bce5b7","e8901d1c","8c2983b5","3fbd7b3d","9982c0eb","8f7f1830","6d754a0a","3dabf132","1be10736","e38d015b","9c627ebd","86e86a1d","93e4cf5f","3af2407a","9f613c4a","281aa393","d1272b9f","9da7a5f2","4a7db3c6","cf76cfde","3f73d2ce","f7452b9f","f1857cef","ccdbffbf","649eaebc","63a9a2b1","00cf7717","5cba063b","c6a14e93","3ca098da","f87db705","f29a212f","e718b140","5a4310d5","340154fa","6c0ec943","2db935ea","2181e10d","c4f942f0","c266d57b","3515caae","d005e7b8","08b5986d","5c2f5101","23c7988c","0684a655","74c225d1","49c381dc","95a9b042","97c2b9be","fe088de0","c1e91978","30a4fef5","bbce33e0","039a239f","8f004bf0","98ba98ae","8a0c4b07","93871dad","4cd09b3b","4ffe03a9","06ddb074","434b5b25","62520bea","fd2b533e","48323cde","1110ef61","16906a6c","8a65b956","6dd5a34b","e1e595b9","8307d77f","ebe9ee59","da8331ef","93c49314","33d6e0df","bc03135a","61247b32","33588917","58cbc037","7298a640","594b1a1c","7194cc26","f38cafca","9659ad59","1ee01369","f61461ed","41b91a0e","e0191c45","2efc9257","9375df98","660a840e","b8783269","848940e5","05f9773b","2bf9f60e","fd5a5246","5c5701d7","94ee12b7","b91890bf","18e1f45b","9d865bcd","87eaa964","e92d29ad","b29a8b44","e3bd3faf","9eb3e9c4","c640fe2c","9bb97454","7c6efd49","6b06f591","4993a918","265226b1","6852489f","00b569f2","03cbfaa5","9d7faa15","a57c1e9b","49b2c746","66d1ab72","34d27803","843896be","aa4c402d","eed91da5","434bdf9d","0770580d","c8e86f14","c4484574","e3081fd3","43deff29","deb35ee7","00a2ff18","fdb68dc4","550a0c9d","31cd85d7","31431c49","3daff112","fa0b5d10","9c5f4539","95281228","131732a0","6708838f","5eac6a29","f09ce6b3","78336fc0","57fbcb1b","1e197456","db749615","4abcb403","f048719a","63b2e02b","0082fa4c","8f99236e","7d5c53c4","68b5a797","f7b52501","3ddfc71c","d54a6b5f","a2bd7f1e","f0e31f32","d0c510c5","71c7270b","ae7d3780","db63c882","d1a5cd90","a974eb0c","1a7a23d4","fc627b17","cad3eff0","12ff8c25","c8694f3a","6d2555aa","533c7408","8ea170d2","109531f4","e8c7dd5b","108549ba","c9494ee8","bc1509f5","10968d37","dfa88b94","21b61a85","284bf0b0","23437955","a8e79394","6e59ba12","5ab25363","10ab07eb","91f40022","ca6c2e4c","e151c916","c0af45f4","50a463eb","4f2ed774","a2bccc4b","b1949215","e35772c9","25809d7e","89207b78","e6872b30","4150776b","e66bce0b","c6cd3574","f5086cb9","6cb514ea","9b528165","5646568c","a72739bc","cdfac03d","1b6eea7f","9d35efa9","89c7446c","e16080de","074db05e"],"recorded":[],"recordedLocks":[],"scorecard":[],"safelocksOwn":[],"safelocksCracked":[],"safelocksWishlist":[]};

export const beltOrder: Belt[] = [
  "White",
  "Yellow",
  "Orange",
  "Green",
  "Blue",
  "Purple",
  "Brown",
  "Red",
  "Black",
  "Unranked",
];

export const beltColors: Record<Belt, string> = {
  White: "#f4f6fa",
  Yellow: "#f4db32",
  Orange: "#ff8a34",
  Green: "#34a853",
  Blue: "#3b82f6",
  Purple: "#a855f7",
  Brown: "#7b4729",
  Red: "#ef4444",
  Black: "#080a0f",
  Unranked: "#566171",
};

export const profileBeltCounts: Record<Belt, number> = {
  White: 3,
  Yellow: 5,
  Orange: 8,
  Green: 16,
  Blue: 35,
  Purple: 24,
  Brown: 14,
  Red: 12,
  Black: 29,
  Unranked: 1,
};

export const statusBenchmarks = [
  { label: "Owned", user: 78, average: 14, topTen: 250 },
  { label: "Picked", user: 11, average: 11, topTen: 280 },
  { label: "Recorded", user: 0, average: 11, topTen: 260 },
  { label: "Wishlist", user: 69, average: 8, topTen: 100 },
];

export const progression = [
  { belt: "Yellow" as Belt, date: "2024-09-02" },
  { belt: "Orange" as Belt, date: "2024-09-27" },
  { belt: "Green" as Belt, date: "2025-05-18" },
  { belt: "Blue" as Belt, date: "2025-05-19" },
];

const lockCatalog: Omit<LockRecord, "status" | "picked">[] = [
  {
    "id": "07034c0f",
    "name": "Any Acrylic Padlock",
    "mechanisms": [
      "Various"
    ],
    "belt": "White",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/07034c0f.html"
    }
  },
  {
    "id": "901b35b2",
    "name": "Any Cutaway Lock",
    "mechanisms": [
      "Various"
    ],
    "belt": "White",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/901b35b2.html"
    }
  },
  {
    "id": "562e964e",
    "name": "Master Lock #3",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "White",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/562e964e.html"
    }
  },
  {
    "id": "d974b48f",
    "name": "Brinks 164 padlock",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Yellow",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/d974b48f.html"
    }
  },
  {
    "id": "58307da0",
    "name": "Brinks Brass Padlocks",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Yellow",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/58307da0.html"
    }
  },
  {
    "id": "2455f0ae",
    "name": "Master Lock 140 Series / Master Lock 9140 EURD",
    "version": "Ex: 140, 141, 142, etc.",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Yellow",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/2455f0ae.html"
    }
  },
  {
    "id": "40f7d7c7",
    "name": "Schlage Original Commercial/Residential",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Yellow",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/40f7d7c7.html"
    }
  },
  {
    "id": "a460c971",
    "name": "Squire 440",
    "version": "4 lever, pin key",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Yellow",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/a460c971.html"
    }
  },
  {
    "id": "632f4069",
    "name": "ABUS 55/40",
    "version": "40mm or larger",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Orange",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/632f4069.html"
    }
  },
  {
    "id": "bf8970de",
    "name": "ACE Tubular",
    "mechanisms": [
      "Pump/push"
    ],
    "belt": "Orange",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/bf8970de.html"
    }
  },
  {
    "id": "171f76e9",
    "name": "Burg Wächter Boccia",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Orange",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/171f76e9.html"
    }
  },
  {
    "id": "efc01233",
    "name": "Master Lock 150 / Master Lock 160 / Master Lock 9150 EURD",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Orange",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/efc01233.html"
    }
  },
  {
    "id": "8d67f9b7",
    "name": "Master Lock 1921D \"100 Anniversary\" Padlock",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Orange",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/8d67f9b7.html"
    }
  },
  {
    "id": "9ca2c109",
    "name": "Master Lock 570 / Master Lock 575 / Master Lock 576",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Orange",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9ca2c109.html"
    }
  },
  {
    "id": "ea1d1d8c",
    "name": "Schlage Everest",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Orange",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/ea1d1d8c.html"
    }
  },
  {
    "id": "222bd1fa",
    "name": "Yale 112",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Orange",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/222bd1fa.html"
    }
  },
  {
    "id": "74a00ae3",
    "name": "ABUS 72/40 / ABUS 34CS55 Platinum",
    "version": "Guttable version",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/74a00ae3.html"
    }
  },
  {
    "id": "e1625c4d",
    "name": "ABUS 80TI Titalium",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e1625c4d.html"
    }
  },
  {
    "id": "2484ce70",
    "name": "ABUS EC 75/30 / ABUS 75IB/30 / ABUS 34/55 Strada",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/2484ce70.html"
    }
  },
  {
    "id": "13b06cba",
    "name": "ABUS GDS",
    "version": "with trees and tapered pins",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/13b06cba.html"
    }
  },
  {
    "id": "2ae1e0b8",
    "name": "American Lock 1100 / A1100",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/2ae1e0b8.html"
    }
  },
  {
    "id": "1ae40987",
    "name": "American Lock 1160",
    "version": "1100 but with 6 pin stacks",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/1ae40987.html"
    }
  },
  {
    "id": "5a6170fb",
    "name": "American Lock S1100",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/5a6170fb.html"
    }
  },
  {
    "id": "0b82681f",
    "name": "ASSA 500 / Ruko 500",
    "version": "tapered drivers",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/0b82681f.html"
    }
  },
  {
    "id": "e957e0d6",
    "name": "Brady SafeKey",
    "mechanisms": [
      "Pump/push"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e957e0d6.html"
    }
  },
  {
    "id": "73a718cb",
    "name": "Corbin Russwin Master Ring",
    "version": "**",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/73a718cb.html"
    }
  },
  {
    "id": "cd0c2ff9",
    "name": "FAB 200RS",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/cd0c2ff9.html"
    }
  },
  {
    "id": "639c4f0b",
    "name": "FJM Padlock",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/639c4f0b.html"
    }
  },
  {
    "id": "c942490e",
    "name": "Master Lock 410 LOTO (Lockout Tagout)",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c942490e.html"
    }
  },
  {
    "id": "366d5f50",
    "name": "Master Lock 6835",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/366d5f50.html"
    }
  },
  {
    "id": "37951bc4",
    "name": "Yale 500+",
    "version": "without overmilling",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/37951bc4.html"
    }
  },
  {
    "id": "4f6bcdb7",
    "name": "Zarker J45/J45S",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Green",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/4f6bcdb7.html"
    }
  },
  {
    "id": "c6529d9c",
    "name": "Any SFIC format lock",
    "version": "**",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c6529d9c.html"
    }
  },
  {
    "id": "85d93eb1",
    "name": "ABUS C73 / ABUS C83 / ABUS C90",
    "version": "new pinning: security keypins + serrated and spooled t-pins",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/85d93eb1.html"
    }
  },
  {
    "id": "5c0d870b",
    "name": "ABUS E20 / ABUS E30 / ABUS E60 / ABUS E70 / ABUS NP (6-pin)",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/5c0d870b.html"
    }
  },
  {
    "id": "9ec8706c",
    "name": "ABUS EC 75/50 / ABUS 75IB/50",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9ec8706c.html"
    }
  },
  {
    "id": "3515caae",
    "name": "ABUS EC750 / ABUS EC850",
    "version": "T-spools and recessed pins version, not 700/800",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/3515caae.html"
    }
  },
  {
    "id": "d005e7b8",
    "name": "ABUS EC880 / ABUS P12R / ABUS X12R",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/d005e7b8.html"
    }
  },
  {
    "id": "d9e3829f",
    "name": "ASSA 500 / ASSA Flexcore/Flexcore Plus",
    "version": "5 pin with barrels and matched countermilling",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/d9e3829f.html"
    }
  },
  {
    "id": "d08aa492",
    "name": "ASSA 700",
    "version": "7 pin with spools and no countermilling",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/d08aa492.html"
    }
  },
  {
    "id": "f1e92541",
    "name": "ASSA 700",
    "version": "7 pin with tapered drivers",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/f1e92541.html"
    }
  },
  {
    "id": "111062fc",
    "name": "Bison/HYT/Lays/Qlsy Chain Key Lock",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/111062fc.html"
    }
  },
  {
    "id": "32fa52a6",
    "name": "Burg Wächter Diamant",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/32fa52a6.html"
    }
  },
  {
    "id": "5b842c0e",
    "name": "Chubb Cruiser",
    "version": "5 lever",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/5b842c0e.html"
    }
  },
  {
    "id": "1add3dd0",
    "name": "Cobra C3 Sidewinder",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/1add3dd0.html"
    }
  },
  {
    "id": "aee424c0",
    "name": "FAB 3* Profi / FAB 4* Profi",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/aee424c0.html"
    }
  },
  {
    "id": "2801996f",
    "name": "GEGE AP1000 / GEGE AP2000 / GEGE AP3000",
    "version": "5 pins",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/2801996f.html"
    }
  },
  {
    "id": "aa7fc00e",
    "name": "Gege pExtra / Alfa \"pExtra\"",
    "version": "5 pin",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/aa7fc00e.html"
    }
  },
  {
    "id": "959a6b9d",
    "name": "GOAL S",
    "version": "5 pins",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/959a6b9d.html"
    }
  },
  {
    "id": "08b5986d",
    "name": "IKON Sk6 vector",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/08b5986d.html"
    }
  },
  {
    "id": "9b94b1c0",
    "name": "iNAHO Tierkey",
    "version": "3 row, short format",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9b94b1c0.html"
    }
  },
  {
    "id": "ebcb29b9",
    "name": "Ingersoll 6 Lever Padlock",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/ebcb29b9.html"
    }
  },
  {
    "id": "5c2f5101",
    "name": "Kaba 8",
    "version": "2 row and 3 row, <9 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/5c2f5101.html"
    }
  },
  {
    "id": "40e50dd4",
    "name": "Kaken KX3",
    "version": "exterior, <6 sliders/wafers",
    "mechanisms": [
      "Pin-tumbler",
      "Slider",
      "Wafer"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/40e50dd4.html"
    }
  },
  {
    "id": "ab9df828",
    "name": "Kawaha Kawaha / Magmaus Magmaus",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/ab9df828.html"
    }
  },
  {
    "id": "331c9d36",
    "name": "Lockwood 334B45 / Lockwood 356S63 / Lockwood 214A40 / Lockwood 215A40 / Lockwood 270S70",
    "version": "with spools",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/331c9d36.html"
    }
  },
  {
    "id": "23c7988c",
    "name": "Medeco Biaxial",
    "version": "4 pins",
    "mechanisms": [
      "Pin-tumbler",
      "Sidebar"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/23c7988c.html"
    }
  },
  {
    "id": "0684a655",
    "name": "Medeco X4",
    "version": "Non-SFIC",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/0684a655.html"
    }
  },
  {
    "id": "c0af329b",
    "name": "Mindy Pagoda (round key)",
    "mechanisms": [
      "Pump/push"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c0af329b.html"
    }
  },
  {
    "id": "0418a174",
    "name": "Mul-T-Lock Classic",
    "version": "standard drivers",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/0418a174.html"
    }
  },
  {
    "id": "aec0c82d",
    "name": "Mul-T-Lock Classic / Mul-T-Lock Interactive",
    "version": "4 pins, 4 spooled drivers",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/aec0c82d.html"
    }
  },
  {
    "id": "a0ec1618",
    "name": "Mul-T-Lock Classic / Mul-T-Lock Interactive",
    "version": "5 pins, 3 or fewer spooled drivers",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/a0ec1618.html"
    }
  },
  {
    "id": "6e0bfdd2",
    "name": "Mul-T-Lock Integrator",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/6e0bfdd2.html"
    }
  },
  {
    "id": "1d80c9bb",
    "name": "Omellow R3",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/1d80c9bb.html"
    }
  },
  {
    "id": "fb5a9eb7",
    "name": "PACLOCK 90A Pro",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/fb5a9eb7.html"
    }
  },
  {
    "id": "74c225d1",
    "name": "PACLOCK PL410",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/74c225d1.html"
    }
  },
  {
    "id": "37dc53bb",
    "name": "SEGA Cam Lock",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/37dc53bb.html"
    }
  },
  {
    "id": "b0d2e04c",
    "name": "Takigen 10-pin / Takigen C288",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/b0d2e04c.html"
    }
  },
  {
    "id": "35330d19",
    "name": "Tokoz Tech",
    "mechanisms": [
      "Pin-tumbler",
      "Wafer"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/35330d19.html"
    }
  },
  {
    "id": "55511995",
    "name": "TrioVing 508 / Ving Vingcard 55##",
    "version": "with trampoline pins",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/55511995.html"
    }
  },
  {
    "id": "49c381dc",
    "name": "U-Shin Showa Mortise",
    "version": "6 spools, torpedo keypins",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/49c381dc.html"
    }
  },
  {
    "id": "95a9b042",
    "name": "U-Shin Showa X Key",
    "version": "8 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/95a9b042.html"
    }
  },
  {
    "id": "97c2b9be",
    "name": "VSR 2-row",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/97c2b9be.html"
    }
  },
  {
    "id": "fe088de0",
    "name": "Winkhaus Titan",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/fe088de0.html"
    }
  },
  {
    "id": "779e7dcb",
    "name": "Yale 500 / Yale B",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/779e7dcb.html"
    }
  },
  {
    "id": "c1e91978",
    "name": "Yale KM 1 star Superior",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c1e91978.html"
    }
  },
  {
    "id": "30a4fef5",
    "name": "Yale Superior / Yale Platinum / Millenco Magnum",
    "version": "<7 pins",
    "mechanisms": [
      "Dimple",
      "Slider"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/30a4fef5.html"
    }
  },
  {
    "id": "5e3397a9",
    "name": "Zeta Padlock",
    "version": "Models: ZR45, ZR55, ZU55",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Blue",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/5e3397a9.html"
    }
  },
  {
    "id": "c8259a23",
    "name": "Any SFIC format lock (unless otherwise specified)",
    "version": "**",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c8259a23.html"
    }
  },
  {
    "id": "dd1dd313",
    "name": "ABUS XP1 / ABUS TS5000",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/dd1dd313.html"
    }
  },
  {
    "id": "bbce33e0",
    "name": "Anchor Las Disc Detainer",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/bbce33e0.html"
    }
  },
  {
    "id": "ef221c67",
    "name": "ASSA 500 / Ruko 500",
    "version": "5 pin stacks, gin drivers and matching sleeve",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/ef221c67.html"
    }
  },
  {
    "id": "45e3cde7",
    "name": "ASSA 600 / ASSA Max+ Restricted / Ruko 600",
    "version": "Barrel spools and matching countermilling",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/45e3cde7.html"
    }
  },
  {
    "id": "039a239f",
    "name": "ASSA Desmo",
    "version": "6 sliders",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/039a239f.html"
    }
  },
  {
    "id": "f3666121",
    "name": "Avocet ABS / ERA Professional Cylinder / Federal Lock U-systems (UCF/UCH/UCS/UUS)-3100 / Thirard Federal S / Thirard Federal 2",
    "mechanisms": [
      "Dimple",
      "Magnet"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/f3666121.html"
    }
  },
  {
    "id": "8f004bf0",
    "name": "Bricard Chifral / ABUS EP10 / CISA RS3",
    "version": "all versions, <15 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/8f004bf0.html"
    }
  },
  {
    "id": "98ba98ae",
    "name": "Bricard Supersureté",
    "mechanisms": [
      "Wafer"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/98ba98ae.html"
    }
  },
  {
    "id": "ed9fa926",
    "name": "Burg Wächter Gamma 700",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/ed9fa926.html"
    }
  },
  {
    "id": "1f3a8ff9",
    "name": "Chubb Battleship",
    "version": "6 lever, offset key",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/1f3a8ff9.html"
    }
  },
  {
    "id": "8a0c4b07",
    "name": "Codkey Locksys",
    "version": "<15 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/8a0c4b07.html"
    }
  },
  {
    "id": "71bce5b7",
    "name": "Corbin Russwin Emhart",
    "version": "LFIC **",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/71bce5b7.html"
    }
  },
  {
    "id": "e8901d1c",
    "name": "Eagle \"Supr-Security\"",
    "version": "without shutter",
    "mechanisms": [
      "Wafer"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e8901d1c.html"
    }
  },
  {
    "id": "8c2983b5",
    "name": "EVVA DPI / EVVA DPS / EVVA DPX / EVVA EPS",
    "version": "slider version",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/8c2983b5.html"
    }
  },
  {
    "id": "93871dad",
    "name": "Fichet 450",
    "version": "no False gates",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/93871dad.html"
    }
  },
  {
    "id": "4cd09b3b",
    "name": "Gege pExtra / Alfa \"pExtra\"",
    "version": "6-7 pin",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/4cd09b3b.html"
    }
  },
  {
    "id": "3fbd7b3d",
    "name": "Godrej Ultra",
    "version": "14 pins in 3 rows",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/3fbd7b3d.html"
    }
  },
  {
    "id": "4ffe03a9",
    "name": "IKON SK6 vectorprofil rib extra",
    "version": "5 sliders",
    "mechanisms": [
      "Pin-tumbler",
      "Slider"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/4ffe03a9.html"
    }
  },
  {
    "id": "07bc680a",
    "name": "Illinois Duo",
    "mechanisms": [
      "Wafer"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/07bc680a.html"
    }
  },
  {
    "id": "c11aca1a",
    "name": "Ingersoll 10 lever padlock",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c11aca1a.html"
    }
  },
  {
    "id": "06ddb074",
    "name": "Kwikset Smartkey (Gen III)",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/06ddb074.html"
    }
  },
  {
    "id": "434b5b25",
    "name": "LIPS Keso padlock",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/434b5b25.html"
    }
  },
  {
    "id": "9982c0eb",
    "name": "Lockman Megacross",
    "version": "9-pins, mushroom drivers",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9982c0eb.html"
    }
  },
  {
    "id": "71833308",
    "name": "Lockwood Twin",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/71833308.html"
    }
  },
  {
    "id": "8f7f1830",
    "name": "Master Lock #19",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/8f7f1830.html"
    }
  },
  {
    "id": "aeaa6a09",
    "name": "Medeco Original Camlock",
    "version": "≥ 5 pins ******",
    "mechanisms": [
      "Slider",
      "Sidebar"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/aeaa6a09.html"
    }
  },
  {
    "id": "826c31e0",
    "name": "Medeco Original / Medeco Biaxial / Medeco M3 / Chubb Biaxial",
    "version": "≥ 5 pins ******",
    "mechanisms": [
      "Sidebar",
      "Pin-tumbler"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/826c31e0.html"
    }
  },
  {
    "id": "06a28ac7",
    "name": "Mindy Pagoda AF 16-50",
    "version": "flat key",
    "mechanisms": [
      "Pump/push"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/06a28ac7.html"
    }
  },
  {
    "id": "62520bea",
    "name": "Mottura Champions C38",
    "version": "*******",
    "mechanisms": [
      "Dimple",
      "Magnet"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/62520bea.html"
    }
  },
  {
    "id": "fd2b533e",
    "name": "Mul-T-Lock Classic Pro / Mul-T-Lock 400",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/fd2b533e.html"
    }
  },
  {
    "id": "48323cde",
    "name": "Mul-T-Lock Classic / Mul-T-Lock Interactive",
    "version": "4 pins, 4 serrated drivers",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/48323cde.html"
    }
  },
  {
    "id": "1110ef61",
    "name": "Mul-T-Lock Gamma",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/1110ef61.html"
    }
  },
  {
    "id": "3335df97",
    "name": "Mul-T-Lock Jr / Mul-T-Lock Classic / Mul-T-Lock Interactive",
    "version": "5 pin stacks, ≥ 4 spooled drivers",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/3335df97.html"
    }
  },
  {
    "id": "16906a6c",
    "name": "Mul-T-Lock MT5 / Mul-T-Lock MTL 500",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/16906a6c.html"
    }
  },
  {
    "id": "8a65b956",
    "name": "Mul-T-Lock Omega Plus",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/8a65b956.html"
    }
  },
  {
    "id": "6d754a0a",
    "name": "Rielda rekeyable lock",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/6d754a0a.html"
    }
  },
  {
    "id": "6dd5a34b",
    "name": "Ruko Combi 900",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/6dd5a34b.html"
    }
  },
  {
    "id": "e1e595b9",
    "name": "Sargent Signature",
    "mechanisms": [
      "Pin-tumbler",
      "Sidebar"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e1e595b9.html"
    }
  },
  {
    "id": "3dabf132",
    "name": "Schlage Everest 29SL",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/3dabf132.html"
    }
  },
  {
    "id": "8307d77f",
    "name": "U-Shin Showa X Key",
    "version": "12 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/8307d77f.html"
    }
  },
  {
    "id": "1be10736",
    "name": "Yale 5000",
    "mechanisms": [
      "Pin-tumbler",
      "Slider"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/1be10736.html"
    }
  },
  {
    "id": "ebe9ee59",
    "name": "Yale Superior / Yale Platinum / Millenco Magnum",
    "version": "7 or 9 pins",
    "mechanisms": [
      "Dimple",
      "Slider"
    ],
    "belt": "Purple",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/ebe9ee59.html"
    }
  },
  {
    "id": "b13f4b57",
    "name": "Any SFIC with security pins",
    "version": "**",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/b13f4b57.html"
    }
  },
  {
    "id": "da09d849",
    "name": "Abloy Classic",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/da09d849.html"
    }
  },
  {
    "id": "b8350900",
    "name": "ABUS Plus",
    "version": "no butterfly discs",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/b8350900.html"
    }
  },
  {
    "id": "da8331ef",
    "name": "ABUS XP20s / ABUS XP2s / ABUS XP2 / CISA AP3 / CISA AP4S / Bricard XP S2 / Bricard Mistral S",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/da8331ef.html"
    }
  },
  {
    "id": "d3ad5a73",
    "name": "ASSA d12 / ASSA P600 / ASSA Neptun 1900 / Ruko Merkur / TrioVing d12 level 1 / Ruko 1200",
    "version": "barrel drivers, forked keypins, optional long pin",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/d3ad5a73.html"
    }
  },
  {
    "id": "1459e2c6",
    "name": "ASSA Desmo",
    "version": "8 sliders, no mastered pins",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/1459e2c6.html"
    }
  },
  {
    "id": "93c49314",
    "name": "ASSA Desmo RCX",
    "version": "10 sliders, no mastered pins",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/93c49314.html"
    }
  },
  {
    "id": "33d6e0df",
    "name": "Australian Lock Co. Galaxy",
    "mechanisms": [
      "Pump/push"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/33d6e0df.html"
    }
  },
  {
    "id": "e38d015b",
    "name": "Burg Wächter Alpha 800",
    "mechanisms": [
      "Wafer"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e38d015b.html"
    }
  },
  {
    "id": "bc03135a",
    "name": "Codkey Locksys",
    "version": "≥15 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/bc03135a.html"
    }
  },
  {
    "id": "61247b32",
    "name": "DOM System D",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/61247b32.html"
    }
  },
  {
    "id": "33588917",
    "name": "Eagle \"Supr-Security\" (with shutter)",
    "mechanisms": [
      "Wafer"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/33588917.html"
    }
  },
  {
    "id": "58cbc037",
    "name": "Fichet 450 / Fichet 484",
    "version": "with False gates, 4-6 mastered levers",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/58cbc037.html"
    }
  },
  {
    "id": "9c627ebd",
    "name": "Fichet 666",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9c627ebd.html"
    }
  },
  {
    "id": "86e86a1d",
    "name": "FTH Thirard Cobra",
    "mechanisms": [
      "Pump/push"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/86e86a1d.html"
    }
  },
  {
    "id": "7298a640",
    "name": "Fuki Tierkey",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/7298a640.html"
    }
  },
  {
    "id": "594b1a1c",
    "name": "Gerda HSS",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/594b1a1c.html"
    }
  },
  {
    "id": "7194cc26",
    "name": "GOAL D9",
    "version": "9 pin",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/7194cc26.html"
    }
  },
  {
    "id": "a1233156",
    "name": "GOAL P",
    "version": "6 pin",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/a1233156.html"
    }
  },
  {
    "id": "f38cafca",
    "name": "IKON TK5 sperwellenprofil",
    "version": "with smooth fingerpins",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/f38cafca.html"
    }
  },
  {
    "id": "9659ad59",
    "name": "iNAHO Tierkey",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9659ad59.html"
    }
  },
  {
    "id": "1ee01369",
    "name": "JPM 405",
    "mechanisms": [
      "Pump/push"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/1ee01369.html"
    }
  },
  {
    "id": "f61461ed",
    "name": "Kaba 14",
    "version": "<13 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/f61461ed.html"
    }
  },
  {
    "id": "41b91a0e",
    "name": "Kaba Ace",
    "version": "<13 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/41b91a0e.html"
    }
  },
  {
    "id": "e0191c45",
    "name": "Kaba Gemini",
    "version": "<13 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e0191c45.html"
    }
  },
  {
    "id": "2efc9257",
    "name": "Kaba Gemini pluS",
    "version": "<14 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/2efc9257.html"
    }
  },
  {
    "id": "9375df98",
    "name": "Kaken KXR",
    "mechanisms": [
      "Slider",
      "Pin-tumbler"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9375df98.html"
    }
  },
  {
    "id": "660a840e",
    "name": "Kale Kilit 164 CEC",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/660a840e.html"
    }
  },
  {
    "id": "b8783269",
    "name": "Mauer NW4 / Mauer NW5 / Mauer NW6",
    "mechanisms": [
      "Dimple",
      "Wafer"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/b8783269.html"
    }
  },
  {
    "id": "848940e5",
    "name": "Medeco Duracam",
    "version": "***",
    "mechanisms": [
      "Dimple",
      "Slider",
      "Sidebar"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/848940e5.html"
    }
  },
  {
    "id": "05f9773b",
    "name": "Medeco Original / Medeco Biaxial / Medeco M3 / Chubb Biaxial",
    "version": "≥ 6 pin with ≥ 4 key pins with false gates",
    "mechanisms": [
      "Sidebar",
      "Pin-tumbler"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/05f9773b.html"
    }
  },
  {
    "id": "2bf9f60e",
    "name": "MIWA PS / Tostem DN",
    "version": "<7 unmastered wafers",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/2bf9f60e.html"
    }
  },
  {
    "id": "fd5a5246",
    "name": "Mul-T-Lock 700",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/fd5a5246.html"
    }
  },
  {
    "id": "5c5701d7",
    "name": "Mul-T-Lock Classic / Mul-T-Lock Interactive",
    "version": "5 pin stacks, 5 serrated drivers",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/5c5701d7.html"
    }
  },
  {
    "id": "94ee12b7",
    "name": "Robur 2391 Safe Deposit Lock",
    "version": "<3 barrels or gins with matched milling",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/94ee12b7.html"
    }
  },
  {
    "id": "ea1afad0",
    "name": "Schlage Primus / Schlage Everest Primus",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/ea1afad0.html"
    }
  },
  {
    "id": "626da374",
    "name": "Scorpion CX-5 / Marks High Security Lock",
    "mechanisms": [
      "Pin-tumbler",
      "Slider"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/626da374.html"
    }
  },
  {
    "id": "b91890bf",
    "name": "U-Shin Showa NX",
    "version": "<13 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/b91890bf.html"
    }
  },
  {
    "id": "506b242a",
    "name": "Van Lock",
    "mechanisms": [
      "Pump/push"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/506b242a.html"
    }
  },
  {
    "id": "dd764207",
    "name": "VSR 3-row",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/dd764207.html"
    }
  },
  {
    "id": "93e4cf5f",
    "name": "Walsall Locks 2000",
    "version": "5 lever",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/93e4cf5f.html"
    }
  },
  {
    "id": "18e1f45b",
    "name": "WEST 916 / WEST 955",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/18e1f45b.html"
    }
  },
  {
    "id": "9d865bcd",
    "name": "Winkhaus X-Tra",
    "version": "<9 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Brown",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9d865bcd.html"
    }
  },
  {
    "id": "87eaa964",
    "name": "Abloy Disklock",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/87eaa964.html"
    }
  },
  {
    "id": "e92d29ad",
    "name": "Abloy High Profile",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e92d29ad.html"
    }
  },
  {
    "id": "b29a8b44",
    "name": "ABUS EC700 / ABUS EC800",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/b29a8b44.html"
    }
  },
  {
    "id": "b8350901",
    "name": "ABUS Plus",
    "version": "with butterfly discs",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/b8350901.html"
    }
  },
  {
    "id": "29ab2852",
    "name": "ASSA 600 / Ruko 600",
    "version": "6 pin, with gin spools and matched countermilling",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/29ab2852.html"
    }
  },
  {
    "id": "e3bd3faf",
    "name": "ASSA 700",
    "version": "7 pin, with gin/tree pins and matching countermilling in ≥ 4 chambers, < 2 tree pins",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e3bd3faf.html"
    }
  },
  {
    "id": "9eb3e9c4",
    "name": "Banham m2002",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9eb3e9c4.html"
    }
  },
  {
    "id": "3af2407a",
    "name": "BKS Janus",
    "version": "< 13 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/3af2407a.html"
    }
  },
  {
    "id": "c640fe2c",
    "name": "Bramah Modern 7 Wafer",
    "mechanisms": [
      "Pump/push"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c640fe2c.html"
    }
  },
  {
    "id": "9bb97454",
    "name": "CISM Atlas",
    "mechanisms": [
      "Magnet",
      "Pump/push"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9bb97454.html"
    }
  },
  {
    "id": "7c6efd49",
    "name": "Codkey Locksys L52",
    "version": "factory split core, 24 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/7c6efd49.html"
    }
  },
  {
    "id": "c4f942f0",
    "name": "Corbin Russwin Emhart",
    "version": "6 pins **",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c4f942f0.html"
    }
  },
  {
    "id": "6b06f591",
    "name": "DOM ix Saturn / INN Key Smart",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/6b06f591.html"
    }
  },
  {
    "id": "4993a918",
    "name": "DOM RS 8 / Dorma RS 8",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/4993a918.html"
    }
  },
  {
    "id": "265226b1",
    "name": "EVVA 3KS / EVVA 3KS+ / EVVA 4KS",
    "version": "without False gates or 1-3 mastered sliders",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/265226b1.html"
    }
  },
  {
    "id": "00b569f2",
    "name": "EVVA Dual",
    "version": ">4 mastered elements",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/00b569f2.html"
    }
  },
  {
    "id": "6852489f",
    "name": "EVVA ICS",
    "version": ">2 mastered elements",
    "mechanisms": [
      "Slider",
      "Pin-tumbler"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/6852489f.html"
    }
  },
  {
    "id": "03cbfaa5",
    "name": "Fichet 450 / Fichet 484",
    "version": "w/ False gates, 2-3 mastered levers",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/03cbfaa5.html"
    }
  },
  {
    "id": "9d7faa15",
    "name": "Fontaine Dynaxis",
    "mechanisms": [
      "Pump/push"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9d7faa15.html"
    }
  },
  {
    "id": "a57c1e9b",
    "name": "FTH Thirard Pacific",
    "mechanisms": [
      "Pump/push"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/a57c1e9b.html"
    }
  },
  {
    "id": "9f613c4a",
    "name": "GOAL V18 / GOAL GP",
    "version": "<14 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9f613c4a.html"
    }
  },
  {
    "id": "49b2c746",
    "name": "Hori Trident",
    "version": "spools",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/49b2c746.html"
    }
  },
  {
    "id": "66d1ab72",
    "name": "IKON SK6 Sperrwelleprofil",
    "version": "4 Serrated Fingerpins, Non-Chamfered Sidebar",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/66d1ab72.html"
    }
  },
  {
    "id": "34d27803",
    "name": "IKON TK5 sperwellenprofil",
    "version": "with serrated fingerpins",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/34d27803.html"
    }
  },
  {
    "id": "843896be",
    "name": "IKON Verso",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/843896be.html"
    }
  },
  {
    "id": "aa4c402d",
    "name": "Kaba 14",
    "version": "13+ pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/aa4c402d.html"
    }
  },
  {
    "id": "eed91da5",
    "name": "Kaba 20 / MIWA JN / Kaba Star",
    "version": "4 directions, < 15 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/eed91da5.html"
    }
  },
  {
    "id": "434bdf9d",
    "name": "Kaba Ace",
    "version": "≥13 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/434bdf9d.html"
    }
  },
  {
    "id": "0770580d",
    "name": "Kaba experT / Kaba Quattro",
    "version": "<15 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/0770580d.html"
    }
  },
  {
    "id": "c8e86f14",
    "name": "Kaba Gemini",
    "version": "≥13 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c8e86f14.html"
    }
  },
  {
    "id": "c4484574",
    "name": "Kaba Gemini pluS",
    "version": "≥14 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c4484574.html"
    }
  },
  {
    "id": "e3081fd3",
    "name": "Kaba Penta / Kaba Penta Cross",
    "version": "<15 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e3081fd3.html"
    }
  },
  {
    "id": "43deff29",
    "name": "Kaba Star",
    "version": "5+ directions, <16 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/43deff29.html"
    }
  },
  {
    "id": "deb35ee7",
    "name": "Keso 8000Ω² / Keso 6000 FP2",
    "version": ">= 13 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/deb35ee7.html"
    }
  },
  {
    "id": "281aa393",
    "name": "Kromer Novum",
    "version": "8 levers",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/281aa393.html"
    }
  },
  {
    "id": "00a2ff18",
    "name": "Medeco M4",
    "mechanisms": [
      "Pin-tumbler",
      "Slider",
      "Sidebar"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/00a2ff18.html"
    }
  },
  {
    "id": "814c5368",
    "name": "MIWA LS7",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/814c5368.html"
    }
  },
  {
    "id": "fdb68dc4",
    "name": "MIWA PR",
    "version": "<7 unmastered levers",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/fdb68dc4.html"
    }
  },
  {
    "id": "550a0c9d",
    "name": "MIWA PS / Tostem DN",
    "version": "7-8 unmastered levers",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/550a0c9d.html"
    }
  },
  {
    "id": "31cd85d7",
    "name": "MIWA SR",
    "mechanisms": [
      "Wafer"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/31cd85d7.html"
    }
  },
  {
    "id": "31431c49",
    "name": "MIWA U9 / MIWA UR",
    "version": "<8 unmastered levers, barred False gates (old shallow False gates counts as Brown Belt)",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/31431c49.html"
    }
  },
  {
    "id": "3daff112",
    "name": "Mottura Champions C55 / Mottura Champions CP6",
    "mechanisms": [
      "Dimple",
      "Rotors",
      "Trap Pins"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/3daff112.html"
    }
  },
  {
    "id": "fa0b5d10",
    "name": "Mul-T-Lock MT5+ Short",
    "version": "4 drivers, 4 sliders",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/fa0b5d10.html"
    }
  },
  {
    "id": "9c5f4539",
    "name": "Picard Vigie / Heracles Pericles",
    "version": "7 pins, euro profile",
    "mechanisms": [
      "Pump/push"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9c5f4539.html"
    }
  },
  {
    "id": "9da7a5f2",
    "name": "Robur 2391 Safe Deposit Lock",
    "version": "barrels ≥ 3 chambers with matched milling",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9da7a5f2.html"
    }
  },
  {
    "id": "112d0034",
    "name": "Robur 2391 Safe Deposit Lock",
    "version": "gins ≥ 3 chambers with matched milling",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/112d0034.html"
    }
  },
  {
    "id": "4a7db3c6",
    "name": "Rosengrens 32A / Rosengrens 32A8",
    "version": "thin round center posts, few or no False gates",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/4a7db3c6.html"
    }
  },
  {
    "id": "2ff8a738",
    "name": "S&G 4440 series",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/2ff8a738.html"
    }
  },
  {
    "id": "cf76cfde",
    "name": "Schlage Everest 29 SL Primus XP",
    "mechanisms": [
      "Slider",
      "Sidepins"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/cf76cfde.html"
    }
  },
  {
    "id": "95281228",
    "name": "U-Shin Showa NX",
    "version": "≥ 13 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/95281228.html"
    }
  },
  {
    "id": "131732a0",
    "name": "Winkhaus X-Tra",
    "version": "9-13 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/131732a0.html"
    }
  },
  {
    "id": "6708838f",
    "name": "Xylok",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/6708838f.html"
    }
  },
  {
    "id": "5eac6a29",
    "name": "Yanai R 2200M",
    "version": "<14 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Red",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/5eac6a29.html"
    }
  },
  {
    "id": "1a7a23d4",
    "name": "Abloy Disklock Pro / Abloy Novel",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/1a7a23d4.html"
    }
  },
  {
    "id": "12ff8c25",
    "name": "Abloy Easy",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/12ff8c25.html"
    }
  },
  {
    "id": "fc627b17",
    "name": "Abloy Exec",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/fc627b17.html"
    }
  },
  {
    "id": "e87f0ca2",
    "name": "Abloy Protec2",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Black",
    "beltLevel": "Black 3",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e87f0ca2.html"
    }
  },
  {
    "id": "cad3eff0",
    "name": "Abloy Sento",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/cad3eff0.html"
    }
  },
  {
    "id": "2ae6a691",
    "name": "Abloy Sentry",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/2ae6a691.html"
    }
  },
  {
    "id": "f133510b",
    "name": "ASSA 700",
    "version": "gin/tree pins and matching countermilling in ≥ 4 chambers, ≥ 2 tree pins",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/f133510b.html"
    }
  },
  {
    "id": "6e59ba12",
    "name": "ASSA dp4400 / ASSA dp11 / TrioVing dp / Ruko Garant+",
    "version": "6 pin with 10 sliders",
    "mechanisms": [
      "Pin-tumbler",
      "Slider"
    ],
    "belt": "Black",
    "beltLevel": "Black 3",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/6e59ba12.html"
    }
  },
  {
    "id": "104776ef",
    "name": "ASSA Twin 6000",
    "version": "gin drivers, 6 stacks with 5 side pins",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/104776ef.html"
    }
  },
  {
    "id": "7168d463",
    "name": "ASSA Twin Combi / ASSA Triton / ASSA Neptun 4900 / TrioVing Twin Control",
    "version": "6 pin with 5 finger pins",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/7168d463.html"
    }
  },
  {
    "id": "55053299",
    "name": "ASSA Twin Exclusive / ASSA Twin 6000",
    "version": "6 barrel drivers, 5 side pins",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/55053299.html"
    }
  },
  {
    "id": "3f73d2ce",
    "name": "ASSA Twin Maximum / ASSA Twin Pro / ASSA Twin v10 / ASSA Twin 2 / ASSA Twin Global",
    "version": "barrel driver, 6 stacks with 5 side pins",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/3f73d2ce.html"
    }
  },
  {
    "id": "c8694f3a",
    "name": "ASSA Twin v10",
    "version": "gin drivers, 6 stacks with 5 side pins",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c8694f3a.html"
    }
  },
  {
    "id": "ab1e901f",
    "name": "Australian Lock Co. BiLock",
    "version": "12 sliders, 0 mastered",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/ab1e901f.html"
    }
  },
  {
    "id": "6d2555aa",
    "name": "Australian Lock Co. BiLock Exclusive",
    "version": "picked to control",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/6d2555aa.html"
    }
  },
  {
    "id": "f09ce6b3",
    "name": "BKS Janus",
    "version": "13 or more pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/f09ce6b3.html"
    }
  },
  {
    "id": "78336fc0",
    "name": "Bowley Door Lock",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/78336fc0.html"
    }
  },
  {
    "id": "c6a14e93",
    "name": "CAWI 7113 / CAWI 7123",
    "mechanisms": [
      "Wafer"
    ],
    "belt": "Black",
    "beltLevel": "Black 3",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c6a14e93.html"
    }
  },
  {
    "id": "2181e10d",
    "name": "Chatwood Invincible",
    "version": "Single Bitted",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Black",
    "beltLevel": "Black 5",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/2181e10d.html"
    }
  },
  {
    "id": "2db935ea",
    "name": "Chubb \"Definitive\"",
    "version": "jewelry box (steel comb leaf spring, pin or pipe key)",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Black",
    "beltLevel": "Black 4",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/2db935ea.html"
    }
  },
  {
    "id": "c266d57b",
    "name": "Corbin Russwin Emhart",
    "version": "≥ 2 mastered chambers **",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c266d57b.html"
    }
  },
  {
    "id": "57fbcb1b",
    "name": "DOM Diamant",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/57fbcb1b.html"
    }
  },
  {
    "id": "3c73c705",
    "name": "DOM ix Twinstar",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/3c73c705.html"
    }
  },
  {
    "id": "f7452b9f",
    "name": "EVVA 3KS / EVVA 3KS+",
    "version": "false gates and no mastered sliders",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/f7452b9f.html"
    }
  },
  {
    "id": "1e197456",
    "name": "EVVA Dual",
    "version": "1-4 mastered elements",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/1e197456.html"
    }
  },
  {
    "id": "533c7408",
    "name": "EVVA Dual",
    "version": "0 (zero) mastered elements",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/533c7408.html"
    }
  },
  {
    "id": "db749615",
    "name": "EVVA ICS",
    "version": "1-2 mastered elements",
    "mechanisms": [
      "Slider",
      "Pin-tumbler"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/db749615.html"
    }
  },
  {
    "id": "8ea170d2",
    "name": "EVVA ICS",
    "version": "0 (zero) mastered elements",
    "mechanisms": [
      "Pin-tumbler",
      "Slider"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/8ea170d2.html"
    }
  },
  {
    "id": "5ab25363",
    "name": "EVVA MCS gen 1 / EVVA MCS gen 2 / IKON M",
    "version": "with up to 5 additional gates for mastering",
    "mechanisms": [
      "Magnet",
      "Pin-tumbler"
    ],
    "belt": "Black",
    "beltLevel": "Black 3",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/5ab25363.html"
    }
  },
  {
    "id": "4abcb403",
    "name": "Fichet 450 / Fichet 484",
    "version": "false gates, 1 mastered lever",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/4abcb403.html"
    }
  },
  {
    "id": "340154fa",
    "name": "Fichet 450 / Fichet 484",
    "version": "w/ False gates, 0 mastered levers",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/340154fa.html"
    }
  },
  {
    "id": "10ab07eb",
    "name": "Fichet 787",
    "version": "no blocker",
    "mechanisms": [
      "Pump/push",
      "Lever/sidebar"
    ],
    "belt": "Black",
    "beltLevel": "Black 3",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/10ab07eb.html"
    }
  },
  {
    "id": "c0af45f4",
    "name": "Fichet F3D",
    "version": "outside cylinder - upgrade of indoor cylinder",
    "mechanisms": [
      "Pump/push"
    ],
    "belt": "Black",
    "beltLevel": "Black 5",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c0af45f4.html"
    }
  },
  {
    "id": "f048719a",
    "name": "Fichet-Bauche M2B / Fichet-Bauche M3B",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/f048719a.html"
    }
  },
  {
    "id": "3ca098da",
    "name": "GOAL Grand V",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 3",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/3ca098da.html"
    }
  },
  {
    "id": "63b2e02b",
    "name": "GOAL V18 / GOAL GP",
    "version": "14-16 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/63b2e02b.html"
    }
  },
  {
    "id": "109531f4",
    "name": "GOAL V18 / GOAL GP",
    "version": "≥17 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/109531f4.html"
    }
  },
  {
    "id": "5103e650",
    "name": "GOAL Z",
    "version": "< 2 standard drivers",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/5103e650.html"
    }
  },
  {
    "id": "e8c7dd5b",
    "name": "Hori Trident",
    "version": "T-spool drivers",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e8c7dd5b.html"
    }
  },
  {
    "id": "108549ba",
    "name": "IKON SK6 Sperrwelle Extra Code",
    "version": "6 pin with 5 finger pins",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/108549ba.html"
    }
  },
  {
    "id": "c9494ee8",
    "name": "IKON WSW",
    "version": "7 sliders, upgrade of WSW with 5 sliders",
    "mechanisms": [
      "Pin-tumbler",
      "Slider"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c9494ee8.html"
    }
  },
  {
    "id": "0082fa4c",
    "name": "JPM Surf / Ruko Combi Plus",
    "version": "6 pin with 5 side pins with 3 possible heights each",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/0082fa4c.html"
    }
  },
  {
    "id": "8f99236e",
    "name": "Kaba 20 / MIWA JN / Kaba Star",
    "version": "4 directions, ≥ 15 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/8f99236e.html"
    }
  },
  {
    "id": "7d5c53c4",
    "name": "Kaba Matrix",
    "version": "16 pins (fully pinned)",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/7d5c53c4.html"
    }
  },
  {
    "id": "68b5a797",
    "name": "Kaba Penta / Kaba Penta Cross",
    "version": "15-20 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/68b5a797.html"
    }
  },
  {
    "id": "bc1509f5",
    "name": "Kaba Penta / Kaba Penta Cross",
    "version": "21 or more pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/bc1509f5.html"
    }
  },
  {
    "id": "f7b52501",
    "name": "Kaba Quattro / Kaba experT",
    "version": "15-20 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/f7b52501.html"
    }
  },
  {
    "id": "10968d37",
    "name": "Kaba Quattro / Kaba experT",
    "version": "21 or more pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/10968d37.html"
    }
  },
  {
    "id": "3ddfc71c",
    "name": "Kaba Star",
    "version": "≥ 5 rows, 16-20 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/3ddfc71c.html"
    }
  },
  {
    "id": "dfa88b94",
    "name": "Kaba Star",
    "version": "≥ 5 rows, 21 or more pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/dfa88b94.html"
    }
  },
  {
    "id": "d54a6b5f",
    "name": "Kaba Titan / Kaba Aura / Kaba Titancombi",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/d54a6b5f.html"
    }
  },
  {
    "id": "f87db705",
    "name": "Kromer Protector (BP55K)",
    "mechanisms": [
      "Wafer"
    ],
    "belt": "Black",
    "beltLevel": "Black 5",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/f87db705.html"
    }
  },
  {
    "id": "50a463eb",
    "name": "Kromer Protector (Non-BP55K)",
    "mechanisms": [
      "Wafer"
    ],
    "belt": "Black",
    "beltLevel": "Black 5",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/50a463eb.html"
    }
  },
  {
    "id": "f1857cef",
    "name": "Lockman Megacross",
    "version": "with pyramid drivers",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/f1857cef.html"
    }
  },
  {
    "id": "a2bd7f1e",
    "name": "MIWA LB",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/a2bd7f1e.html"
    }
  },
  {
    "id": "f0e31f32",
    "name": "MIWA LS10",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/f0e31f32.html"
    }
  },
  {
    "id": "d0c510c5",
    "name": "MIWA PR",
    "version": "7-8 unmastered elements",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/d0c510c5.html"
    }
  },
  {
    "id": "21b61a85",
    "name": "MIWA PR",
    "version": "9-10 unmastered elements",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/21b61a85.html"
    }
  },
  {
    "id": "91f40022",
    "name": "MIWA PR",
    "version": "11 unmastered elements",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Black",
    "beltLevel": "Black 3",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/91f40022.html"
    }
  },
  {
    "id": "71c7270b",
    "name": "MIWA U9",
    "version": "8 unmastered elements, barred False gates (old shallow False gates counts as Red Belt)",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/71c7270b.html"
    }
  },
  {
    "id": "d1272b9f",
    "name": "MIWA U9",
    "version": "9 unmastered elements, barred False gates (old shallow False gates counts as BB1)",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/d1272b9f.html"
    }
  },
  {
    "id": "ccdbffbf",
    "name": "MIWA WR",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/ccdbffbf.html"
    }
  },
  {
    "id": "ae7d3780",
    "name": "Mottura Champions C43 / Mottura Champions C43 Plus / Mottura Champions C44 / Mottura Champions C48 / Mottura Champions C9P",
    "mechanisms": [
      "Dimple",
      "Rotors"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/ae7d3780.html"
    }
  },
  {
    "id": "649eaebc",
    "name": "Mul-T-Lock MT5+ / Mul-T-Lock 800 / Lockwood MT5 / IKON R10",
    "version": "not mastered",
    "mechanisms": [
      "Dimple",
      "Slider"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/649eaebc.html"
    }
  },
  {
    "id": "4f2ed774",
    "name": "NATO Mersey",
    "version": "10 lever",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Black",
    "beltLevel": "Black 5",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/4f2ed774.html"
    }
  },
  {
    "id": "f29a212f",
    "name": "NATO Mersey",
    "version": "14 lever",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Black",
    "beltLevel": "Black 5",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/f29a212f.html"
    }
  },
  {
    "id": "6c0ec943",
    "name": "Opnus Memolis",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Black",
    "beltLevel": "Black 4",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/6c0ec943.html"
    }
  },
  {
    "id": "e151c916",
    "name": "Opnus MMXII",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Black",
    "beltLevel": "Black 4",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e151c916.html"
    }
  },
  {
    "id": "5cba063b",
    "name": "Robur Disc Detainer Safe Deposit Lock",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/5cba063b.html"
    }
  },
  {
    "id": "db63c882",
    "name": "Rosengrens 32A81S / Rosengrens 32C81P",
    "version": "triangular central posts and many False gates",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/db63c882.html"
    }
  },
  {
    "id": "63a9a2b1",
    "name": "Ruko Combi 2 / Ruko Garant 10 / FAB Variant",
    "version": "6 pin with 5 finger pins",
    "mechanisms": [
      "Pin-tumbler",
      "Sidepins"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/63a9a2b1.html"
    }
  },
  {
    "id": "00cf7717",
    "name": "Sargent Keso",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/00cf7717.html"
    }
  },
  {
    "id": "3198fffc",
    "name": "Tokoz Pro",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/3198fffc.html"
    }
  },
  {
    "id": "e4bb0668",
    "name": "UrbanAlps Stealth Key SK1",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e4bb0668.html"
    }
  },
  {
    "id": "284bf0b0",
    "name": "UrbanAlps Stealth Key SK2",
    "mechanisms": [
      "Lever/sidebar"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/284bf0b0.html"
    }
  },
  {
    "id": "23437955",
    "name": "WEST 917",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/23437955.html"
    }
  },
  {
    "id": "ca6c2e4c",
    "name": "WEST 941",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 3",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/ca6c2e4c.html"
    }
  },
  {
    "id": "e718b140",
    "name": "Western Electric 30B",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Black",
    "beltLevel": "Black 5",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e718b140.html"
    }
  },
  {
    "id": "5a4310d5",
    "name": "Western Electric 30C",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Black",
    "beltLevel": "Black 5",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/5a4310d5.html"
    }
  },
  {
    "id": "d1a5cd90",
    "name": "Winkhaus X-Tra",
    "version": "≥13 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/d1a5cd90.html"
    }
  },
  {
    "id": "a8e79394",
    "name": "Yanai R 2200M",
    "version": ">= 17 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 2",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/a8e79394.html"
    }
  },
  {
    "id": "a974eb0c",
    "name": "Yanai R 2200M",
    "version": "14-16 pins",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Black",
    "beltLevel": "Black 1",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/a974eb0c.html"
    }
  },
  {
    "id": "0b604114",
    "name": "Yuema 750 series / Forte Enigma",
    "mechanisms": [
      "Slider"
    ],
    "belt": "Black",
    "beltLevel": "Black 5",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/0b604114.html"
    }
  },
  {
    "id": "a2bccc4b",
    "name": "Bode Panzer Tangential",
    "mechanisms": [
      "Wafer"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/a2bccc4b.html"
    }
  },
  {
    "id": "e35a3c91",
    "name": "Bovii LOTO",
    "version": "dimple lock",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e35a3c91.html"
    }
  },
  {
    "id": "b1949215",
    "name": "Bowley 543",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/b1949215.html"
    }
  },
  {
    "id": "e35772c9",
    "name": "Bowley Rotasera",
    "mechanisms": [],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e35772c9.html"
    }
  },
  {
    "id": "25809d7e",
    "name": "Enclave",
    "version": "Andrew Magill",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/25809d7e.html"
    }
  },
  {
    "id": "89207b78",
    "name": "Folger Adam 80",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/89207b78.html"
    }
  },
  {
    "id": "e6872b30",
    "name": "Mindy AF 8-50 smiley dimple padlock",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e6872b30.html"
    }
  },
  {
    "id": "4150776b",
    "name": "MIWA Star Orion",
    "version": "6 rows",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/4150776b.html"
    }
  },
  {
    "id": "e66bce0b",
    "name": "Mul-T-Lock 600",
    "version": "aka Interactive+",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e66bce0b.html"
    }
  },
  {
    "id": "c6cd3574",
    "name": "Opnus Tex",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/c6cd3574.html"
    }
  },
  {
    "id": "f5086cb9",
    "name": "Pollux 7000",
    "mechanisms": [
      "Pump/push"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/f5086cb9.html"
    }
  },
  {
    "id": "6cb514ea",
    "name": "Ri-Key High Security (MTL clone)",
    "mechanisms": [
      "Dimple"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/6cb514ea.html"
    }
  },
  {
    "id": "9b528165",
    "name": "Rosengrens 24K",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9b528165.html"
    }
  },
  {
    "id": "5646568c",
    "name": "Rosengrens RKL-10",
    "mechanisms": [],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/5646568c.html"
    }
  },
  {
    "id": "a72739bc",
    "name": "Schlage Cor-Key / Keiden M40",
    "mechanisms": [
      "Magnet"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/a72739bc.html"
    }
  },
  {
    "id": "cdfac03d",
    "name": "Segal PickProof",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/cdfac03d.html"
    }
  },
  {
    "id": "1b6eea7f",
    "name": "Tokoz Alpha",
    "mechanisms": [
      "Wafer"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/1b6eea7f.html"
    }
  },
  {
    "id": "9d35efa9",
    "name": "U-Change",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/9d35efa9.html"
    }
  },
  {
    "id": "89c7446c",
    "name": "Western Electric 30A",
    "version": "Very similar to 30B, but can't tension plug",
    "mechanisms": [
      "Lever"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/89c7446c.html"
    }
  },
  {
    "id": "e16080de",
    "name": "Yale Bicentric",
    "mechanisms": [
      "Pin-tumbler"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/e16080de.html"
    }
  },
  {
    "id": "074db05e",
    "name": "Zarker J55/J55S",
    "mechanisms": [
      "Disc detainer"
    ],
    "belt": "Unranked",
    "resourceLinks": {
      "lpu": "https://lpubelts.com/locks/074db05e.html"
    }
  }
];

const ownedLockIds = new Set([
  "901b35b2",
  "2455f0ae",
  "40f7d7c7",
  "632f4069",
  "74a00ae3",
  "e1625c4d",
  "2ae1e0b8",
  "4f6bcdb7",
  "c6529d9c",
  "85d93eb1",
  "959a6b9d",
  "331c9d36",
  "fb5a9eb7",
  "c8259a23",
  "45e3cde7",
  "826c31e0",
  "b13f4b57",
  "d3ad5a73",
  "b8350901",
  "29ab2852",
  "2ae6a691",
  "104776ef",
  "aeaa6a09",
  "639c4f0b",
  "3335df97",
  "55053299",
  "ab1e901f",
  "e87f0ca2",
  "d974b48f",
  "efc01233",
  "5c0d870b",
  "ea1afad0",
  "55511995",
  "112d0034",
  "f133510b",
  "58307da0",
  "779e7dcb",
  "222bd1fa",
  "b8350900",
  "2484ce70",
  "9ec8706c",
  "171f76e9",
  "2ff8a738",
  "7168d463",
  "37951bc4",
  "9ca2c109",
  "e35a3c91",
  "a460c971",
  "1459e2c6",
  "bf8970de",
  "366d5f50",
  "5a6170fb",
  "06a28ac7",
  "d9e3829f",
  "506b242a",
  "35330d19",
  "3198fffc",
  "aee424c0",
  "0b604114",
  "cd0c2ff9",
  "3c73c705",
  "1d80c9bb",
  "a1233156",
  "5103e650",
  "562e964e",
  "13b06cba",
  "71833308",
  "f1e92541",
  "d08aa492",
  "dd764207",
  "111062fc",
  "814c5368",
  "0b82681f",
  "c942490e",
  "ea1d1d8c",
  "da09d849",
  "e4bb0668",
  "07034c0f",
  "626da374",
  "07bc680a"
]);
const pickedLockIds = new Set([
  "07034c0f",
  "901b35b2",
  "2455f0ae",
  "40f7d7c7",
  "632f4069",
  "2ae1e0b8",
  "fb5a9eb7",
  "779e7dcb",
  "959a6b9d",
  "efc01233",
  "562e964e"
]);

export const locks: LockRecord[] = lockCatalog.map((lock) => ({
  ...lock,
  status: ownedLockIds.has(lock.id) ? "Owned" : "Wishlist",
  picked: pickedLockIds.has(lock.id),
}));

export const ownedLocks = locks.filter((lock) => lock.status === "Owned");
export const wishlistLocks = locks.filter((lock) => lock.status === "Wishlist");

export const beltCounts = Object.fromEntries(
  beltOrder.map((belt) => [belt, ownedLocks.filter((lock) => lock.belt === belt).length]),
) as Record<Belt, number>;

export const mechanismCounts = Object.entries(
  ownedLocks.reduce<Record<string, number>>((counts, lock) => {
    lock.mechanisms.forEach((mechanism) => {
      counts[mechanism] = (counts[mechanism] ?? 0) + 1;
    });
    return counts;
  }, {}),
)
  .map(([label, value]) => ({ label, value }))
  .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

const brandFamilies = [
  "ASSA",
  "ABUS",
  "Master Lock",
  "Ruko",
  "Mul-T-Lock",
  "Schlage",
  "GOAL",
  "Burg Wächter",
  "Yale",
  "Lockwood",
  "Chubb",
  "FAB",
];

export const brandCounts = brandFamilies
  .map((label) => ({
    label,
    value: ownedLocks.filter((lock) => lock.name.includes(label)).length,
  }))
  .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
