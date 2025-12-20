"use client"

import { Navbar01 } from "@/components/ui/shadcn-io/navbar-01";
import { Footer } from "../../components/Footer";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { createClient } from "@/app/lib/supabase-client";
import type { OpportunityType, OPPORTUNITY_TYPE_LABELS } from "@/app/types";

export default function PreferencesPage() {
  const router = useRouter();
  const { user, isAuthenticated, userType, logout } = useAuth();
  const supabase = createClient();

  // États pour les préférences
  const [preferences, setPreferences] = useState<Record<OpportunityType, boolean>>({
    stages_ateliers: false,
    ecoles_formations: false,
    coachs_independants: false,
    communication: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Charger les préférences
  useEffect(() => {
    if (!user) {
      router.push('/connexion');
      return;
    }

    if (userType !== 'comedian') {
      router.push('/dashboard');
      return;
    }

    loadPreferences();
  }, [user, userType]);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('comediens')
        .select('preferences_opportunites')
        .eq('auth_user_id', user!.id)
        .single();

      if (fetchError) {
        console.error('Erreur lors du chargement des préférences:', fetchError);
        setError('Erreur lors du chargement de vos préférences');
        return;
      }

      if (data && data.preferences_opportunites) {
        // Convertir le tableau en objet pour faciliter la manipulation
        const prefsObject: Record<OpportunityType, boolean> = {
          stages_ateliers: false,
          ecoles_formations: false,
          coachs_independants: false,
          communication: false,
        };

        data.preferences_opportunites.forEach((pref: OpportunityType) => {
          prefsObject[pref] = true;
        });

        setPreferences(prefsObject);
      }
    } catch (err) {
      console.error('Erreur inattendue:', err);
      setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = (key: OpportunityType) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    setError("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      // Validation : au moins une préférence doit être sélectionnée
      const hasAtLeastOne = Object.values(preferences).some(value => value);
      if (!hasAtLeastOne) {
        setError("Veuillez sélectionner au moins un type d'opportunité");
        setIsSaving(false);
        return;
      }

      // Convertir l'objet en tableau pour la base de données
      const selectedPreferences: OpportunityType[] = (Object.keys(preferences) as OpportunityType[])
        .filter(key => preferences[key]);

      console.log('Sauvegarde des préférences:', selectedPreferences);

      // Mettre à jour les préférences
      const { error: updateError } = await supabase
        .from('comediens')
        .update({
          preferences_opportunites: selectedPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_user_id', user!.id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour:', updateError);
        setError(`Erreur lors de la sauvegarde: ${updateError.message}`);
        return;
      }

      setSuccess("Préférences mises à jour avec succès !");

      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        setSuccess("");
      }, 3000);

    } catch (err) {
      console.error('Erreur inattendue:', err);
      setError("Une erreur inattendue s'est produite");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="relative w-full">
          <Navbar01
            className="bg-[#E6DAD0]"
            isAuthenticated={isAuthenticated}
            userType={userType === 'comedian' ? 'comedian' : 'advertiser'}
            onLogout={logout}
          />
        </div>
        <div className="min-h-screen bg-gradient-to-b from-[#F5F0EB] to-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#E63832]" />
            <p className="text-gray-600">Chargement de vos préférences...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="relative w-full">
        <Navbar01
          className="bg-[#E6DAD0]"
          isAuthenticated={isAuthenticated}
          userType={userType === 'comedian' ? 'comedian' : 'advertiser'}
          onLogout={logout}
        />
      </div>

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

          {/* Messages de succès et d'erreur */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
              <CheckCircle2 className="w-5 h-5" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {/* Preferences Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Mes Préférences</CardTitle>
              <CardDescription>
                Choisissez les types d&apos;opportunités que vous souhaitez recevoir
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Types d&apos;opportunités
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (Sélectionnez au moins une option)
                  </span>
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {/* Stages / Ateliers */}
                  <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-[#E6DAD0]/20 transition-colors">
                    <Checkbox
                      id="stages_ateliers"
                      checked={preferences.stages_ateliers}
                      onCheckedChange={() => handlePreferenceChange("stages_ateliers")}
                      disabled={isSaving}
                    />
                    <div className="flex-1">
                      <label htmlFor="stages_ateliers" className="cursor-pointer">
                        <div className="font-medium">Stages / Ateliers</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Recevez des notifications pour les stages et ateliers de formation
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Écoles / Formations */}
                  <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-[#E6DAD0]/20 transition-colors">
                    <Checkbox
                      id="ecoles_formations"
                      checked={preferences.ecoles_formations}
                      onCheckedChange={() => handlePreferenceChange("ecoles_formations")}
                      disabled={isSaving}
                    />
                    <div className="flex-1">
                      <label htmlFor="ecoles_formations" className="cursor-pointer">
                        <div className="font-medium">Écoles / Conservatoires / Cycles de formation</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Formations longues, conservatoires, cours du soir et cycles diplômants
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Coachs indépendants */}
                  <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-[#E6DAD0]/20 transition-colors">
                    <Checkbox
                      id="coachs_independants"
                      checked={preferences.coachs_independants}
                      onCheckedChange={() => handlePreferenceChange("coachs_independants")}
                      disabled={isSaving}
                    />
                    <div className="flex-1">
                      <label htmlFor="coachs_independants" className="cursor-pointer">
                        <div className="font-medium">Coachs indépendants</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Coaching personnalisé et accompagnement individuel
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Communication */}
                  <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-[#E6DAD0]/20 transition-colors">
                    <Checkbox
                      id="communication"
                      checked={preferences.communication}
                      onCheckedChange={() => handlePreferenceChange("communication")}
                      disabled={isSaving}
                    />
                    <div className="flex-1">
                      <label htmlFor="communication" className="cursor-pointer">
                        <div className="font-medium">Photos / Démo / Communication</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Sessions photos professionnelles, création de bandes démo, sites internet
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <Bell className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <strong>Comment ça marche ?</strong>
                      <p className="mt-1">
                        Vous recevrez des notifications par email uniquement pour les types d&apos;opportunités que vous avez sélectionnés. Vous pouvez modifier vos préférences à tout moment.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    className="w-full md:w-auto bg-[#E63832] hover:bg-[#E63832]/90"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
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
                    disabled={isSaving}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </>
  );
}