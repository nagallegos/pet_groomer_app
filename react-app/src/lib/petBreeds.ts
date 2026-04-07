import type { Pet } from "../types/models";

export const MAX_PET_BREEDS = 3;

const BREED_DELIMITER = " / ";

function trimBreed(value: string) {
  return value.trim();
}

export function normalizeBreedList(breeds: string[]): string[] {
  const normalized: string[] = [];

  breeds.forEach((breed) => {
    const trimmed = trimBreed(breed);
    if (!trimmed) {
      return;
    }

    if (!normalized.some((value) => value.toLowerCase() === trimmed.toLowerCase())) {
      normalized.push(trimmed);
    }
  });

  return normalized;
}

export function parseBreedString(value?: string | null): string[] {
  if (!value) {
    return [];
  }

  return normalizeBreedList(value.split(/\s*\/\s*/));
}

export function getPetBreedList(pet: Pick<Pet, "breed">): string[] {
  return parseBreedString(pet.breed);
}

export function serializeBreedList(breeds: string[]): string {
  return normalizeBreedList(breeds).join(BREED_DELIMITER);
}

export function getDetailedBreedLabel(breedOrPet: string | Pick<Pet, "breed">): string {
  const breeds =
    typeof breedOrPet === "string"
      ? parseBreedString(breedOrPet)
      : getPetBreedList(breedOrPet);

  return breeds.join(", ");
}

export function getCompactBreedLabel(breedOrPet: string | Pick<Pet, "breed">): string {
  const breeds =
    typeof breedOrPet === "string"
      ? parseBreedString(breedOrPet)
      : getPetBreedList(breedOrPet);

  if (breeds.length === 0) {
    return "—";
  }

  if (breeds.length > MAX_PET_BREEDS) {
    return "mix";
  }

  return breeds.join(", ");
}
