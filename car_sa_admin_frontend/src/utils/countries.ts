/** Countries a garage can be registered in (same list as the mobile app). */
export const COUNTRIES = [
  'Rwanda',
  'Burundi',
  'Uganda',
  'Tanzania',
  'Kenya',
  'Democratic Republic of Congo',
  'Ghana',
  'Cameroon',
  "Côte d'Ivoire",
] as const;

/** The only document a garage must upload when registering. */
export const ID_DOCUMENT = { type: 'national_id', label: 'ID Document (National ID or Passport)' } as const;
