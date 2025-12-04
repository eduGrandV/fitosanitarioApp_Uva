export default function calcularInfestacao(
  plantasAfetadas: number,
  totalPlantas: number = 15
): number {
  if (plantasAfetadas <= 0) return 0;
  if ((plantasAfetadas >= totalPlantas)) return 100;

  return Number(((plantasAfetadas * 100) / totalPlantas).toFixed(2));
}
