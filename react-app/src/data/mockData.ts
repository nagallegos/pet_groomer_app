import type {
  Appointment,
  AppointmentStatus,
  ContactMethod,
  NoteItem,
  Owner,
  Pet,
  Species,
} from "../types/models";

const BASE_NOTE_DATE = "2026-03-01T09:00:00.000Z";
const APPOINTMENT_BASE_DATE = new Date("2026-02-16T08:00:00");

type OwnerSeed = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  preferredContactMethod: ContactMethod;
  address: string;
  notes: string[];
};

type PetSeed = {
  ownerId: string;
  name: string;
  species: Species;
  breed: string;
  weightLbs: number;
  ageYears: number;
  color: string;
  notes: string[];
};

const ownerSeeds: OwnerSeed[] = [
  {
    firstName: "Avery",
    lastName: "Coleman",
    phone: "806-555-1101",
    email: "avery.coleman@example.com",
    preferredContactMethod: "text",
    address: "1421 Willow Creek Dr",
    notes: ["Prefers first appointment of the day."],
  },
  {
    firstName: "Brooke",
    lastName: "Sanders",
    phone: "806-555-1102",
    email: "brooke.sanders@example.com",
    preferredContactMethod: "email",
    address: "908 Juniper Ln",
    notes: ["Usually books sibling pets together."],
  },
  {
    firstName: "Caleb",
    lastName: "Morris",
    phone: "806-555-1103",
    email: "caleb.morris@example.com",
    preferredContactMethod: "text",
    address: "615 Redbud St",
    notes: ["Call if running more than 15 minutes behind."],
  },
  {
    firstName: "Danielle",
    lastName: "Foster",
    phone: "806-555-1104",
    email: "danielle.foster@example.com",
    preferredContactMethod: "email",
    address: "2840 Maple Ridge Ave",
    notes: ["Wants seasonal bandanas for each groom."],
  },
  {
    firstName: "Ethan",
    lastName: "Ramirez",
    phone: "806-555-1105",
    email: "ethan.ramirez@example.com",
    preferredContactMethod: "text",
    address: "3302 Canyon View Rd",
    notes: [],
  },
  {
    firstName: "Faith",
    lastName: "Turner",
    phone: "806-555-1106",
    email: "faith.turner@example.com",
    preferredContactMethod: "email",
    address: "1220 Briarwood Ct",
    notes: ["Prefers lavender shampoo when available."],
  },
  {
    firstName: "Gavin",
    lastName: "Parker",
    phone: "806-555-1107",
    email: "gavin.parker@example.com",
    preferredContactMethod: "text",
    address: "7420 Prairie Wind Trl",
    notes: [],
  },
  {
    firstName: "Hannah",
    lastName: "Price",
    phone: "806-555-1108",
    email: "hannah.price@example.com",
    preferredContactMethod: "email",
    address: "9514 Aspen Hill Dr",
    notes: ["Ask before trimming tail feathering."],
  },
  {
    firstName: "Isaac",
    lastName: "Bennett",
    phone: "806-555-1109",
    email: "isaac.bennett@example.com",
    preferredContactMethod: "text",
    address: "1845 Cottonwood Blvd",
    notes: [],
  },
  {
    firstName: "Jasmine",
    lastName: "Reed",
    phone: "806-555-1110",
    email: "jasmine.reed@example.com",
    preferredContactMethod: "email",
    address: "611 Parkside Way",
    notes: ["Needs receipts emailed for reimbursement."],
  },
  {
    firstName: "Kaden",
    lastName: "Brooks",
    phone: "806-555-1111",
    email: "kaden.brooks@example.com",
    preferredContactMethod: "text",
    address: "4429 Cedar Ridge Rd",
    notes: [],
  },
  {
    firstName: "Lila",
    lastName: "Hayes",
    phone: "806-555-1112",
    email: "lila.hayes@example.com",
    preferredContactMethod: "email",
    address: "1307 Meadowlark Cir",
    notes: ["Dog gets nervous during nail trims."],
  },
  {
    firstName: "Mason",
    lastName: "Ward",
    phone: "806-555-1113",
    email: "mason.ward@example.com",
    preferredContactMethod: "text",
    address: "2872 Copper Creek Dr",
    notes: ["Okay with kennel drying if needed."],
  },
  {
    firstName: "Nora",
    lastName: "Hughes",
    phone: "806-555-1114",
    email: "nora.hughes@example.com",
    preferredContactMethod: "email",
    address: "775 Bluebonnet Pass",
    notes: [],
  },
  {
    firstName: "Owen",
    lastName: "Diaz",
    phone: "806-555-1115",
    email: "owen.diaz@example.com",
    preferredContactMethod: "text",
    address: "2695 Stone Creek Pl",
    notes: ["Text when pet is ready for pickup."],
  },
  {
    firstName: "Paisley",
    lastName: "Long",
    phone: "806-555-1116",
    email: "paisley.long@example.com",
    preferredContactMethod: "email",
    address: "8901 Pine Hollow Rd",
    notes: [],
  },
  {
    firstName: "Quinn",
    lastName: "Russell",
    phone: "806-555-1117",
    email: "quinn.russell@example.com",
    preferredContactMethod: "text",
    address: "4721 Mockingbird Ln",
    notes: ["Likes deshedding add-on every other visit."],
  },
  {
    firstName: "Riley",
    lastName: "Griffin",
    phone: "806-555-1118",
    email: "riley.griffin@example.com",
    preferredContactMethod: "email",
    address: "1509 Westfield Dr",
    notes: [],
  },
  {
    firstName: "Sofia",
    lastName: "James",
    phone: "806-555-1119",
    email: "sofia.james@example.com",
    preferredContactMethod: "text",
    address: "3214 Elm Grove Ct",
    notes: ["One pet is senior and needs extra time."],
  },
  {
    firstName: "Theo",
    lastName: "Powell",
    phone: "806-555-1120",
    email: "theo.powell@example.com",
    preferredContactMethod: "email",
    address: "6012 Lakeside Ave",
    notes: ["Prefers Saturday appointments when possible."],
  },
];

