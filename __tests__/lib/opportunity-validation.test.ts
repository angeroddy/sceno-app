import { createOpportunitySchema } from '@/app/lib/opportunity-validation'

describe('createOpportunitySchema', () => {
  const basePayload = {
    type: 'stages_ateliers',
    modele: 'pre_vente',
    titre: 'Stage intensif de theatre',
    resume: '<p>Une description suffisamment longue pour passer la validation.</p>',
    image_url: null,
    lien_infos: '',
    prix_base: 100,
    prix_reduit: 70,
    nombre_places: 10,
    date_evenement: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    contact_email: 'contact@example.com',
  }

  it('accepte un téléphone vide ou null pour un champ optionnel', () => {
    const emptyPhone = createOpportunitySchema.safeParse({
      ...basePayload,
      contact_telephone: '',
    })
    const nullPhone = createOpportunitySchema.safeParse({
      ...basePayload,
      contact_telephone: null,
    })

    expect(emptyPhone.success).toBe(true)
    expect(nullPhone.success).toBe(true)

    if (emptyPhone.success) {
      expect(emptyPhone.data.contact_telephone).toBeNull()
    }
    if (nullPhone.success) {
      expect(nullPhone.data.contact_telephone).toBeNull()
    }
  })
})
