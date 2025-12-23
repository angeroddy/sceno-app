"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Upload, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { createClient } from "@/app/lib/supabase-client";
import Image from "next/image";

// 1. Define the interface based on your DB schema image
interface ComedienProfile {
  prenom: string | null;
  nom: string | null;
  email: string | null;
  photo_url: string | null;
  lien_demo: string | null;
}

export default function ProfilPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  // États pour le profil
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    photoUrl: "",
    demoUrl: "",
  });

  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Charger les données du profil
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('comediens')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          // 2. Cast the data to your interface to fix the 'never' type error
          const userData = data as unknown as ComedienProfile;

          setProfile({
            firstName: userData.prenom || "",
            lastName: userData.nom || "",
            email: userData.email || "",
            photoUrl: userData.photo_url || "",
            demoUrl: userData.lien_demo || "",
          });
        }
      } catch (err) {
        console.error('Erreur chargement profil:', err);
        setError("Impossible de charger le profil");
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [user, supabase]);

  // Gérer le changement de photo
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Sauvegarder le profil
  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      let photoUrl = profile.photoUrl;

      // Upload de la nouvelle photo si présente
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `comediens/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, photoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(filePath);
        photoUrl = publicUrlData.publicUrl;
      }

      // 1. Create a typed object using your interface
      const profileUpdates: ComedienProfile = {
        prenom: profile.firstName,
        nom: profile.lastName,
        email: profile.email,
        photo_url: photoUrl,
        lien_demo: profile.demoUrl || null,
      };

      // 2. Perform the update
      const { error: updateError } = await supabase
        .from('comediens')
        // We cast to 'never' because Supabase types don't recognize the table schema yet.
        // This bypasses the 'never' error and avoids the 'any' linter error.
        .update(profileUpdates as never)
        .eq('auth_user_id', user.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setPhotoFile(null);
      setPhotoPreview(null);

      // Mettre à jour l'URL de la photo
      setProfile(prev => ({ ...prev, photoUrl }));

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
            Mon Profil
          </h1>
          <p className="text-gray-600 text-lg">
            Gérez vos informations personnelles
          </p>
        </div>

        {profileLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#E63832]" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Modification du Profil</CardTitle>
              <CardDescription>
                Mettez à jour vos informations personnelles et votre démo
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
                  <p className="text-sm text-green-800">Profil mis à jour avec succès !</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    placeholder="Votre prénom"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    placeholder="Votre nom"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  disabled
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="votre.email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo">Photo de profil</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-[#E6DAD0] flex items-center justify-center overflow-hidden">
                    {photoPreview || profile.photoUrl ? (
                      <Image
                        src={photoPreview || profile.photoUrl}
                        alt="Photo de profil"
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <User className="w-10 h-10 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      id="photoInput"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                      onClick={() => document.getElementById('photoInput')?.click()}
                    >
                      <Upload className="w-4 h-4" />
                      Télécharger une photo
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="demoUrl">Lien vers votre démo</Label>
                <Input
                  id="demoUrl"
                  value={profile.demoUrl}
                  onChange={(e) => setProfile({ ...profile, demoUrl: e.target.value })}
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div className="flex flex-col md:flex-row gap-3 pt-4">
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
                    'Enregistrer les modifications'
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