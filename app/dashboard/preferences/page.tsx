"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { createClient } from "@/app/lib/supabase-client";
import type { OpportunityType } from "@/app/types";
import { OPPORTUNITY_TYPE_LABELS } from "@/app/types";

// Interface pour typer la réponse Supabase
interface ComedienPreferences {
  preferences_opportunites: OpportunityType[] | null;
}

export default function PreferencesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

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

  // Charger les préférences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('comediens')
          .select('preferences_opportunites')
          .eq('auth_user_id', user.id)
          .single<ComedienPreferences>();

        if (error) throw error;

        if (data && data.preferences_opportunites) {
          // Convertir le format de base de données vers le format de l'interface
          const prefs = data.preferences_opportunites as OpportunityType[];
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

      const { error: updateError } = await supabase
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

              <div className="pt-4 flex gap-3">
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
        </div>
    </div>
  );
}
