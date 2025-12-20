# Documentation des Tests - Scenio App

Cette documentation décrit l'architecture de tests pour le flow d'authentification de l'application Scenio.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Configuration](#configuration)
3. [Structure des tests](#structure-des-tests)
4. [Exécution des tests](#exécution-des-tests)
5. [Tests disponibles](#tests-disponibles)
6. [Bonnes pratiques](#bonnes-pratiques)

## Vue d'ensemble

Les tests couvrent l'ensemble du flow d'authentification :
- **Inscription** : Formulaire en 3 étapes avec validation
- **Connexion** : Authentification avec email/mot de passe
- **Dashboard** : Protection des routes et affichage conditionnel
- **Déconnexion** : Logout et redirection

## Configuration

### Dépendances installées

- `jest` : Framework de tests
- `@testing-library/react` : Utilitaires pour tester les composants React
- `@testing-library/jest-dom` : Matchers personnalisés pour Jest
- `@testing-library/user-event` : Simulation des interactions utilisateur
- `jest-environment-jsdom` : Environnement DOM pour Jest

### Fichiers de configuration

- `jest.config.ts` : Configuration principale de Jest
- `jest.setup.ts` : Setup global (mocks de window.matchMedia, IntersectionObserver)
- `__mocks__/` : Mocks des modules externes (Supabase, Next.js)

## Structure des tests

```
scenio-app/
├── __mocks__/                          # Mocks globaux
│   ├── supabase.ts                     # Mock du client Supabase
│   └── next/
│       └── navigation.ts               # Mock de next/navigation
├── __tests__/                          # Tests d'intégration
│   └── integration/
│       └── auth-flow.test.tsx          # Tests du flow complet
├── app/
│   ├── hooks/
│   │   └── __tests__/
│   │       └── useAuth.test.ts         # Tests du hook useAuth
│   └── dashboard/
│       └── __tests__/
│           └── layout.test.tsx         # Tests du DashboardLayout
└── components/
    └── __tests__/
        ├── login-form.test.tsx         # Tests du formulaire de connexion
        └── comedian-signup-form.test.tsx # Tests du formulaire d'inscription
```

## Exécution des tests

### Commandes disponibles

```bash
# Exécuter tous les tests
npm test

# Exécuter les tests en mode watch (redémarrage automatique)
npm run test:watch

# Exécuter les tests avec rapport de couverture
npm run test:coverage

# Exécuter uniquement les tests d'intégration
npm run test:integration
```

### Exemples d'utilisation

```bash
# Tester un fichier spécifique
npm test login-form.test

# Tester avec verbose pour plus de détails
npm test -- --verbose

# Tester avec un pattern
npm test -- --testNamePattern="devrait afficher"
```

## Tests disponibles

### 1. Tests du hook useAuth (`app/hooks/__tests__/useAuth.test.ts`)

**Coverage :**
- ✅ Initialisation avec état de chargement
- ✅ Récupération de la session utilisateur
- ✅ Identification du type d'utilisateur (comédien/annonceur)
- ✅ Gestion des utilisateurs sans profil
- ✅ Déconnexion et redirection
- ✅ Changements d'état d'authentification
- ✅ Nettoyage des abonnements

**Exemple :**
```typescript
it('devrait définir l\'utilisateur quand une session existe', async () => {
  // Test que le hook récupère correctement la session
})
```

### 2. Tests du formulaire de connexion (`components/__tests__/login-form.test.tsx`)

**Coverage :**
- ✅ Rendu des champs du formulaire
- ✅ Validation email vide
- ✅ Validation format email
- ✅ Validation mot de passe vide
- ✅ Connexion réussie
- ✅ Identifiants incorrects
- ✅ Email non confirmé
- ✅ Affichage du loader
- ✅ Désactivation des champs pendant la soumission
- ✅ Gestion des erreurs réseau

**Exemple :**
```typescript
it('devrait se connecter avec succès avec des identifiants valides', async () => {
  // Test du flow de connexion complet
})
```

### 3. Tests du formulaire d'inscription (`components/__tests__/comedian-signup-form.test.tsx`)

**Coverage :**
- ✅ Rendu des 3 étapes du formulaire
- ✅ Navigation entre les étapes
- ✅ Validation étape 1 (préférences)
- ✅ Validation étape 2 (informations personnelles)
- ✅ Validation étape 3 (compte)
- ✅ Conservation des données lors de la navigation
- ✅ Soumission réussie
- ✅ Gestion des erreurs (email existant, etc.)
- ✅ Sélection de préférences multiples
- ✅ Affichage du loader

**Exemple :**
```typescript
it('devrait créer un compte avec succès', async () => {
  // Test du processus complet d'inscription en 3 étapes
})
```

### 4. Tests du DashboardLayout (`app/dashboard/__tests__/layout.test.tsx`)

**Coverage :**
- ✅ Affichage du loader pendant le chargement
- ✅ Redirection si non authentifié
- ✅ Affichage du layout pour utilisateur authentifié
- ✅ Distinction comédien/annonceur
- ✅ Fonction de déconnexion
- ✅ Transitions d'état
- ✅ Rendu des composants enfants

**Exemple :**
```typescript
it('devrait rediriger vers /connexion si non authentifié', async () => {
  // Test de la protection des routes
})
```

### 5. Tests d'intégration (`__tests__/integration/auth-flow.test.tsx`)

**Coverage :**
- ✅ Scénario complet : Inscription → Connexion → Dashboard
- ✅ Scénario d'échec : Email déjà utilisé
- ✅ Scénario d'échec : Identifiants incorrects
- ✅ Validation du format email
- ✅ Validation de la correspondance des mots de passe
- ✅ Validation de la longueur minimale du mot de passe
- ✅ Enregistrement des préférences multiples

**Exemple :**
```typescript
it('devrait permettre à un utilisateur de s\'inscrire, se connecter et accéder au dashboard', async () => {
  // Test du flow complet end-to-end
})
```

## Bonnes pratiques

### 1. Organisation des tests

- **Unit tests** : Testent des composants/fonctions isolés
- **Integration tests** : Testent les interactions entre plusieurs composants
- Utilisez des noms de tests descriptifs en français
- Groupez les tests par fonctionnalité avec `describe`

### 2. Assertions

```typescript
// ✅ Bon
expect(screen.getByText('Connexion')).toBeInTheDocument()

// ❌ Éviter
expect(true).toBe(true)
```

### 3. User events

Préférez `@testing-library/user-event` à `fireEvent` pour simuler les interactions :

```typescript
// ✅ Préféré
const user = userEvent.setup()
await user.click(button)
await user.type(input, 'text')

// ❌ Éviter
fireEvent.click(button)
```

### 4. Attentes asynchrones

Utilisez `waitFor` pour les opérations asynchrones :

```typescript
await waitFor(() => {
  expect(screen.getByText('Succès')).toBeInTheDocument()
})
```

### 5. Nettoyage

- Jest nettoie automatiquement le DOM entre les tests
- Pensez à `jest.clearAllMocks()` dans `beforeEach`

### 6. Mocks

- Les mocks globaux sont dans `__mocks__/`
- Les mocks spécifiques sont dans les fichiers de test
- Toujours restaurer les mocks après les tests

## Debugging

### Afficher le DOM actuel

```typescript
import { screen } from '@testing-library/react'

// Afficher tout le DOM
screen.debug()

// Afficher un élément spécifique
screen.debug(screen.getByRole('button'))
```

### Logs

```typescript
console.log(screen.getByRole('button').textContent)
```

### Mode verbose

```bash
npm test -- --verbose
```

## Couverture de code

Pour générer un rapport de couverture :

```bash
npm run test:coverage
```

Le rapport sera généré dans `coverage/lcov-report/index.html`

### Objectifs de couverture

- **Statements** : > 80%
- **Branches** : > 75%
- **Functions** : > 80%
- **Lines** : > 80%

## CI/CD

Pour intégrer les tests dans un pipeline CI/CD :

```yaml
# Exemple GitHub Actions
- name: Run tests
  run: npm test -- --ci --coverage --maxWorkers=2
```

## Ressources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Next.js Testing](https://nextjs.org/docs/testing)

## Support

Pour toute question ou problème avec les tests, consultez :
1. Cette documentation
2. Les commentaires dans les fichiers de test
3. La documentation Jest/RTL
