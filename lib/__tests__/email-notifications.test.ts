import { buildOpportunityAlertSubject } from "@/lib/email-notifications"

describe("buildOpportunityAlertSubject", () => {
  it("ne met pas le type d'opportunité dans l'objet", () => {
    expect(
      buildOpportunityAlertSubject({
        id: "opportunity-1",
        titre: "Atelier avec la metteuse en scène Nathalie Jacquet",
        type: "stages_ateliers",
        modele: "derniere_minute",
        reduction_pourcentage: 50,
      })
    ).toBe(
      "Dernière minute à - 50 % / Atelier avec la metteuse en scène Nathalie Jacquet"
    )
  })
})