const petSeeds: PetSeed[] = [
  {
    ownerId: "owner-1",
    name: "Poppy",
    species: "dog",
    breed: "Mini Goldendoodle",
    weightLbs: 26,
    ageYears: 3,
    color: "Apricot",
    notes: ["Needs hand scissoring on face."],
  },
  {
    ownerId: "owner-1",
    name: "Mochi",
    species: "cat",
    breed: "Ragdoll",
    weightLbs: 12,
    ageYears: 5,
    color: "Seal point",
    notes: [],
  },
  {
    ownerId: "owner-2",
    name: "Teddy",
    species: "dog",
    breed: "Shih Tzu",
    weightLbs: 14,
    ageYears: 6,
    color: "Cream",
    notes: ["Sensitive paws."],
  },
  {
    ownerId: "owner-2",
    name: "Pepper",
    species: "cat",
    breed: "Domestic Shorthair",
    weightLbs: 10,
    ageYears: 4,
    color: "Black",
    notes: [],
  },
  {
    ownerId: "owner-3",
    name: "Remy",
    species: "dog",
    breed: "Standard Poodle",
    weightLbs: 51,
    ageYears: 7,
    color: "Silver",
    notes: ["Owner likes clean feet and rounded topknot."],
  },
  {
    ownerId: "owner-4",
    name: "Clover",
    species: "dog",
    breed: "Cavalier King Charles Spaniel",
    weightLbs: 18,
    ageYears: 2,
    color: "Blenheim",
    notes: [],
  },
  {
    ownerId: "owner-4",
    name: "Winston",
    species: "dog",
    breed: "French Bulldog",
    weightLbs: 24,
    ageYears: 5,
    color: "Brindle",
    notes: ["Use hypoallergenic shampoo."],
  },
  {
    ownerId: "owner-4",
    name: "Olive",
    species: "cat",
    breed: "Maine Coon",
    weightLbs: 15,
    ageYears: 6,
    color: "Brown tabby",
    notes: [],
  },
  {
    ownerId: "owner-5",
    name: "Scout",
    species: "dog",
    breed: "Australian Shepherd",
    weightLbs: 47,
    ageYears: 4,
    color: "Blue merle",
    notes: ["Heavy deshed in spring."],
  },
  {
    ownerId: "owner-5",
    name: "Luna",
    species: "cat",
    breed: "Siamese",
    weightLbs: 9,
    ageYears: 3,
    color: "Chocolate point",
    notes: [],
  },
  {
    ownerId: "owner-6",
    name: "Archie",
    species: "dog",
    breed: "Yorkshire Terrier",
    weightLbs: 8,
    ageYears: 8,
    color: "Blue and tan",
    notes: ["Quick nail trims between full grooms."],
  },
  {
    ownerId: "owner-6",
    name: "June",
    species: "dog",
    breed: "Labradoodle",
    weightLbs: 43,
    ageYears: 1,
    color: "Chocolate",
    notes: [],
  },
  {
    ownerId: "owner-7",
    name: "Maverick",
    species: "dog",
    breed: "Border Collie",
    weightLbs: 38,
    ageYears: 5,
    color: "Black and white",
    notes: [],
  },
  {
    ownerId: "owner-8",
    name: "Honey",
    species: "dog",
    breed: "Cocker Spaniel",
    weightLbs: 24,
    ageYears: 4,
    color: "Buff",
    notes: ["Keep ears extra clean."],
  },
  {
    ownerId: "owner-8",
    name: "Blue",
    species: "cat",
    breed: "Russian Blue",
    weightLbs: 11,
    ageYears: 2,
    color: "Gray",
    notes: [],
  },
  {
    ownerId: "owner-9",
    name: "Atlas",
    species: "dog",
    breed: "Bernedoodle",
    weightLbs: 62,
    ageYears: 3,
    color: "Tri-color",
    notes: ["Dryer breaks every 15 minutes."],
  },
  {
    ownerId: "owner-9",
    name: "Piper",
    species: "dog",
    breed: "Beagle",
    weightLbs: 21,
    ageYears: 7,
    color: "Lemon and white",
    notes: [],
  },
  {
    ownerId: "owner-10",
    name: "Nala",
    species: "cat",
    breed: "Persian",
    weightLbs: 9,
    ageYears: 9,
    color: "White",
    notes: ["Matting under arms."],
  },
  {
    ownerId: "owner-10",
    name: "Beau",
    species: "dog",
    breed: "Bichon Frise",
    weightLbs: 13,
    ageYears: 6,
    color: "White",
    notes: [],
  },
  {
    ownerId: "owner-11",
    name: "Phoebe",
    species: "dog",
    breed: "Pomeranian",
    weightLbs: 7,
    ageYears: 5,
    color: "Orange sable",
    notes: [],
  },
  {
    ownerId: "owner-12",
    name: "Dexter",
    species: "dog",
    breed: "Schnauzer",
    weightLbs: 19,
    ageYears: 10,
    color: "Salt and pepper",
    notes: ["Senior pet, use support sling in tub."],
  },
  {
    ownerId: "owner-12",
    name: "Millie",
    species: "cat",
    breed: "Domestic Longhair",
    weightLbs: 8,
    ageYears: 6,
    color: "Calico",
    notes: [],
  },
  {
    ownerId: "owner-13",
    name: "Otis",
    species: "dog",
    breed: "German Shepherd",
    weightLbs: 74,
    ageYears: 4,
    color: "Black and tan",
    notes: ["Double coat deshed."],
  },
  {
    ownerId: "owner-13",
    name: "Tilly",
    species: "dog",
    breed: "Havanese",
    weightLbs: 11,
    ageYears: 2,
    color: "White and tan",
    notes: [],
  },
  {
    ownerId: "owner-14",
    name: "Jasper",
    species: "cat",
    breed: "Bengal",
    weightLbs: 13,
    ageYears: 3,
    color: "Brown spotted",
    notes: [],
  },
  {
    ownerId: "owner-15",
    name: "Rosie",
    species: "dog",
    breed: "Boxer",
    weightLbs: 58,
    ageYears: 6,
    color: "Fawn",
    notes: ["Nail trim only every 6 weeks."],
  },
  {
    ownerId: "owner-15",
    name: "Finn",
    species: "dog",
    breed: "Corgi",
    weightLbs: 28,
    ageYears: 5,
    color: "Red and white",
    notes: [],
  },
  {
    ownerId: "owner-16",
    name: "Maple",
    species: "cat",
    breed: "Scottish Fold",
    weightLbs: 10,
    ageYears: 4,
    color: "Blue cream",
    notes: [],
  },
  {
    ownerId: "owner-16",
    name: "Biscuit",
    species: "dog",
    breed: "Maltipoo",
    weightLbs: 12,
    ageYears: 3,
    color: "Apricot",
    notes: ["Fluff dry for curly coat."],
  },
  {
    ownerId: "owner-16",
    name: "Roo",
    species: "dog",
    breed: "Mixed Breed",
    weightLbs: 35,
    ageYears: 1,
    color: "Tan",
    notes: [],
  },
  {
    ownerId: "owner-17",
    name: "Minnie",
    species: "dog",
    breed: "Dachshund",
    weightLbs: 15,
    ageYears: 7,
    color: "Dapple",
    notes: [],
  },
  {
    ownerId: "owner-17",
    name: "Ziggy",
    species: "cat",
    breed: "Sphynx",
    weightLbs: 8,
    ageYears: 2,
    color: "Pink",
    notes: ["Warm towels only."],
  },
  {
    ownerId: "owner-18",
    name: "Charlie",
    species: "dog",
    breed: "Boston Terrier",
    weightLbs: 20,
    ageYears: 6,
    color: "Black and white",
    notes: [],
  },
  {
    ownerId: "owner-18",
    name: "Skye",
    species: "dog",
    breed: "Samoyed",
    weightLbs: 52,
    ageYears: 5,
    color: "White",
    notes: ["Long drying time; book extended slot."],
  },
  {
    ownerId: "owner-19",
    name: "Coco",
    species: "dog",
    breed: "Chihuahua",
    weightLbs: 6,
    ageYears: 8,
    color: "Chocolate",
    notes: [],
  },
  {
    ownerId: "owner-19",
    name: "Milo",
    species: "cat",
    breed: "Tabby",
    weightLbs: 12,
    ageYears: 10,
    color: "Orange tabby",
    notes: ["Senior cat lion cut every summer."],
  },
  {
    ownerId: "owner-20",
    name: "Daisy",
    species: "dog",
    breed: "West Highland White Terrier",
    weightLbs: 17,
    ageYears: 4,
    color: "White",
    notes: [],
  },
  {
    ownerId: "owner-20",
    name: "Murphy",
    species: "dog",
    breed: "Golden Retriever",
    weightLbs: 63,
    ageYears: 5,
    color: "Golden",
    notes: ["Brush out thoroughly before bath."],
  },
];

