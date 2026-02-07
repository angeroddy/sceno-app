"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, ArrowLeft, Loader2, CheckCircle, ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { createBrowserSupabaseClient } from "@/app/lib/supabase-client";
import type { OpportunityType } from "@/app/types";
import { OPPORTUNITY_TYPE_LABELS } from "@/app/types";

export default function PreferencesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createBrowserSupabaseClient();

  type ComedienRow = {
    id: string;
    auth_user_id: string;
    nom: string;
    prenom: string;
    email: string;
    photo_url: string | null;
    lien_demo: string | null;
    preferences_opportunites: OpportunityType[];
    email_verifie: boolean;
    created_at: string;
    updated_at: string;
  };

  // États pour les préférences
  const [preferences, setPreferences] = useState({
    stages_ateliers: false,
    ecoles_formations: false,
    coachs_independants: false,
    communication: false,
  });

  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [blockedLoading, setBlockedLoading] = useState(true);
  const [blockedError, setBlockedError] = useState("");
  const [blockedAnnonceurs, setBlockedAnnonceurs] = useState<Array<{ annonceur_id: string; annonceur: { nom_formation: string; email: string } | null }>>([]);

  // Charger les préférences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('comediens')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (error) throw error;

        const comedienData = data as ComedienRow | null;

        if (comedienData && comedienData.preferences_opportunites) {
          // Convertir le format de base de données vers le format de l'interface
          const prefs = comedienData.preferences_opportunites;
          setPreferences({
            stages_ateliers: prefs.includes('stages_ateliers'),
            ecoles_formations: prefs.includes('ecoles_formations'),
            coachs_independants: prefs.includes('coachs_independants'),
            communication: prefs.includes('communication'),
          });
        }
      } catch (err) {
        console.error('Erreur chargement préférences:', err);
        setError("Impossible de charger les préférences");
      } finally {
        setPreferencesLoading(false);
      }
    };

    loadPreferences();
  }, [user, supabase]);

  useEffect(() => {
    const loadBlocked = async () => {
      if (!user) return;
      try {
        setBlockedLoading(true);
        const response = await fetch("/api/comedien/annonceurs-bloques");
        if (!response.ok) {
          throw new Error("Impossible de charger les organismes bloqués");
        }
        const data = await response.json();
        setBlockedAnnonceurs(data.annonceurs || []);
      } catch (err) {
        console.error("Erreur chargement bloqués:", err);
        setBlockedError("Impossible de charger les organismes bloqués");
      } finally {
        setBlockedLoading(false);
      }
    };

    loadBlocked();
  }, [user]);

  const handlePreferenceChange = (key: OpportunityType) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      // Convertir le format de l'interface vers le format de base de données
      const preferencesArray: OpportunityType[] = [];
      if (preferences.stages_ateliers) preferencesArray.push('stages_ateliers');
      if (preferences.ecoles_formations) preferencesArray.push('ecoles_formations');
      if (preferences.coachs_independants) preferencesArray.push('coachs_independants');
      if (preferences.communication) preferencesArray.push('communication');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('comediens')
        .update({
          preferences_opportunites: preferencesArray,
        })
        .eq('auth_user_id', user.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (annonceurId: string) => {
    try {
      const response = await fetch("/api/comedien/annonceurs-bloques", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annonceur_id: annonceurId }),
      });
      if (!response.ok) {
        throw new Error("Erreur lors du déblocage");
      }
      setBlockedAnnonceurs(prev => prev.filter((row) => row.annonceur_id !== annonceurId));
    } catch (err) {
      console.error("Erreur déblocage:", err);
      setBlockedError("Impossible de débloquer l'organisme");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F0EB] to-white">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6 flex items-center gap-2"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Mes Préférences
          </h1>
          <p className="text-gray-600 text-lg">
            Personnalisez les opportunités que vous recevez
          </p>
        </div>

        {/* Preferences Card */}
        {preferencesLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#E63832]" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Mes Préférences</CardTitle>
              <CardDescription>
                Choisissez les types d&apos;opportunités que vous souhaitez recevoir
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800">Préférences mises à jour avec succès !</p>
                </div>
              )}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Types d&apos;opportunités</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-[#E6DAD0]/20 transition-colors">
                    <Checkbox
                      id="stages_ateliers"
                      checked={preferences.stages_ateliers}
                      onCheckedChange={() => handlePreferenceChange("stages_ateliers")}
                    />
                    <label htmlFor="stages_ateliers" className="flex-1 cursor-pointer font-medium">
                      {OPPORTUNITY_TYPE_LABELS.stages_ateliers}
                    </label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-[#E6DAD0]/20 transition-colors">
                    <Checkbox
                      id="ecoles_formations"
                      checked={preferences.ecoles_formations}
                      onCheckedChange={() => handlePreferenceChange("ecoles_formations")}
                    />
                    <label htmlFor="ecoles_formations" className="flex-1 cursor-pointer font-medium">
                      {OPPORTUNITY_TYPE_LABELS.ecoles_formations}
                    </label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-[#E6DAD0]/20 transition-colors">
                    <Checkbox
                      id="coachs_independants"
                      checked={preferences.coachs_independants}
                      onCheckedChange={() => handlePreferenceChange("coachs_independants")}
                    />
                    <label htmlFor="coachs_independants" className="flex-1 cursor-pointer font-medium">
                      {OPPORTUNITY_TYPE_LABELS.coachs_independants}
                    </label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-[#E6DAD0]/20 transition-colors">
                    <Checkbox
                      id="communication"
                      checked={preferences.communication}
                      onCheckedChange={() => handlePreferenceChange("communication")}
                    />
                    <label htmlFor="communication" className="flex-1 cursor-pointer font-medium">
                      {OPPORTUNITY_TYPE_LABELS.communication}
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col md:flex-row gap-3">
                <Button
                  className="w-full md:w-auto bg-[#E63832] hover:bg-[#E63832]/90"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Enregistrer mes préférences
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full md:w-auto"
                  onClick={() => router.push('/dashboard')}
                  disabled={saving}
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Organismes bloqués</CardTitle>
              <CardDescription>
                Gérez la liste des organismes dont vous ne souhaitez plus recevoir d'opportunités
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {blockedError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-800">{blockedError}</p>
                </div>
              )}
              {blockedLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-[#E63832]" />
                </div>
              ) : blockedAnnonceurs.length === 0 ? (
                <div className="text-sm text-gray-600">
                  Aucun organisme bloqué pour le moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedAnnonceurs.map((row) => (
                    <div key={row.annonceur_id} className="flex items-center justify-between border rounded-md p-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {row.annonceur?.nom_formation || "Organisme"}
                        </div>
                        <div className="text-sm text-gray-600">{row.annonceur?.email || ""}</div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleUnblock(row.annonceur_id)}
                        className="border-[#E63832] text-[#E63832] hover:bg-[#E63832]/10"
                      >
                        <ShieldOff className="w-4 h-4 mr-2" />
                        Débloquer
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
