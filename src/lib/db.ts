import Dexie, { type Table } from 'dexie';
import type { Chantier, Affectation, Profile, PointageLocal } from '../types/database';

export class PaysageDatabase extends Dexie {
  pointages!: Table<PointageLocal, string>;
  chantiers!: Table<Chantier, string>;
  affectations!: Table<Affectation, string>;
  profiles!: Table<Profile, string>;

  constructor() {
    super('PaysageConceptDB');
    this.version(1).stores({
      pointages: 'id, profile_id, chantier_id, type, horodatage, synced',
      chantiers: 'id, statut',
      affectations: 'id, chantier_id, profile_id, date_intervention',
      profiles: 'id, role',
    });
  }
}

export const db = new PaysageDatabase();

// Identifiants conformes PostgreSQL UUID strict
export const CHANTIER_IDS = {
  LAURENT: 'c1000000-0000-4000-8000-000000000001',
  CEDRES: 'c2000000-0000-4000-8000-000000000002',
  BEAUVALLON: 'c3000000-0000-4000-8000-000000000003',
  TECHLID: 'c4000000-0000-4000-8000-000000000004',
};

export const PROFILE_IDS = {
  JEAN: '4fa02732-58a2-4de7-872f-1db234899c1e', // User test existant dans auth.users
  MARC: 'd587499d-3f96-4164-b37f-01b7a442646b', // User test existant dans auth.users
  THOMAS: 'b3000000-0000-4000-8000-000000000003',
  LUCAS: 'b4000000-0000-4000-8000-000000000004',
  ANTOINE: 'b5000000-0000-4000-8000-000000000005',
};

export const INITIAL_PROFILES: Profile[] = [
  {
    id: PROFILE_IDS.JEAN,
    nom: 'Dupont',
    prenom: 'Jean',
    role: 'ouvrier',
    telephone: '06 12 34 56 78',
    email: 'jean.dupont@paysageconcept.fr',
  },
  {
    id: PROFILE_IDS.MARC,
    nom: 'Vasseur',
    prenom: 'Marc',
    role: 'chef_equipe',
    telephone: '06 98 76 54 32',
    email: 'marc.vasseur@paysageconcept.fr',
  },
  {
    id: PROFILE_IDS.THOMAS,
    nom: 'Bernard',
    prenom: 'Thomas',
    role: 'ouvrier',
    telephone: '06 45 67 89 01',
    email: 'thomas.bernard@paysageconcept.fr',
  },
  {
    id: PROFILE_IDS.LUCAS,
    nom: 'Moreau',
    prenom: 'Lucas',
    role: 'ouvrier',
    telephone: '06 23 45 67 89',
    email: 'lucas.moreau@paysageconcept.fr',
  },
  {
    id: PROFILE_IDS.ANTOINE,
    nom: 'Petit',
    prenom: 'Antoine',
    role: 'ouvrier',
    telephone: '06 34 56 78 90',
    email: 'antoine.petit@paysageconcept.fr',
  },
];

export const INITIAL_CHANTIERS: Chantier[] = [
  {
    id: CHANTIER_IDS.LAURENT,
    nom_client: 'Villa Laurent - Jardin Zen & Terrasse Bois',
    adresse: "14 Chemin des Côtes, 69370 Saint-Didier-au-Mont-d'Or",
    statut: 'en_cours',
    date_debut: getTodayDateString(-3),
    date_fin: getTodayDateString(12),
    description: "Pose d'enrochements en granit, plantation d'érables du Japon et réalisation d'une terrasse en bois ipé de 45m². Prévoir motoculteur et mini-pelle.",
    latitude: 45.8166,
    longitude: 4.7983,
    contact_client: 'M. Philippe Laurent',
    telephone_client: '06 70 12 34 56',
  },
  {
    id: CHANTIER_IDS.CEDRES,
    nom_client: 'Résidence Les Cèdres - Taille & Engazonnement',
    adresse: '28 Avenue du Général Leclerc, 69300 Caluire-et-Cuire',
    statut: 'en_cours',
    date_debut: getTodayDateString(-2),
    date_fin: getTodayDateString(4),
    description: 'Rabattage de haie de thuyas sur 120m linéaires, broyage et évacuation des végétaux, préparation du sol et engazonnement rustique.',
    latitude: 45.7952,
    longitude: 4.8489,
    contact_client: 'Syndic Nexity - Mme Petit',
    telephone_client: '04 78 00 11 22',
  },
  {
    id: CHANTIER_IDS.BEAUVALLON,
    nom_client: 'Domaine Beauvallon - Arrosage & Massifs',
    adresse: '5 Rue des Écureuils, 69570 Dardilly',
    statut: 'en_attente',
    date_debut: getTodayDateString(4),
    date_fin: getTodayDateString(14),
    description: "Tranchées légères pour arrosage automatique Rain Bird 4 zones, raccordement électrovannes et plantations de 350 vivaces mellifères avec paillage chanvre.",
    latitude: 45.8055,
    longitude: 4.7521,
    contact_client: 'Mme Claire Beauvallon',
    telephone_client: '06 88 99 00 11',
  },
  {
    id: CHANTIER_IDS.TECHLID,
    nom_client: "Parc Techlid - Bassin d'agrément & Pavage",
    adresse: '120 Allée des Chênes, 69760 Limonest',
    statut: 'en_cours',
    date_debut: getTodayDateString(-1),
    date_fin: getTodayDateString(9),
    description: "Pavage carrossable en dalles grès cérame, création d'un bassin d'ornement avec cascade filtrée et plantations aquatiques.",
    latitude: 45.8360,
    longitude: 4.7730,
    contact_client: 'Techlid Entreprises - M. Voisin',
    telephone_client: '04 72 18 50 00',
  },
];

