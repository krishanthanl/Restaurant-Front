export function validSessionInput(guests: string, capacity: number, notes: string): boolean {
  return Number.isInteger(Number(guests)) && Number(guests) >= 1 && Number(guests) <= capacity && notes.trim().length <= 1000;
}
