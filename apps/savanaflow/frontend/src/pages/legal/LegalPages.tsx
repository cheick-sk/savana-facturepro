import { useState } from 'react';

type LegalPage = 'cgv' | 'privacy' | 'terms' | 'cookies';

export default function LegalPage() {
  const [activePage, setActivePage] = useState<LegalPage>('cgv');

  const companyInfo = {
    name: 'SavanaFlow Africa',
    legalForm: 'SARL',
    capital: '1 000 000 FCFA',
    rccm: 'GN-CON-2024-12345',
    nif: 'NIF-2024-67890',
    address: 'Conakry, Guinée',
    email: 'contact@savanaflow.africa',
    phone: '+224 620 00 00 00',
    director: 'Directeur Général',
  };

  const renderCGV = () => (
    <div className="prose prose-lg max-w-none">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Conditions Générales de Vente
      </h1>
      
      <p className="text-gray-600 mb-4">
        <strong>Applicables à compter du 1er janvier 2024</strong>
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">Article 1 - Objet</h2>
      <p className="text-gray-700 mb-4">
        Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre 
        la société {companyInfo.name} et ses clients pour la fourniture de services de gestion commerciale, 
        de point de vente et de facturation. En utilisant nos services, le client accepte sans réserve 
        les présentes CGV. Ces conditions s'appliquent à tous les pays d'Afrique où nos services sont 
        disponibles, avec des adaptations spécifiques selon la législation locale en vigueur.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">Article 2 - Définitions</h2>
      <p className="text-gray-700 mb-4">
        Dans le cadre des présentes CGV, les termes suivants ont la signification ci-après définie :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li><strong>Client</strong> : Toute personne physique ou morale utilisant les services de {companyInfo.name}</li>
        <li><strong>Services</strong> : L'ensemble des solutions logicielles proposées (POS, facturation, gestion de stock)</li>
        <li><strong>Abonnement</strong> : Contrat d'accès aux services pour une durée déterminée</li>
        <li><strong>Partenaire de paiement</strong> : Opérateurs de Mobile Money partenaires (Orange Money, MTN MoMo, Wave, etc.)</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">Article 3 - Services Proposés</h2>
      <p className="text-gray-700 mb-4">
        {companyInfo.name} propose les services suivants adaptés au marché africain :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>Solution de point de vente (POS) multi-devises africaines</li>
        <li>Gestion des stocks multi-magasins avec transferts inter-sites</li>
        <li>Facturation conforme aux exigences fiscales locales</li>
        <li>Programme de fidélité client</li>
        <li>Paiements Mobile Money intégrés (Orange Money, MTN MoMo, Wave, M-Pesa)</li>
        <li>Rapports et analyses en temps réel</li>
        <li>Mode hors-ligne avec synchronisation automatique</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">Article 4 - Tarification</h2>
      <p className="text-gray-700 mb-4">
        Les tarifs sont exprimés dans la devise du pays d'utilisation et sont communiqués avant toute souscription. 
        Ils varient selon les forfaits choisis et le pays d'implantation :
      </p>
      <table className="w-full border-collapse border border-gray-300 mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2">Forfait</th>
            <th className="border border-gray-300 p-2">Prix mensuel (FCFA/GNF)</th>
            <th className="border border-gray-300 p-2">Fonctionnalités</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 p-2">Starter</td>
            <td className="border border-gray-300 p-2">25 000</td>
            <td className="border border-gray-300 p-2">POS, 1 magasin, 1000 produits</td>
          </tr>
          <tr>
            <td className="border border-gray-300 p-2">Business</td>
            <td className="border border-gray-300 p-2">50 000</td>
            <td className="border border-gray-300 p-2">POS + Stock, 3 magasins, 5000 produits</td>
          </tr>
          <tr>
            <td className="border border-gray-300 p-2">Enterprise</td>
            <td className="border border-gray-300 p-2">100 000</td>
            <td className="border border-gray-300 p-2">Toutes fonctionnalités, magasins illimités</td>
          </tr>
        </tbody>
      </table>

      <h2 className="text-xl font-semibold mt-6 mb-3">Article 5 - Paiements</h2>
      <p className="text-gray-700 mb-4">
        Les paiements peuvent être effectués via les moyens suivants, adaptés à chaque pays africain :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li><strong>Mobile Money</strong> : Orange Money, MTN MoMo, Wave, M-Pesa, Airtel Money, Moov Money</li>
        <li><strong>Virement bancaire</strong> : Sur présentation de facture proforma</li>
        <li><strong>Carte bancaire</strong> : Visa, Mastercard via nos partenaires</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">Article 6 - Responsabilités</h2>
      <p className="text-gray-700 mb-4">
        {companyInfo.name} s'engage à assurer la disponibilité et la sécurité des services dans le respect 
        des normes en vigueur. Le client est responsable de l'utilisation de son compte et de la protection 
        de ses identifiants. En cas de force majeure (coupure réseau, catastrophe naturelle, troubles civils), 
        la responsabilité de {companyInfo.name} ne pourra être engagée.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">Article 7 - Propriété Intellectuelle</h2>
      <p className="text-gray-700 mb-4">
        L'ensemble des droits de propriété intellectuelle afférents aux services (logiciels, designs, 
        documentation) reste la propriété exclusive de {companyInfo.name}. Le client dispose d'un droit 
        d'usage non exclusif pendant la durée de son abonnement.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">Article 8 - Résiliation</h2>
      <p className="text-gray-700 mb-4">
        L'abonnement peut être résilié avec un préavis de 30 jours. En cas de non-paiement après mise en 
        demeure, l'accès aux services sera suspendu. Les données du client seront conservées pendant 90 jours 
        puis définitivement supprimées conformément aux réglementations applicables.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">Article 9 - Droit Applicable</h2>
      <p className="text-gray-700 mb-4">
        Les présentes CGV sont régies par le droit guinéen. Tout litige relatif à leur interprétation 
        ou exécution sera soumis aux tribunaux compétents de Conakry, sous réserve des dispositions 
        d'ordre public relatives à la compétence territoriale.
      </p>
    </div>
  );

  const renderPrivacy = () => (
    <div className="prose prose-lg max-w-none">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Politique de Protection des Données Personnelles
      </h1>

      <p className="text-gray-600 mb-4">
        <strong>Dernière mise à jour : Janvier 2024</strong>
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">1. Introduction</h2>
      <p className="text-gray-700 mb-4">
        La protection de vos données personnelles est une priorité pour {companyInfo.name}. Cette politique 
        décrit comment nous collectons, utilisons et protégeons vos informations personnelles dans le respect 
        des législations africaines sur la protection des données, incluant les lois spécifiques de chaque pays 
        où nous opérons (Guinée, Sénégal, Côte d'Ivoire, etc.).
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">2. Données Collectées</h2>
      <p className="text-gray-700 mb-4">
        Nous collectons les catégories de données suivantes :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li><strong>Données d'identification</strong> : nom, prénom, adresse email, numéro de téléphone</li>
        <li><strong>Données professionnelles</strong> : nom de l'entreprise, RCCM, NIF, adresse commerciale</li>
        <li><strong>Données de transaction</strong> : historique des ventes, achats, paiements</li>
        <li><strong>Données techniques</strong> : adresse IP, type de navigateur, logs de connexion</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">3. Finalités du Traitement</h2>
      <p className="text-gray-700 mb-4">
        Vos données sont traitées pour les finalités suivantes :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>Fourniture et amélioration de nos services</li>
        <li>Gestion de votre compte client et facturation</li>
        <li>Communication commerciale avec votre accord</li>
        <li>Respect de nos obligations légales et fiscales</li>
        <li>Sécurité et prévention de la fraude</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">4. Base Juridique</h2>
      <p className="text-gray-700 mb-4">
        Le traitement de vos données repose sur :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>L'exécution du contrat de services</li>
        <li>Votre consentement pour les communications marketing</li>
        <li>Nos obligations légales (conservation des factures, déclarations fiscales)</li>
        <li>Notre intérêt légitime (amélioration des services, sécurité)</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">5. Destinataires des Données</h2>
      <p className="text-gray-700 mb-4">
        Vos données peuvent être transmises à :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>Nos partenaires de paiement (Orange Money, MTN, Wave) pour le traitement des transactions</li>
        <li>Nos sous-traitants techniques (hébergement cloud, support)</li>
        <li>Les autorités fiscales et administratives si requis par la loi</li>
      </ul>
      <p className="text-gray-700 mb-4">
        Nous ne vendons jamais vos données à des tiers.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">6. Durée de Conservation</h2>
      <p className="text-gray-700 mb-4">
        Vos données sont conservées :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>Pendant la durée de votre abonnement</li>
        <li>10 ans pour les documents comptables et fiscaux (conformément aux législations africaines)</li>
        <li>3 ans après votre dernière interaction pour les données marketing</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">7. Vos Droits</h2>
      <p className="text-gray-700 mb-4">
        Conformément aux législations africaines sur la protection des données, vous disposez des droits suivants :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
        <li><strong>Droit de rectification</strong> : corriger vos données inexactes</li>
        <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données</li>
        <li><strong>Droit à la portabilité</strong> : récupérer vos données dans un format structuré</li>
        <li><strong>Droit d'opposition</strong> : vous opposer au traitement pour des motifs légitimes</li>
      </ul>
      <p className="text-gray-700 mb-4">
        Pour exercer ces droits, contactez-nous à : <strong>{companyInfo.email}</strong>
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">8. Sécurité</h2>
      <p className="text-gray-700 mb-4">
        Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>Chiffrement des données en transit (HTTPS/TLS) et au repos</li>
        <li>Authentification sécurisée avec 2FA optionnel</li>
        <li>Sauvegardes quotidiennes avec redondance géographique</li>
        <li>Audit régulier de nos systèmes de sécurité</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">9. Contact</h2>
      <p className="text-gray-700 mb-4">
        Pour toute question relative à cette politique ou pour exercer vos droits :
      </p>
      <p className="text-gray-700 mb-4">
        <strong>{companyInfo.name}</strong><br />
        {companyInfo.address}<br />
        Email : {companyInfo.email}<br />
        Tél : {companyInfo.phone}
      </p>
    </div>
  );

  const renderTerms = () => (
    <div className="prose prose-lg max-w-none">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Conditions Générales d'Utilisation
      </h1>

      <p className="text-gray-600 mb-4">
        <strong>Applicables à compter du 1er janvier 2024</strong>
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptation des Conditions</h2>
      <p className="text-gray-700 mb-4">
        En accédant et en utilisant la plateforme {companyInfo.name}, vous acceptez d'être lié par les 
        présentes Conditions Générales d'Utilisation (CGU). Si vous n'acceptez pas ces conditions, 
        vous ne devez pas utiliser nos services. Ces conditions s'appliquent à tous les utilisateurs 
        situés en Afrique, avec des dispositions spécifiques selon le pays de résidence.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">2. Description des Services</h2>
      <p className="text-gray-700 mb-4">
        {companyInfo.name} est une plateforme SaaS (Software as a Service) de gestion commerciale 
        spécialement conçue pour les entreprises africaines. Elle offre :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>Un système de point de vente (POS) adapté aux réalités africaines</li>
        <li>La gestion multi-magasins avec synchronisation en temps réel</li>
        <li>L'intégration des paiements Mobile Money locaux</li>
        <li>Un mode hors-ligne optimisé pour les zones à connectibilité limitée</li>
        <li>La facturation conforme aux exigences fiscales de chaque pays</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">3. Inscription et Compte</h2>
      <p className="text-gray-700 mb-4">
        Pour utiliser nos services, vous devez créer un compte en fournissant des informations exactes 
        et complètes. Vous êtes responsable de la confidentialité de vos identifiants et de toutes les 
        activités effectuées depuis votre compte. Vous vous engagez à nous informer immédiatement de 
        toute utilisation non autorisée de votre compte.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">4. Utilisation Acceptable</h2>
      <p className="text-gray-700 mb-4">
        Vous vous engagez à utiliser les services uniquement à des fins légales et conformes aux 
        présentes CGU. Sont notamment interdits :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>L'utilisation des services à des fins frauduleuses ou illicites</li>
        <li>La tentative d'accès non autorisé aux systèmes de {companyInfo.name}</li>
        <li>La collecte de données d'autres utilisateurs sans leur consentement</li>
        <li>L'upload de contenu malveillant ou portant atteinte aux droits tiers</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">5. Propriété Intellectuelle</h2>
      <p className="text-gray-700 mb-4">
        Tous les éléments constituant la plateforme (textes, images, logos, logiciels, bases de données) 
        sont la propriété de {companyInfo.name} ou de ses concédants de licence. Aucun transfert de 
        droits de propriété intellectuelle n'est effectué en votre faveur. Vous disposez uniquement 
        d'un droit d'usage limité, non exclusif et révocable sur les services.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">6. Données et Contenu Utilisateur</h2>
      <p className="text-gray-700 mb-4">
        Vous conservez la propriété des données que vous saisissez dans la plateforme (clients, produits, 
        ventes). Vous nous accordez une licence limitée pour héberger et traiter ces données afin de 
        fournir les services. Vous êtes responsable de la légalité du contenu que vous traitez via nos services.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">7. Disponibilité et Maintenance</h2>
      <p className="text-gray-700 mb-4">
        Nous nous efforçons d'assurer une disponibilité maximale de nos services (objectif 99.5%). 
        Des maintenances planifiées peuvent être effectuées avec un préavis de 48 heures. En cas de 
        coupure non planifiée, nous mettons tout en œuvre pour rétablir le service dans les meilleurs délais.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">8. Limitation de Responsabilité</h2>
      <p className="text-gray-700 mb-4">
        Dans la mesure permise par la loi, {companyInfo.name} ne pourra être tenue responsable des 
        dommages indirects, pertes de profits ou de données résultant de l'utilisation des services. 
        Notre responsabilité totale est limitée au montant des sommes versées par le client au cours 
        des 12 derniers mois.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">9. Modification des CGU</h2>
      <p className="text-gray-700 mb-4">
        Nous nous réservons le droit de modifier les présentes CGU. Les utilisateurs seront informés 
        de toute modification significative par email ou notification dans l'application. L'utilisation 
        continue des services après modification vaut acceptation des nouvelles conditions.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">10. Résiliation</h2>
      <p className="text-gray-700 mb-4">
        Vous pouvez résilier votre compte à tout moment depuis les paramètres de votre compte ou en 
        nous contactant. Nous nous réservons le droit de suspendre ou résilier votre accès en cas de 
        violation des présentes CGU ou de non-paiement des factures.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">11. Droit Applicable</h2>
      <p className="text-gray-700 mb-4">
        Les présentes CGU sont régies par le droit guinéen. Tout litige sera soumis aux tribunaux 
        compétents de Conakry, sous réserve des dispositions impératives de protection du consommateur 
        applicables dans votre pays de résidence.
      </p>
    </div>
  );

  const renderCookies = () => (
    <div className="prose prose-lg max-w-none">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Politique de Gestion des Cookies
      </h1>

      <p className="text-gray-600 mb-4">
        <strong>Dernière mise à jour : Janvier 2024</strong>
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">1. Qu'est-ce qu'un Cookie ?</h2>
      <p className="text-gray-700 mb-4">
        Un cookie est un petit fichier texte stocké sur votre appareil (ordinateur, tablette, smartphone) 
        lors de votre visite sur notre site. Il permet de mémoriser des informations sur votre visite 
        et d'améliorer votre expérience utilisateur.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">2. Types de Cookies Utilisés</h2>
      
      <h3 className="text-lg font-medium mt-4 mb-2">Cookies Essentiels</h3>
      <p className="text-gray-700 mb-4">
        Ces cookies sont nécessaires au fonctionnement de la plateforme. Ils permettent :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>L'authentification et la gestion de session</li>
        <li>La mémorisation de votre panier</li>
        <li>Le bon fonctionnement des fonctionnalités de sécurité</li>
      </ul>

      <h3 className="text-lg font-medium mt-4 mb-2">Cookies de Performance</h3>
      <p className="text-gray-700 mb-4">
        Ces cookies nous aident à comprendre comment vous utilisez notre plateforme :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>Pages les plus visitées</li>
        <li>Temps passé sur chaque page</li>
        <li>Erreurs rencontrées</li>
      </ul>

      <h3 className="text-lg font-medium mt-4 mb-2">Cookies de Fonctionnalité</h3>
      <p className="text-gray-700 mb-4">
        Ces cookies permettent de mémoriser vos préférences :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>Langue préférée (français, wolof, swahili, soussou)</li>
        <li>Paramètres d'affichage</li>
        <li>Préférences de notifications</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">3. Cookies Tiers</h2>
      <p className="text-gray-700 mb-4">
        Nous utilisons des services tiers qui peuvent déposer des cookies :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li><strong>Google Analytics</strong> : analyse d'audience (avec anonymisation IP)</li>
        <li><strong>Partenaires Mobile Money</strong> : pour le traitement des paiements</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">4. Gestion des Cookies</h2>
      <p className="text-gray-700 mb-4">
        Vous pouvez gérer vos préférences de cookies de plusieurs façons :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>Via notre bannière de consentement lors de votre première visite</li>
        <li>Dans les paramètres de votre navigateur</li>
        <li>Depuis les paramètres de votre compte {companyInfo.name}</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">5. Durée de Conservation</h2>
      <p className="text-gray-700 mb-4">
        Les cookies ont une durée de vie limitée :
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>Cookies de session : supprimés à la fermeture du navigateur</li>
        <li>Cookies persistants : 13 mois maximum</li>
        <li>Cookies analytiques : 26 mois avec anonymisation</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-3">6. Contact</h2>
      <p className="text-gray-700 mb-4">
        Pour toute question sur notre politique cookies :<br />
        <strong>{companyInfo.email}</strong>
      </p>
    </div>
  );

  const renderContent = () => {
    switch (activePage) {
      case 'cgv':
        return renderCGV();
      case 'privacy':
        return renderPrivacy();
      case 'terms':
        return renderTerms();
      case 'cookies':
        return renderCookies();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm p-4 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents Légaux</h2>
              <ul className="space-y-2">
                {[
                  { key: 'cgv', label: 'Conditions Générales de Vente' },
                  { key: 'privacy', label: 'Politique de Confidentialité' },
                  { key: 'terms', label: "Conditions d'Utilisation" },
                  { key: 'cookies', label: 'Politique Cookies' },
                ].map((item) => (
                  <li key={item.key}>
                    <button
                      onClick={() => setActivePage(item.key as LegalPage)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        activePage === item.key
                          ? 'bg-green-50 text-green-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 bg-white rounded-lg shadow-sm p-8">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
