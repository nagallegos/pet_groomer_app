import { neon } from "@netlify/neon";

const databaseUrl =
  process.env.NETLIFY_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "";

if (!databaseUrl) {
  throw new Error(
    "Missing NETLIFY_DATABASE_URL or DATABASE_URL. Set one to seed test data.",
  );
}

const sql = neon(databaseUrl);

const now = new Date();

const firstNames = [
  "Mandy",
  "Nick",
  "Victoria",
  "Teddy",
  "Luke",
  "Riley",
  "Bella",
  "Mason",
  "Ava",
  "Oliver",
  "Nora",
  "Liam",
  "Sophia",
  "Noah",
  "Isla",
  "Ethan",
  "Grace",
  "Leo",
  "Chloe",
  "Henry",
  "Harper",
  "Miles",
  "Layla",
  "Jack",
  "Elena",
  "Kai",
  "Violet",
  "Julian",
  "Ruby",
  "Zane",
];

const lastNames = [
  "Garcia",
  "Graham",
  "Johnson",
  "Williams",
  "Brown",
  "Lopez",
  "Martinez",
  "Taylor",
  "Anderson",
  "Thomas",
  "Moore",
  "Jackson",
  "White",
  "Harris",
  "Clark",
  "Lewis",
  "Lee",
  "Walker",
  "Hall",
  "Allen",
  "Young",
  "King",
  "Wright",
  "Scott",
  "Green",
  "Baker",
  "Adams",
  "Nelson",
  "Mitchell",
  "Perez",
];

const dogBreeds = [
  "Golden Retriever",
  "Labrador Retriever",
  "Cocker Spaniel",
  "Poodle",
  "French Bulldog",
  "Shih Tzu",
  "Dachshund",
  "Chihuahua Terrier",
  "Mini Schnauzer",
  "Australian Shepherd",
  "Border Collie",
  "German Shepherd",
  "Pug",
  "Beagle",
];

const catBreeds = [
  "Domestic Shorthair",
  "Maine Coon",
  "Siamese",
  "Ragdoll",
  "Bengal",
  "British Shorthair",
  "Persian",
];

const petNames = [
  "Charlie",
  "Luna",
  "Milo",
  "Bella",
  "Daisy",
  "Rocky",
  "Coco",
  "Oliver",
  "Lucy",
  "Buddy",
  "Nala",
  "Leo",
  "Ziggy",
  "Ollie",
  "Piper",
  "Ruby",
  "Teddy",
  "Mocha",
  "Willow",
  "Pepper",
  "Simba",
  "Misty",
  "Shadow",
  "Hazel",
  "Scout",
  "Loki",
];

const services = [
  "Full Groom",
  "Bath & Brush",
  "Nail Trim",
  "Deshed Treatment",
  "Puppy Intro",
];

const ownerNotes = [
  "Prefers early morning appointments.",
  "Sensitive to loud dryers.",
  "Allergic to lavender shampoo.",
  "Text day-before reminder.",
  "Payment due at pickup.",
];

const petNotes = [
  "Nervous around clippers.",
  "Matting around ears.",
  "Needs gentle nail trim.",
  "Loves peanut butter treats.",
  "Handle with calm voice.",
];

const appointmentNotes = [
  "Coat in great shape.",
  "Requested shorter trim on legs.",
  "Skin a little dry, used oat shampoo.",
  "Client asked for bows.",
  "Scheduled follow-up in 6 weeks.",
];

let seed = 1337;
const random = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const pick = (arr) => arr[Math.floor(random() * arr.length)];

const randomInt = (min, max) =>
  Math.floor(random() * (max - min + 1)) + min;

const randomPhone = () =>
  `806${randomInt(2000000, 9999999)}`;

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const toIso = (date) => date.toISOString();

const makeOwner = async (index, isArchived) => {
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[(index * 3) % lastNames.length];
  const email = `client${index + 1}@example.com`;
  const preferred = random() < 0.75 ? "email" : "text";
  const address = `${randomInt(100, 9999)} Cedar Springs Trl`;
  const archivedAt = isArchived ? addDays(now, -randomInt(15, 120)) : null;

  const rows = await sql`
    INSERT INTO owners (
      first_name, last_name, phone, email, preferred_contact_method, address,
      is_archived, archived_at
    )
    VALUES (
      ${firstName},
      ${lastName},
      ${randomPhone()},
      ${email},
      ${preferred},
      ${address},
      ${isArchived},
      ${archivedAt}
    )
    RETURNING id::text AS id, first_name, last_name
  `;

  return rows[0];
};

