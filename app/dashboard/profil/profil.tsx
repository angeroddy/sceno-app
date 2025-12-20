"use client"

import { Navbar01 } from "@/components/ui/shadcn-io/navbar-01";
import { Footer } from "../../components/Footer";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Upload, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { createClient } from "@/app/lib/supabase-client";
import type { Comedien } from "@/app/types";

export default function ProfilPage() {
  const router = useRouter();
  const { user, isAuthenticated, userType, logout } = useAuth();
  const supabase = createClient();

  // États pour le profil
  const [profile, setProfile] = useState<Partial<Comedien>>({
    prenom: "",
    nom: "",
    email: "",
    photo_url: null,
    lien_demo: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Charger les données du profil
  useEffect(() => {
    if (!user) {
      router.push('/connexion');
      return;
    }

    if (userType !== 'comedian') {
      router.push('/dashboard');
      return;
    }

    loadProfile();
  }, [user, userType]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('comediens')
        .select('*')
        .eq('auth_user_id', user!.id)
        .single();

      if (fetchError) {
        console.error('Erreur lors du chargement du profil:', fetchError);
        setError('Erreur lors du chargement de votre profil');
        return;
      }

      if (data) {
        setProfile(data);
        if (data.photo_url) {
          setPhotoPreview(data.photo_url);
        }
      }
    } catch (err) {
      console.error('Erreur inattendue:', err);
      setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier la taille du fichier (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('La photo ne doit pas dépasser 5 MB');
        return;
      }

      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        setError('Veuillez sélectionner une image valide');
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      setIsUploadingPhoto(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
      const filePath = `comediens/${fileName}`;

      console.log('Upload de la photo:', { fileName, filePath });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Erreur upload photo:', uploadError);
        throw uploadError;
      }

      console.log('Photo uploadée avec succès:', uploadData);

      // Récupérer l'URL publique
      const { data } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      // Validation
      if (!profile.prenom?.trim()) {
        setError("Le prénom est obligatoire");
        setIsSaving(false);
        return;
      }

      if (!profile.nom?.trim()) {
        setError("Le nom est obligatoire");
        setIsSaving(false);
        return;
      }

      if (!profile.email?.trim()) {
        setError("L'email est obligatoire");
        setIsSaving(false);
        return;
      }

      // Validation format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profile.email)) {
        setError("Veuillez entrer une adresse e-mail valide");
        setIsSaving(false);
        return;
      }

      // Upload de la nouvelle photo si nécessaire
      let photoUrl = profile.photo_url;
      if (photoFile) {
        const uploadedUrl = await uploadPhoto(photoFile);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        } else {
          setError("Erreur lors de l'upload de la photo, mais les autres données seront sauvegardées");
        }
      }

      // Mettre à jour le profil
      const { error: updateError } = await supabase
        .from('comediens')
        .update({
          prenom: profile.prenom,
          nom: profile.nom,
          email: profile.email,
          photo_url: photoUrl,
          lien_demo: profile.lien_demo || null,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_user_id', user!.id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour:', updateError);
        setError(`Erreur lors de la sauvegarde: ${updateError.message}`);
        return;
      }

      // Mettre à jour l'email dans Supabase Auth si changé
      if (profile.email !== user!.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profile.email
        });

        if (emailError) {
          console.error('Erreur lors de la mise à jour de l\'email:', emailError);
          setError("Profil sauvegardé mais l'email n'a pas pu être mis à jour dans le système d'authentification");
        }
      }

      setSuccess("Profil mis à jour avec succès !");
      setPhotoFile(null);

      // Recharger le profil
      await loadProfile();

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
            <p className="text-gray-600">Chargement de votre profil...</p>
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
              Mon Profil
            </h1>
            <p className="text-gray-600 text-lg">
              Gérez vos informations personnelles
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

          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Modification du Profil</CardTitle>
              <CardDescription>
                Mettez à jour vos informations personnelles et votre démo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    Prénom <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={profile.prenom || ""}
                    onChange={(e) => {
                      setProfile({ ...profile, prenom: e.target.value });
                      setError("");
                    }}
                    placeholder="Votre prénom"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Nom <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={profile.nom || ""}
                    onChange={(e) => {
                      setProfile({ ...profile, nom: e.target.value });
                      setError("");
                    }}
                    placeholder="Votre nom"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) => {
                    setProfile({ ...profile, email: e.target.value });
                    setError("");
                  }}
                  placeholder="votre.email@example.com"
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  Si vous changez votre email, vous devrez le vérifier à nouveau
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo">Photo de profil</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-[#E6DAD0] flex items-center justify-center overflow-hidden">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Photo de profil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-gray-600" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="photo">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex items-center gap-2 cursor-pointer"
                        disabled={isSaving || isUploadingPhoto}
                        asChild
                      >
                        <span>
                          {isUploadingPhoto ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Upload en cours...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Télécharger une photo
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                    <input
                      id="photo"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                      disabled={isSaving || isUploadingPhoto}
                    />
                    {photoFile && (
                      <span className="text-xs text-muted-foreground">
                        Nouvelle photo : {photoFile.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="demoUrl">Lien vers votre démo</Label>
                <Input
                  id="demoUrl"
                  value={profile.lien_demo || ""}
                  onChange={(e) => {
                    setProfile({ ...profile, lien_demo: e.target.value });
                    setError("");
                  }}
                  placeholder="https://youtube.com/..."
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  Partagez un lien vers votre bande démo (YouTube, Vimeo, etc.)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  className="w-full md:w-auto bg-[#E63832] hover:bg-[#E63832]/90"
                  onClick={handleSave}
                  disabled={isSaving || isUploadingPhoto}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer les modifications"
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
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </>
  );
}