function createNote(id: string, text: string): NoteItem {
  return {
    id,
    text,
    visibility: "internal",
    createdAt: BASE_NOTE_DATE,
  };
}

function createAppointmentDate(index: number): { start: string; end: string } {
  const start = new Date(APPOINTMENT_BASE_DATE);
  const dayOffset = index % 42;
  const hourBlock = index % 5;
  const minuteOffset = index % 2 === 0 ? 0 : 30;
  const durationMinutes = [30, 60, 90][index % 3];

  start.setDate(APPOINTMENT_BASE_DATE.getDate() + dayOffset);
  start.setHours(8 + hourBlock * 2, minuteOffset, 0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMinutes);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

const appointmentStatuses: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "scheduled",
  "cancelled",
  "scheduled",
  "no-show",
  "confirmed",
];

const serviceTypes = [
  "Full Groom",
  "Bath and Brush",
  "Nail Trim",
  "Puppy Intro Groom",
  "Deshed Treatment",
  "Sanitary Trim",
  "Face, Feet, and Fanny",
  "Cat Groom",
];

const serviceCosts: Record<string, number> = {
  "Full Groom": 85,
  "Bath and Brush": 55,
  "Nail Trim": 18,
  "Puppy Intro Groom": 45,
  "Deshed Treatment": 72,
  "Sanitary Trim": 28,
  "Face, Feet, and Fanny": 35,
  "Cat Groom": 95,
};

