import type { Pet } from "../types/models";

function isValidDate(value?: string) {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
}

export function getPetAgeYears(pet: Pick<Pet, "birthDate" | "ageYears">, now = new Date()) {
  if (isValidDate(pet.birthDate)) {
    const birthDate = new Date(pet.birthDate as string);
    let years = now.getFullYear() - birthDate.getFullYear();
    const monthDelta = now.getMonth() - birthDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) {
      years -= 1;
    }
    return Math.max(0, years);
  }

  return pet.ageYears == null ? undefined : Math.floor(pet.ageYears);
}

export function formatPetAge(
  pet: Pick<Pet, "birthDate" | "ageYears" | "isBirthDateEstimated">,
  fallback = "Not provided",
) {
  const years = getPetAgeYears(pet);
  if (years == null) {
    return fallback;
  }

  const suffix = years === 1 ? "year" : "years";
  const estimate = pet.birthDate && pet.isBirthDateEstimated ? " (est.)" : "";
  return `${years} ${suffix}${estimate}`;
}

export function toDateInputValue(dateValue?: string) {
  if (!isValidDate(dateValue)) {
    return "";
  }
  return new Date(dateValue as string).toISOString().slice(0, 10);
}
