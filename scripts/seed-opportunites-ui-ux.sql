-- Seed UI/UX: 10 opportunites de demonstration couvrant tous les statuts
-- Utilisation:
--   psql "$DATABASE_URL" -f scripts/seed-opportunites-ui-ux.sql
--
-- Comportement:
-- - Selectionne automatiquement un annonceur existant
-- - Met a jour les lignes si le script est rejoue
-- - Couvre les statuts: en_attente, validee, refusee, expiree, complete, supprimee

DO $$
DECLARE
  v_annonceur_id uuid;
BEGIN
  SELECT id
  INTO v_annonceur_id
  FROM public.annonceurs
  ORDER BY identite_verifiee DESC, created_at ASC
  LIMIT 1;

  IF v_annonceur_id IS NULL THEN
    RAISE EXCEPTION 'Aucun annonceur trouve. Creez d''abord un annonceur avant de lancer ce script.';
  END IF;

  INSERT INTO public.opportunites (
    id,
    annonceur_id,
    type,
    modele,
    titre,
    resume,
    image_url,
    lien_infos,
    prix_base,
    prix_reduit,
    nombre_places,
    places_restantes,
    date_evenement,
    contact_telephone,
    contact_email,
    statut
  )
  VALUES
    (
      '11111111-1111-4111-8111-111111111111',
      v_annonceur_id,
      'stages_ateliers',
      'derniere_minute',
      'Stage intensif camera weekend',
      '<p>Deux jours de pratique camera avec mises en situation, retours individualises et exercices d''interpretation face objectif.</p>',
      'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
      'https://scenio.test/opportunites/stage-camera-weekend',
      240.00,
      150.00,
      12,
      8,
      '2026-03-31T10:00:00+02:00',
      '+33 1 84 80 10 10',
      'contact+uiux1@scenio.test',
      'validee'
    ),
    (
      '22222222-2222-4222-8222-222222222222',
      v_annonceur_id,
      'ecoles_formations',
      'pre_vente',
      'Bootcamp audition theatre musical',
      '<p>Programme complet avec coaching vocal, travail de scene, preparation des auditions et session questions-reponses avec intervenants professionnels.</p>',
      'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=80',
      'https://scenio.test/opportunites/bootcamp-audition',
      390.00,
      260.00,
      20,
      17,
      '2026-06-20T09:30:00+02:00',
      '+33 1 84 80 10 11',
      'contact+uiux2@scenio.test',
      'validee'
    ),
    (
      '33333333-3333-4333-8333-333333333333',
      v_annonceur_id,
      'communication',
      'derniere_minute',
      'Shooting portraits comedien en studio',
      '<p>Session photo avec direction artistique, selection des meilleurs portraits et conseils pour optimiser vos visuels de candidature.</p>',
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80',
      'https://scenio.test/opportunites/shooting-portraits-studio',
      180.00,
      120.00,
      8,
      0,
      '2026-04-01T14:00:00+02:00',
      '+33 1 84 80 10 12',
      'contact+uiux3@scenio.test',
      'complete'
    ),
    (
      '44444444-4444-4444-8444-444444444444',
      v_annonceur_id,
      'coachs_independants',
      'pre_vente',
      'Accompagnement self-tape premium',
      '<p>Parcours avec feedback personnalise, lecture de scene, reglages techniques et plan d''action pour vos prochains castings.</p>',
      'https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&w=1200&q=80',
      'https://scenio.test/opportunites/self-tape-premium',
      320.00,
      220.00,
      10,
      10,
      '2026-07-10T18:30:00+02:00',
      '+33 1 84 80 10 13',
      'contact+uiux4@scenio.test',
      'en_attente'
    ),
    (
      '55555555-5555-4555-8555-555555555555',
      v_annonceur_id,
      'stages_ateliers',
      'pre_vente',
      'Masterclass jeu et prise de parole',
      '<p>Masterclass de groupe pour travailler presence, respiration, articulation et confiance devant un public ou une camera.</p>',
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
      'https://scenio.test/opportunites/masterclass-prise-parole',
      280.00,
      180.00,
      16,
      16,
      '2026-06-28T19:00:00+02:00',
      NULL,
      'contact+uiux5@scenio.test',
      'en_attente'
    ),
    (
      '66666666-6666-4666-8666-666666666666',
      v_annonceur_id,
      'communication',
      'pre_vente',
      'Creation bande demo cinema',
      '<p>Accompagnement sur la selection des extraits, le montage narratif et la coherence globale de votre bande demo professionnelle.</p>',
      NULL,
      'https://scenio.test/opportunites/bande-demo-cinema',
      450.00,
      300.00,
      6,
      6,
      '2026-08-15T11:00:00+02:00',
      '+33 6 12 34 56 78',
      'contact+uiux6@scenio.test',
      'refusee'
    ),
    (
      '77777777-7777-4777-8777-777777777777',
      v_annonceur_id,
      'ecoles_formations',
      'pre_vente',
      'Cycle long preparation concours',
      '<p>Preparation structuree avec travail de texte, culture generale artistique et simulations d''entretien pour concours d''ecoles.</p>',
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
      'https://scenio.test/opportunites/preparation-concours',
      520.00,
      360.00,
      14,
      14,
      '2026-09-12T09:00:00+02:00',
      '+33 1 84 80 10 15',
      'contact+uiux7@scenio.test',
      'refusee'
    ),
    (
      '88888888-8888-4888-8888-888888888888',
      v_annonceur_id,
      'coachs_independants',
      'derniere_minute',
      'Coaching express casting pub',
      '<p>Session orientee efficacite avec travail sur l''energie, l''adresse camera et l''adaptation rapide aux indications de casting.</p>',
      'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
      'https://scenio.test/opportunites/coaching-casting-pub',
      140.00,
      95.00,
      5,
      2,
      '2026-03-24T16:00:00+01:00',
      '+33 1 84 80 10 16',
      'contact+uiux8@scenio.test',
      'expiree'
    ),
    (
      '99999999-9999-4999-8999-999999999999',
      v_annonceur_id,
      'stages_ateliers',
      'derniere_minute',
      'Laboratoire improvisation face camera',
      '<p>Improvisations filmees, revision des intentions et debrief collectif pour fluidifier votre jeu dans des formats courts et rapides.</p>',
      'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80',
      'https://scenio.test/opportunites/laboratoire-impro-camera',
      160.00,
      110.00,
      10,
      4,
      '2026-04-02T20:00:00+02:00',
      NULL,
      'contact+uiux9@scenio.test',
      'supprimee'
    ),
    (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      v_annonceur_id,
      'communication',
      'pre_vente',
      'Atelier personal branding artiste',
      '<p>Travail sur votre positionnement, vos supports de communication et la coherence de votre presentation professionnelle en ligne.</p>',
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
      'https://scenio.test/opportunites/personal-branding-artiste',
      210.00,
      145.00,
      18,
      9,
      '2026-05-30T10:30:00+02:00',
      '+33 1 84 80 10 17',
      'contact+uiux10@scenio.test',
      'supprimee'
    )
  ON CONFLICT (id) DO UPDATE
  SET
    annonceur_id = EXCLUDED.annonceur_id,
    type = EXCLUDED.type,
    modele = EXCLUDED.modele,
    titre = EXCLUDED.titre,
    resume = EXCLUDED.resume,
    image_url = EXCLUDED.image_url,
    lien_infos = EXCLUDED.lien_infos,
    prix_base = EXCLUDED.prix_base,
    prix_reduit = EXCLUDED.prix_reduit,
    nombre_places = EXCLUDED.nombre_places,
    places_restantes = EXCLUDED.places_restantes,
    date_evenement = EXCLUDED.date_evenement,
    contact_telephone = EXCLUDED.contact_telephone,
    contact_email = EXCLUDED.contact_email,
    statut = EXCLUDED.statut,
    updated_at = NOW();
END $$;
