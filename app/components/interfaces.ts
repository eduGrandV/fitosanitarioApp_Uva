import * as Location from "expo-location";

export interface PontoData {
  nota: string;
  location?: Location.LocationObject | null;
}

export interface Registro {
  id: string;
  areaId: number;
  doenca: string;
  data: string;
  resultados: Array<{
    id: string;
    plantasAfetadas: number;
    porcentagem: number;
    status: string;
  }>;
  dados: {
    [idValvula: string]: {
      [idPonto: string]: string | PontoData;
    };
  };
}
