export interface Area {
  id: number;
  nome: string;
  valves: number; 
  numeroDeValvulas?: number; 
}
export interface valveData{
    [ponto: string] : boolean[]
}