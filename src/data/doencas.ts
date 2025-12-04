export interface Doenca {
  id: number;
  nome: string;
  orgao?: string | null; 
}

export const doencas: Doenca[] = [
  { id: 609, nome: "Oídio", orgao: "F" },
  { id: 610, nome: "Oídio", orgao: "R" },
  { id: 611, nome: "Oídio", orgao: "C" },
  { id: 612, nome: "Míldio", orgao: "F" },
  { id: 613, nome: "Míldio", orgao: "R" },
  { id: 614, nome: "Míldio", orgao: "C" },
  { id: 615, nome: "Antracnose", orgao: "F" },
  { id: 616, nome: "Antracnose", orgao: "R" },
  { id: 617, nome: "Antracnose", orgao: "C" },
  { id: 618, nome: "Glomerella", orgao: null },
  { id: 619, nome: "Ac Raj", orgao: "F" },
  { id: 620, nome: "Ac Bra", orgao: "F" },
  { id: 621, nome: "Ac Ver", orgao: "F" },
  { id: 622, nome: "Lep", orgao: "F" },
  { id: 623, nome: "Lep", orgao: "Ovo" },
  { id: 624, nome: "Lep", orgao: "C" },
  { id: 625, nome: "Lasiothyris", orgao: null },
  { id: 626, nome: "Traça", orgao: "C" },
  { id: 627, nome: "COC", orgao: "F" },
  { id: 628, nome: "COC", orgao: "R" },
  { id: 629, nome: "COC", orgao: "C" },
  { id: 630, nome: "COC", orgao: "Caule" },
  { id: 631, nome: "Cig", orgao: "Ovo" },
  { id: 632, nome: "Cig", orgao: "Ninfa" },
  { id: 633, nome: "Cig", orgao: "Adulta" },
  { id: 634, nome: "Tripes", orgao: "B" },
  { id: 635, nome: "Tripes", orgao: "F" },
  { id: 636, nome: "Broca", orgao: "R" },
  { id: 637, nome: "Mofo Cinz", orgao: null },
  { id: 638, nome: "Pulgão", orgao: null },
  { id: 639, nome: "M Frutas", orgao: null },
  { id: 640, nome: "Ferrug", orgao: "F" },
];