export function getTodayDateString(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Génère le planning pour 1 bonne semaine (7 jours de J-1 à J+5)
 */
export function generateInitialAffectations(): Affectation[] {
  const affs: Affectation[] = [];
  let counter = 1;

  const add = (chantierId: string, profileId: string, dayOffset: number) => {
    const dateStr = getTodayDateString(dayOffset);
    affs.push({
      id: `a1000000-0000-4000-8000-${String(counter++).padStart(12, '0')}`,
      chantier_id: chantierId,
      profile_id: profileId,
      date_intervention: dateStr,
    });
  };

  // Hier (J-1)
  add(CHANTIER_IDS.LAURENT, PROFILE_IDS.JEAN, -1);
  add(CHANTIER_IDS.LAURENT, PROFILE_IDS.THOMAS, -1);
  add(CHANTIER_IDS.CEDRES, PROFILE_IDS.LUCAS, -1);
  add(CHANTIER_IDS.CEDRES, PROFILE_IDS.ANTOINE, -1);
  add(CHANTIER_IDS.CEDRES, PROFILE_IDS.MARC, -1);

  // Aujourd'hui (J)
  add(CHANTIER_IDS.LAURENT, PROFILE_IDS.JEAN, 0);
  add(CHANTIER_IDS.LAURENT, PROFILE_IDS.THOMAS, 0);
  add(CHANTIER_IDS.LAURENT, PROFILE_IDS.MARC, 0);
  add(CHANTIER_IDS.CEDRES, PROFILE_IDS.LUCAS, 0);
  add(CHANTIER_IDS.CEDRES, PROFILE_IDS.ANTOINE, 0);

  // Demain (J+1)
  add(CHANTIER_IDS.LAURENT, PROFILE_IDS.JEAN, 1);
  add(CHANTIER_IDS.LAURENT, PROFILE_IDS.THOMAS, 1);
  add(CHANTIER_IDS.LAURENT, PROFILE_IDS.MARC, 1);
  add(CHANTIER_IDS.TECHLID, PROFILE_IDS.LUCAS, 1);
  add(CHANTIER_IDS.TECHLID, PROFILE_IDS.ANTOINE, 1);

  // J+2
  add(CHANTIER_IDS.LAURENT, PROFILE_IDS.JEAN, 2);
  add(CHANTIER_IDS.LAURENT, PROFILE_IDS.THOMAS, 2);
  add(CHANTIER_IDS.CEDRES, PROFILE_IDS.MARC, 2);
  add(CHANTIER_IDS.TECHLID, PROFILE_IDS.LUCAS, 2);
  add(CHANTIER_IDS.TECHLID, PROFILE_IDS.ANTOINE, 2);

  // J+3
  add(CHANTIER_IDS.LAURENT, PROFILE_IDS.JEAN, 3);
  add(CHANTIER_IDS.TECHLID, PROFILE_IDS.THOMAS, 3);
  add(CHANTIER_IDS.TECHLID, PROFILE_IDS.LUCAS, 3);
  add(CHANTIER_IDS.TECHLID, PROFILE_IDS.MARC, 3);
  add(CHANTIER_IDS.CEDRES, PROFILE_IDS.ANTOINE, 3);

  // J+4
  add(CHANTIER_IDS.LAURENT, PROFILE_IDS.JEAN, 4);
  add(CHANTIER_IDS.LAURENT, PROFILE_IDS.MARC, 4);
  add(CHANTIER_IDS.TECHLID, PROFILE_IDS.THOMAS, 4);
  add(CHANTIER_IDS.TECHLID, PROFILE_IDS.LUCAS, 4);
  add(CHANTIER_IDS.BEAUVALLON, PROFILE_IDS.ANTOINE, 4);

  // J+5
  add(CHANTIER_IDS.BEAUVALLON, PROFILE_IDS.JEAN, 5);
  add(CHANTIER_IDS.BEAUVALLON, PROFILE_IDS.ANTOINE, 5);
  add(CHANTIER_IDS.BEAUVALLON, PROFILE_IDS.MARC, 5);
  add(CHANTIER_IDS.TECHLID, PROFILE_IDS.THOMAS, 5);
  add(CHANTIER_IDS.TECHLID, PROFILE_IDS.LUCAS, 5);

  return affs;
}

/**
 * Initialise le cache local Dexie si la base est vide.
 */
export async function ensureSeedData() {
  const chantiersCount = await db.chantiers.count();
  if (chantiersCount === 0) {
    await db.chantiers.bulkPut(INITIAL_CHANTIERS);
  }

  const profilesCount = await db.profiles.count();
  if (profilesCount === 0) {
    await db.profiles.bulkPut(INITIAL_PROFILES);
  }

  const affectationsCount = await db.affectations.count();
  if (affectationsCount === 0) {
    await db.affectations.bulkPut(generateInitialAffectations());
  }
}

/**
 * Réinitialise complètement le cache local Dexie aux données propres.
 */
export async function reseedDatabase() {
  await db.pointages.clear();
  await db.chantiers.clear();
  await db.affectations.clear();
  await db.profiles.clear();

  await db.chantiers.bulkPut(INITIAL_CHANTIERS);
  await db.profiles.bulkPut(INITIAL_PROFILES);
  await db.affectations.bulkPut(generateInitialAffectations());
}