const makePet = async (ownerId, isArchived) => {
  const isCat = random() < 0.2;
  const name = pick(petNames);
  const species = isCat ? "cat" : "dog";
  const breed = isCat ? pick(catBreeds) : pick(dogBreeds);
  const weight = randomInt(6, 85);
  const age = randomInt(1, 12);
  const color = pick(["Black", "Tan", "Cream", "White", "Brown", "Gray", "Blonde"]);
  const archivedAt = isArchived ? addDays(now, -randomInt(10, 180)) : null;

  const rows = await sql`
    INSERT INTO pets (
      owner_id, name, species, breed, weight_lbs, age_years,
      color, is_archived, archived_at
    )
    VALUES (
      ${ownerId}::uuid,
      ${name},
      ${species},
      ${breed},
      ${weight},
      ${age},
      ${color},
      ${isArchived},
      ${archivedAt}
    )
    RETURNING id::text AS id
  `;

  return rows[0];
};

const makeOwnerNote = async (ownerId) => {
  const text = pick(ownerNotes);
  const visibility = random() < 0.7 ? "internal" : "client";
  await sql`
    INSERT INTO owner_notes (owner_id, text, visibility)
    VALUES (${ownerId}::uuid, ${text}, ${visibility})
  `;
};

const makePetNote = async (petId) => {
  const text = pick(petNotes);
  const visibility = random() < 0.7 ? "internal" : "client";
  await sql`
    INSERT INTO pet_notes (pet_id, text, visibility)
    VALUES (${petId}::uuid, ${text}, ${visibility})
  `;
};

const makeAppointment = async (ownerId, petId, date, status) => {
  const start = new Date(date);
  start.setHours(randomInt(8, 16), 0, 0, 0);
  const end = new Date(start);
  end.setHours(start.getHours() + 1);
  const serviceType = pick(services);
  const cost = randomInt(35, 120);

  const rows = await sql`
    INSERT INTO appointments (
      owner_id, pet_id, start_at, end_at, service_type,
      selected_services, cost, status
    )
    VALUES (
      ${ownerId}::uuid,
      ${petId}::uuid,
      ${toIso(start)},
      ${toIso(end)},
      ${serviceType},
      ${[serviceType]},
      ${cost},
      ${status}
    )
    RETURNING id::text AS id
  `;

  return rows[0];
};

const makeAppointmentNote = async (appointmentId) => {
  const text = pick(appointmentNotes);
  const visibility = random() < 0.6 ? "internal" : "client";
  await sql`
    INSERT INTO appointment_notes (appointment_id, text, visibility)
    VALUES (${appointmentId}::uuid, ${text}, ${visibility})
  `;
};

const upcomingDates = Array.from({ length: 10 }, () =>
  addDays(now, randomInt(7, 120)),
);

const historicalDates = Array.from({ length: 15 }, () =>
  addDays(now, -randomInt(15, 150)),
);

const appointmentCounts = Array.from({ length: 30 }, () => 0);
for (let i = 0; i < 12; i += 1) {
  appointmentCounts[i] = 1;
}
for (let i = 12; i < 20; i += 1) {
  appointmentCounts[i] = 2;
}

const archivedOwnerIndexes = new Set([4, 11, 23]);
const ownerIds = [];

for (let i = 0; i < 30; i += 1) {
  const owner = await makeOwner(i, archivedOwnerIndexes.has(i));
  ownerIds.push(owner.id);

  const petCount = randomInt(1, 3);
  const petIds = [];
  const hasArchivedPet = random() < 0.25;

  for (let p = 0; p < petCount; p += 1) {
    const shouldArchive =
      archivedOwnerIndexes.has(i) || (hasArchivedPet && p === petCount - 1);
    const pet = await makePet(owner.id, shouldArchive);
    petIds.push(pet.id);
    if (random() < 0.6) {
      await makePetNote(pet.id);
    }
  }

  if (random() < 0.7) {
    await makeOwnerNote(owner.id);
  }

  const appointmentsToCreate = appointmentCounts[i];
  for (let a = 0; a < appointmentsToCreate; a += 1) {
    const isUpcoming = random() < 0.5;
    const date = isUpcoming ? pick(upcomingDates) : pick(historicalDates);
    const status = isUpcoming
      ? random() < 0.6
        ? "scheduled"
        : "confirmed"
      : pick(["completed", "cancelled", "no-show"]);
    const petId = pick(petIds);
    const appointment = await makeAppointment(owner.id, petId, date, status);
    if (random() < 0.7) {
      await makeAppointmentNote(appointment.id);
    }
  }
}

console.log("Seeded 30 owners with pets, appointments, and notes.");