export const mockOwners: Owner[] = ownerSeeds.map((owner, index) => ({
  id: `owner-${index + 1}`,
  firstName: owner.firstName,
  lastName: owner.lastName,
  phone: owner.phone,
  email: owner.email,
  preferredContactMethod: owner.preferredContactMethod,
  address: owner.address,
  notes: owner.notes.map((note, noteIndex) =>
    createNote(`owner-note-${index + 1}-${noteIndex + 1}`, note),
  ),
  isArchived: false,
}));

export const mockPets: Pet[] = petSeeds.map((pet, index) => ({
  id: `pet-${index + 1}`,
  ownerId: pet.ownerId,
  name: pet.name,
  species: pet.species,
  breed: pet.breed,
  weightLbs: pet.weightLbs,
  ageYears: pet.ageYears,
  color: pet.color,
  notes: pet.notes.map((note, noteIndex) =>
    createNote(`pet-note-${index + 1}-${noteIndex + 1}`, note),
  ),
  isArchived: false,
}));

const ownerIdByPetId = new Map(mockPets.map((pet) => [pet.id, pet.ownerId]));

export const mockAppointments: Appointment[] = Array.from(
  { length: 100 },
  (_, index) => {
    const pet = mockPets[index % mockPets.length];
    const status = appointmentStatuses[index % appointmentStatuses.length];
    const { start, end } = createAppointmentDate(index);
    const serviceType = serviceTypes[index % serviceTypes.length];
    const quotePrice = serviceCosts[serviceType] + ((index % 4) * 5);
    const actualPriceCharged =
      status === "completed" ? quotePrice + ((index % 3) * 5) : undefined;
    const notes =
      index % 9 === 0
        ? [
            createNote(
              `appt-note-${index + 1}-1`,
              "Client asked for bow or bandana if available.",
            ),
          ]
        : [];

    return {
      id: `appt-${index + 1}`,
      ownerId: ownerIdByPetId.get(pet.id) ?? pet.ownerId,
      petId: pet.id,
      start,
      end,
      status,
      serviceType,
      selectedServices: [serviceType],
      quotePrice,
      actualPriceCharged,
      paymentStatus: status === "completed" ? "paid" : "unpaid",
      notes,
      confirmationSentAt:
        status === "confirmed" || status === "scheduled"
          ? new Date(new Date(start).getTime() - 24 * 60 * 60 * 1000).toISOString()
          : undefined,
      confirmedAt:
        status === "confirmed"
          ? new Date(new Date(start).getTime() - 12 * 60 * 60 * 1000).toISOString()
          : undefined,
      isArchived: false,
    };
  },
);
