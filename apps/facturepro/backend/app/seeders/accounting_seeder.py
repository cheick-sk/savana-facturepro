"""OHADA PCG (Plan Comptable Général) Seeder — FacturePro Africa.

This module seeds the complete OHADA Chart of Accounts used in 17 African countries:
- Benin, Burkina Faso, Cameroon, Central African Republic, Chad, Comoros,
- Congo (Brazzaville), Côte d'Ivoire, Democratic Republic of Congo, Gabon,
- Guinea, Guinea-Bissau, Equatorial Guinea, Mali, Niger, Senegal, Togo

The OHADA PCG has 8 classes:
- Classe 1: Comptes de capitaux (Capital accounts)
- Classe 2: Comptes d'immobilisations (Fixed assets)
- Classe 3: Comptes de stocks (Inventories)
- Classe 4: Comptes de tiers (Third party accounts)
- Classe 5: Comptes de trésorerie (Cash and banks)
- Classe 6: Comptes de charges (Expenses)
- Classe 7: Comptes de produits (Income/Revenue)
- Classe 8: Comptes spéciaux (Special accounts)
"""
from __future__ import annotations

from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.accounting import Account, Journal, TaxRate, DefaultAccount

# ── OHADA PCG - Complete Chart of Accounts ───────────────────────────────

OHADA_CHART_OF_ACCOUNTS: List[Dict[str, Any]] = [
    # ═══════════════════════════════════════════════════════════════════
    # CLASSE 1: COMPTES DE CAPITAUX (Capital Accounts)
    # ═══════════════════════════════════════════════════════════════════
    {"number": "10", "name": "Capital et réserves", "account_type": "equity", "category": "classe_1", "allow_manual_entry": False},
    {"number": "101", "name": "Capital social", "account_type": "equity", "category": "classe_1", "parent_number": "10"},
    {"number": "1011", "name": "Capital souscrit non appelé", "account_type": "equity", "category": "classe_1", "parent_number": "101"},
    {"number": "1012", "name": "Capital souscrit appelé non versé", "account_type": "equity", "category": "classe_1", "parent_number": "101"},
    {"number": "1013", "name": "Capital souscrit appelé versé", "account_type": "equity", "category": "classe_1", "parent_number": "101"},
    {"number": "10131", "name": "Capital non amorti", "account_type": "equity", "category": "classe_1", "parent_number": "1013"},
    {"number": "10132", "name": "Capital amorti", "account_type": "equity", "category": "classe_1", "parent_number": "1013"},
    {"number": "102", "name": "Capital non appelé", "account_type": "equity", "category": "classe_1", "parent_number": "10"},
    {"number": "103", "name": "Écarts de réévaluation", "account_type": "equity", "category": "classe_1", "parent_number": "10"},
    {"number": "104", "name": "Primes liées aux capitaux propres", "account_type": "equity", "category": "classe_1", "parent_number": "10"},
    {"number": "1041", "name": "Primes d'émission", "account_type": "equity", "category": "classe_1", "parent_number": "104"},
    {"number": "1042", "name": "Primes d'apport", "account_type": "equity", "category": "classe_1", "parent_number": "104"},
    {"number": "1043", "name": "Primes de fusion", "account_type": "equity", "category": "classe_1", "parent_number": "104"},
    {"number": "1044", "name": "Primes de conversion", "account_type": "equity", "category": "classe_1", "parent_number": "104"},
    {"number": "105", "name": "Écarts d'équivalence", "account_type": "equity", "category": "classe_1", "parent_number": "10"},
    {"number": "106", "name": "Réserves", "account_type": "equity", "category": "classe_1", "parent_number": "10"},
    {"number": "1061", "name": "Réserve légale", "account_type": "equity", "category": "classe_1", "parent_number": "106"},
    {"number": "1062", "name": "Réserves statutaires ou contractuelles", "account_type": "equity", "category": "classe_1", "parent_number": "106"},
    {"number": "1063", "name": "Réserves réglementées", "account_type": "equity", "category": "classe_1", "parent_number": "106"},
    {"number": "1064", "name": "Réserves facultatives", "account_type": "equity", "category": "classe_1", "parent_number": "106"},
    {"number": "1068", "name": "Autres réserves", "account_type": "equity", "category": "classe_1", "parent_number": "106"},
    {"number": "107", "name": "Écart d'évaluation", "account_type": "equity", "category": "classe_1", "parent_number": "10"},
    {"number": "108", "name": "Compte de l'exploitant", "account_type": "equity", "category": "classe_1", "parent_number": "10"},
    {"number": "1081", "name": "Compte de l'exploitant - Apports", "account_type": "equity", "category": "classe_1", "parent_number": "108"},
    {"number": "1082", "name": "Compte de l'exploitant - Retraits", "account_type": "equity", "category": "classe_1", "parent_number": "108"},
    {"number": "109", "name": "Actionnaires, capital souscrit non appelé", "account_type": "asset", "category": "classe_1", "parent_number": "10"},
    
    {"number": "11", "name": "Report à nouveau", "account_type": "equity", "category": "classe_1"},
    {"number": "111", "name": "Report à nouveau créditeur (bénéfices antérieurs)", "account_type": "equity", "category": "classe_1", "parent_number": "11"},
    {"number": "112", "name": "Report à nouveau débiteur (pertes antérieures)", "account_type": "equity", "category": "classe_1", "parent_number": "11"},
    {"number": "118", "name": "Compte de l'exploitant", "account_type": "equity", "category": "classe_1", "parent_number": "11"},
    
    {"number": "12", "name": "Résultat de l'exercice", "account_type": "equity", "category": "classe_1"},
    {"number": "121", "name": "Résultat de l'exercice (bénéfice)", "account_type": "equity", "category": "classe_1", "parent_number": "12"},
    {"number": "129", "name": "Résultat de l'exercice (perte)", "account_type": "equity", "category": "classe_1", "parent_number": "12"},
    
    {"number": "13", "name": "Subventions d'investissement", "account_type": "equity", "category": "classe_1"},
    {"number": "131", "name": "Subventions d'équipement", "account_type": "equity", "category": "classe_1", "parent_number": "13"},
    {"number": "138", "name": "Autres subventions d'investissement", "account_type": "equity", "category": "classe_1", "parent_number": "13"},
    {"number": "139", "name": "Subventions d'investissement inscrites au résultat", "account_type": "equity", "category": "classe_1", "parent_number": "13"},
    
    {"number": "14", "name": "Provisions réglementées", "account_type": "equity", "category": "classe_1"},
    {"number": "141", "name": "Provisions pour risques et charges", "account_type": "equity", "category": "classe_1", "parent_number": "14"},
    {"number": "142", "name": "Provisions réglementées relatives aux immobilisations", "account_type": "equity", "category": "classe_1", "parent_number": "14"},
    {"number": "143", "name": "Provisions réglementées relatives aux stocks", "account_type": "equity", "category": "classe_1", "parent_number": "14"},
    {"number": "144", "name": "Provisions pour investissements (participations des salariés)", "account_type": "equity", "category": "classe_1", "parent_number": "14"},
    {"number": "145", "name": "Amortissements dérogatoires", "account_type": "equity", "category": "classe_1", "parent_number": "14"},
    {"number": "146", "name": "Plus-values réinvesties", "account_type": "equity", "category": "classe_1", "parent_number": "14"},
    {"number": "148", "name": "Autres provisions réglementées", "account_type": "equity", "category": "classe_1", "parent_number": "14"},
    
    {"number": "15", "name": "Dettes et provisions pour risques et charges", "account_type": "liability", "category": "classe_1"},
    {"number": "151", "name": "Provisions pour risques", "account_type": "liability", "category": "classe_1", "parent_number": "15"},
    {"number": "1511", "name": "Provisions pour litiges", "account_type": "liability", "category": "classe_1", "parent_number": "151"},
    {"number": "1512", "name": "Provisions pour garanties données", "account_type": "liability", "category": "classe_1", "parent_number": "151"},
    {"number": "1513", "name": "Provisions pour pertes sur marchés", "account_type": "liability", "category": "classe_1", "parent_number": "151"},
    {"number": "1514", "name": "Provisions pour amendes et pénalités", "account_type": "liability", "category": "classe_1", "parent_number": "151"},
    {"number": "1518", "name": "Autres provisions pour risques", "account_type": "liability", "category": "classe_1", "parent_number": "151"},
    {"number": "152", "name": "Provisions pour charges", "account_type": "liability", "category": "classe_1", "parent_number": "15"},
    {"number": "1521", "name": "Provisions pour gros entretiens ou grandes réparations", "account_type": "liability", "category": "classe_1", "parent_number": "152"},
    {"number": "1522", "name": "Provisions pour charges à payer", "account_type": "liability", "category": "classe_1", "parent_number": "152"},
    {"number": "1523", "name": "Provisions pour restructurations", "account_type": "liability", "category": "classe_1", "parent_number": "152"},
    {"number": "1524", "name": "Provisions pour congés à payer", "account_type": "liability", "category": "classe_1", "parent_number": "152"},
    {"number": "1528", "name": "Autres provisions pour charges", "account_type": "liability", "category": "classe_1", "parent_number": "152"},
    
    {"number": "16", "name": "Emprunts et dettes assimilées", "account_type": "liability", "category": "classe_1"},
    {"number": "161", "name": "Emprunts obligataires", "account_type": "liability", "category": "classe_1", "parent_number": "16"},
    {"number": "162", "name": "Emprunts auprès des établissements de crédit", "account_type": "liability", "category": "classe_1", "parent_number": "16"},
    {"number": "163", "name": "Avances reçues de l'État", "account_type": "liability", "category": "classe_1", "parent_number": "16"},
    {"number": "164", "name": "Emprunts auprès des associés", "account_type": "liability", "category": "classe_1", "parent_number": "16"},
    {"number": "165", "name": "Dépôts et cautionnements reçus", "account_type": "liability", "category": "classe_1", "parent_number": "16"},
    {"number": "166", "name": "Intérêts courus sur emprunts", "account_type": "liability", "category": "classe_1", "parent_number": "16"},
    {"number": "167", "name": "Dettes de location-acquisition", "account_type": "liability", "category": "classe_1", "parent_number": "16"},
    {"number": "168", "name": "Autres emprunts et dettes assimilées", "account_type": "liability", "category": "classe_1", "parent_number": "16"},
    {"number": "169", "name": "Primes de remboursement des obligations", "account_type": "liability", "category": "classe_1", "parent_number": "16"},
    
    {"number": "17", "name": "Dettes rattachées à des participations", "account_type": "liability", "category": "classe_1"},
    {"number": "171", "name": "Dettes rattachées à des participations (groupe)", "account_type": "liability", "category": "classe_1", "parent_number": "17"},
    {"number": "172", "name": "Dettes rattachées à des participations (hors groupe)", "account_type": "liability", "category": "classe_1", "parent_number": "17"},
    {"number": "173", "name": "Dettes rattachées à des participations (détention conjointe)", "account_type": "liability", "category": "classe_1", "parent_number": "17"},
    {"number": "174", "name": "Dettes rattachées à des participations (associés)", "account_type": "liability", "category": "classe_1", "parent_number": "17"},
    {"number": "178", "name": "Dettes rattachées à des participations (autres)", "account_type": "liability", "category": "classe_1", "parent_number": "17"},
    
    {"number": "18", "name": "Comptes de liaison des établissements", "account_type": "liability", "category": "classe_1"},
    {"number": "181", "name": "Comptes de liaison des établissements (débiteur)", "account_type": "asset", "category": "classe_1", "parent_number": "18"},
    {"number": "182", "name": "Comptes de liaison des établissements (créditeur)", "account_type": "liability", "category": "classe_1", "parent_number": "18"},
    
    # ═══════════════════════════════════════════════════════════════════
    # CLASSE 2: COMPTES D'IMMOBILISATIONS (Fixed Assets)
    # ═══════════════════════════════════════════════════════════════════
    {"number": "20", "name": "Charges immobilisées", "account_type": "asset", "category": "classe_2", "allow_manual_entry": False},
    {"number": "201", "name": "Frais d'établissement", "account_type": "asset", "category": "classe_2", "parent_number": "20"},
    {"number": "2011", "name": "Frais de constitution", "account_type": "asset", "category": "classe_2", "parent_number": "201"},
    {"number": "2012", "name": "Frais de premier établissement", "account_type": "asset", "category": "classe_2", "parent_number": "201"},
    {"number": "2013", "name": "Frais d'augmentation de capital et d'opérations diverses", "account_type": "asset", "category": "classe_2", "parent_number": "201"},
    {"number": "202", "name": "Charges à répartir", "account_type": "asset", "category": "classe_2", "parent_number": "20"},
    {"number": "203", "name": "Frais de recherche et de développement", "account_type": "asset", "category": "classe_2", "parent_number": "20"},
    {"number": "204", "name": "Frais d'emprunt", "account_type": "asset", "category": "classe_2", "parent_number": "20"},
    
    {"number": "21", "name": "Immobilisations incorporelles", "account_type": "asset", "category": "classe_2"},
    {"number": "211", "name": "Investissements de recherche", "account_type": "asset", "category": "classe_2", "parent_number": "21"},
    {"number": "2111", "name": "Investissements de recherche - Valeur d'entrée", "account_type": "asset", "category": "classe_2", "parent_number": "211"},
    {"number": "2118", "name": "Investissements de recherche - Amortissements", "account_type": "asset", "category": "classe_2", "parent_number": "211"},
    {"number": "212", "name": "Brevets, licences, logiciels et droits similaires", "account_type": "asset", "category": "classe_2", "parent_number": "21"},
    {"number": "2121", "name": "Brevets", "account_type": "asset", "category": "classe_2", "parent_number": "212"},
    {"number": "2122", "name": "Licences", "account_type": "asset", "category": "classe_2", "parent_number": "212"},
    {"number": "2123", "name": "Logiciels", "account_type": "asset", "category": "classe_2", "parent_number": "212"},
    {"number": "2124", "name": "Droits au bail", "account_type": "asset", "category": "classe_2", "parent_number": "212"},
    {"number": "213", "name": "Fonds commercial", "account_type": "asset", "category": "classe_2", "parent_number": "21"},
    {"number": "214", "name": "Marques", "account_type": "asset", "category": "classe_2", "parent_number": "21"},
    {"number": "215", "name": "Droit au bail", "account_type": "asset", "category": "classe_2", "parent_number": "21"},
    {"number": "218", "name": "Autres immobilisations incorporelles", "account_type": "asset", "category": "classe_2", "parent_number": "21"},
    
    {"number": "22", "name": "Terrains", "account_type": "asset", "category": "classe_2"},
    {"number": "221", "name": "Terrains nus", "account_type": "asset", "category": "classe_2", "parent_number": "22"},
    {"number": "222", "name": "Terrains aménagés", "account_type": "asset", "category": "classe_2", "parent_number": "22"},
    {"number": "223", "name": "Sous-sols et sur-sols", "account_type": "asset", "category": "classe_2", "parent_number": "22"},
    {"number": "224", "name": "Terrains de gisement", "account_type": "asset", "category": "classe_2", "parent_number": "22"},
    {"number": "225", "name": "Carrières et gisements", "account_type": "asset", "category": "classe_2", "parent_number": "22"},
    {"number": "226", "name": "Œuvres d'art", "account_type": "asset", "category": "classe_2", "parent_number": "22"},
    {"number": "228", "name": "Autres terrains", "account_type": "asset", "category": "classe_2", "parent_number": "22"},
    
    {"number": "23", "name": "Bâtiments, installations techniques et agencements", "account_type": "asset", "category": "classe_2"},
    {"number": "231", "name": "Bâtiments", "account_type": "asset", "category": "classe_2", "parent_number": "23"},
    {"number": "2311", "name": "Bâtiments industriels", "account_type": "asset", "category": "classe_2", "parent_number": "231"},
    {"number": "2312", "name": "Bâtiments administratifs et commerciaux", "account_type": "asset", "category": "classe_2", "parent_number": "231"},
    {"number": "2313", "name": "Bâtiments à usage d'habitation", "account_type": "asset", "category": "classe_2", "parent_number": "231"},
    {"number": "232", "name": "Installations techniques", "account_type": "asset", "category": "classe_2", "parent_number": "23"},
    {"number": "2321", "name": "Installations techniques - Matériel et outillage industriels", "account_type": "asset", "category": "classe_2", "parent_number": "232"},
    {"number": "233", "name": "Ouvrages d'infrastructure", "account_type": "asset", "category": "classe_2", "parent_number": "23"},
    {"number": "234", "name": "Constructions sur sol d'autrui", "account_type": "asset", "category": "classe_2", "parent_number": "23"},
    {"number": "235", "name": "Aménagements de bureaux", "account_type": "asset", "category": "classe_2", "parent_number": "23"},
    {"number": "238", "name": "Autres constructions", "account_type": "asset", "category": "classe_2", "parent_number": "23"},
    
    {"number": "24", "name": "Matériel", "account_type": "asset", "category": "classe_2"},
    {"number": "241", "name": "Matériel et outillage industriels", "account_type": "asset", "category": "classe_2", "parent_number": "24"},
    {"number": "242", "name": "Matériel de transport", "account_type": "asset", "category": "classe_2", "parent_number": "24"},
    {"number": "243", "name": "Matériel de bureau et informatique", "account_type": "asset", "category": "classe_2", "parent_number": "24"},
    {"number": "244", "name": "Mobilier", "account_type": "asset", "category": "classe_2", "parent_number": "24"},
    {"number": "245", "name": "Matériel agricole", "account_type": "asset", "category": "classe_2", "parent_number": "24"},
    {"number": "246", "name": "Emballages récupérables identifiables", "account_type": "asset", "category": "classe_2", "parent_number": "24"},
    {"number": "247", "name": "Agencements et aménagements de matériel", "account_type": "asset", "category": "classe_2", "parent_number": "24"},
    {"number": "248", "name": "Autres matériels", "account_type": "asset", "category": "classe_2", "parent_number": "24"},
    
    {"number": "25", "name": "Avances et acomptes versés sur commandes d'immobilisations", "account_type": "asset", "category": "classe_2"},
    {"number": "251", "name": "Avances et acomptes versés sur immobilisations incorporelles", "account_type": "asset", "category": "classe_2", "parent_number": "25"},
    {"number": "252", "name": "Avances et acomptes versés sur immobilisations corporelles", "account_type": "asset", "category": "classe_2", "parent_number": "25"},
    
    {"number": "26", "name": "Titres de participation", "account_type": "asset", "category": "classe_2"},
    {"number": "261", "name": "Titres de participation", "account_type": "asset", "category": "classe_2", "parent_number": "26"},
    {"number": "262", "name": "Titres évalués par équivalence", "account_type": "asset", "category": "classe_2", "parent_number": "26"},
    {"number": "263", "name": "Autres titres de participation", "account_type": "asset", "category": "classe_2", "parent_number": "26"},
    {"number": "265", "name": "Dépôts et cautionnements versés", "account_type": "asset", "category": "classe_2", "parent_number": "26"},
    {"number": "266", "name": "Prêts", "account_type": "asset", "category": "classe_2", "parent_number": "26"},
    {"number": "267", "name": "Autres créances assimilées", "account_type": "asset", "category": "classe_2", "parent_number": "26"},
    {"number": "268", "name": "Créances rattachées à des participations", "account_type": "asset", "category": "classe_2", "parent_number": "26"},
    
    {"number": "27", "name": "Autres immobilisations financières", "account_type": "asset", "category": "classe_2"},
    {"number": "271", "name": "Titres immobilisés autres que les titres de participation", "account_type": "asset", "category": "classe_2", "parent_number": "27"},
    {"number": "272", "name": "Créances immobilisées", "account_type": "asset", "category": "classe_2", "parent_number": "27"},
    {"number": "274", "name": "Prêts et créances sur participations", "account_type": "asset", "category": "classe_2", "parent_number": "27"},
    {"number": "275", "name": "Dépôts et cautionnements versés", "account_type": "asset", "category": "classe_2", "parent_number": "27"},
    {"number": "276", "name": "Autres créances financières", "account_type": "asset", "category": "classe_2", "parent_number": "27"},
    
    {"number": "28", "name": "Amortissements des immobilisations", "account_type": "asset", "category": "classe_2"},
    {"number": "281", "name": "Amortissements des charges immobilisées", "account_type": "asset", "category": "classe_2", "parent_number": "28"},
    {"number": "2811", "name": "Amortissements des frais d'établissement", "account_type": "asset", "category": "classe_2", "parent_number": "281"},
    {"number": "2812", "name": "Amortissements des charges à répartir", "account_type": "asset", "category": "classe_2", "parent_number": "281"},
    {"number": "2813", "name": "Amortissements des frais de recherche et de développement", "account_type": "asset", "category": "classe_2", "parent_number": "281"},
    {"number": "282", "name": "Amortissements des immobilisations incorporelles", "account_type": "asset", "category": "classe_2", "parent_number": "28"},
    {"number": "283", "name": "Amortissements des terrains", "account_type": "asset", "category": "classe_2", "parent_number": "28"},
    {"number": "284", "name": "Amortissements des bâtiments, installations techniques et agencements", "account_type": "asset", "category": "classe_2", "parent_number": "28"},
    {"number": "285", "name": "Amortissements du matériel", "account_type": "asset", "category": "classe_2", "parent_number": "28"},
    
    {"number": "29", "name": "Dépréciations des immobilisations", "account_type": "asset", "category": "classe_2"},
    {"number": "291", "name": "Dépréciations des charges immobilisées", "account_type": "asset", "category": "classe_2", "parent_number": "29"},
    {"number": "292", "name": "Dépréciations des immobilisations incorporelles", "account_type": "asset", "category": "classe_2", "parent_number": "29"},
    {"number": "293", "name": "Dépréciations des terrains", "account_type": "asset", "category": "classe_2", "parent_number": "29"},
    {"number": "294", "name": "Dépréciations des bâtiments, installations techniques et agencements", "account_type": "asset", "category": "classe_2", "parent_number": "29"},
    {"number": "295", "name": "Dépréciations du matériel", "account_type": "asset", "category": "classe_2", "parent_number": "29"},
    {"number": "296", "name": "Dépréciations des titres de participation", "account_type": "asset", "category": "classe_2", "parent_number": "29"},
    {"number": "297", "name": "Dépréciations des autres immobilisations financières", "account_type": "asset", "category": "classe_2", "parent_number": "29"},
    
    # ═══════════════════════════════════════════════════════════════════
    # CLASSE 3: COMPTES DE STOCKS (Inventories)
    # ═══════════════════════════════════════════════════════════════════
    {"number": "30", "name": "Stocks de marchandises", "account_type": "asset", "category": "classe_3", "allow_manual_entry": False},
    {"number": "301", "name": "Marchandises", "account_type": "asset", "category": "classe_3", "parent_number": "30"},
    {"number": "302", "name": "Marchandises : Produits finis", "account_type": "asset", "category": "classe_3", "parent_number": "30"},
    {"number": "303", "name": "Marchandises : Produits intermédiaires et résiduels", "account_type": "asset", "category": "classe_3", "parent_number": "30"},
    
    {"number": "31", "name": "Matières premières et fournitures liées", "account_type": "asset", "category": "classe_3"},
    {"number": "311", "name": "Matières premières", "account_type": "asset", "category": "classe_3", "parent_number": "31"},
    {"number": "312", "name": "Matières consommables", "account_type": "asset", "category": "classe_3", "parent_number": "31"},
    {"number": "313", "name": "Produits intermédiaires et résiduels", "account_type": "asset", "category": "classe_3", "parent_number": "31"},
    {"number": "314", "name": "Produits finis", "account_type": "asset", "category": "classe_3", "parent_number": "31"},
    {"number": "315", "name": "Produits en cours", "account_type": "asset", "category": "classe_3", "parent_number": "31"},
    
    {"number": "32", "name": "Autres approvisionnements", "account_type": "asset", "category": "classe_3"},
    {"number": "321", "name": "Fournitures consommables", "account_type": "asset", "category": "classe_3", "parent_number": "32"},
    {"number": "322", "name": "Fournitures d'atelier et d'usine", "account_type": "asset", "category": "classe_3", "parent_number": "32"},
    {"number": "323", "name": "Fournitures de magasin", "account_type": "asset", "category": "classe_3", "parent_number": "32"},
    {"number": "324", "name": "Fournitures de bureau", "account_type": "asset", "category": "classe_3", "parent_number": "32"},
    {"number": "325", "name": "Combustibles", "account_type": "asset", "category": "classe_3", "parent_number": "32"},
    {"number": "326", "name": "Produits d'entretien", "account_type": "asset", "category": "classe_3", "parent_number": "32"},
    {"number": "327", "name": "Fournitures d'emballage", "account_type": "asset", "category": "classe_3", "parent_number": "32"},
    {"number": "328", "name": "Autres approvisionnements", "account_type": "asset", "category": "classe_3", "parent_number": "32"},
    
    {"number": "33", "name": "En-cours de production de biens", "account_type": "asset", "category": "classe_3"},
    {"number": "331", "name": "Produits en cours", "account_type": "asset", "category": "classe_3", "parent_number": "33"},
    {"number": "335", "name": "Travaux en cours", "account_type": "asset", "category": "classe_3", "parent_number": "33"},
    
    {"number": "34", "name": "En-cours de production de services", "account_type": "asset", "category": "classe_3"},
    {"number": "341", "name": "Études en cours", "account_type": "asset", "category": "classe_3", "parent_number": "34"},
    {"number": "345", "name": "Prestations de services en cours", "account_type": "asset", "category": "classe_3", "parent_number": "34"},
    
    {"number": "35", "name": "Stocks de produits", "account_type": "asset", "category": "classe_3"},
    {"number": "351", "name": "Produits intermédiaires", "account_type": "asset", "category": "classe_3", "parent_number": "35"},
    {"number": "352", "name": "Produits finis", "account_type": "asset", "category": "classe_3", "parent_number": "35"},
    {"number": "353", "name": "Produits résiduels", "account_type": "asset", "category": "classe_3", "parent_number": "35"},
    {"number": "354", "name": "Produits en cours", "account_type": "asset", "category": "classe_3", "parent_number": "35"},
    {"number": "355", "name": "Travaux en cours", "account_type": "asset", "category": "classe_3", "parent_number": "35"},
    {"number": "356", "name": "Études en cours", "account_type": "asset", "category": "classe_3", "parent_number": "35"},
    {"number": "357", "name": "Prestations de services en cours", "account_type": "asset", "category": "classe_3", "parent_number": "35"},
    
    {"number": "36", "name": "Stocks provenant d'immobilisations", "account_type": "asset", "category": "classe_3"},
    
    {"number": "37", "name": "Stocks à l'extérieur", "account_type": "asset", "category": "classe_3"},
    {"number": "371", "name": "Marchandises en dépôt ou en consignation", "account_type": "asset", "category": "classe_3", "parent_number": "37"},
    {"number": "375", "name": "Autres stocks à l'extérieur", "account_type": "asset", "category": "classe_3", "parent_number": "37"},
    
    {"number": "38", "name": "Stocks en cours de route, en attente de réception", "account_type": "asset", "category": "classe_3"},
    
    {"number": "39", "name": "Dépréciations des stocks", "account_type": "asset", "category": "classe_3"},
    {"number": "390", "name": "Dépréciations des stocks de marchandises", "account_type": "asset", "category": "classe_3", "parent_number": "39"},
    {"number": "391", "name": "Dépréciations des matières premières et fournitures liées", "account_type": "asset", "category": "classe_3", "parent_number": "39"},
    {"number": "392", "name": "Dépréciations des autres approvisionnements", "account_type": "asset", "category": "classe_3", "parent_number": "39"},
    {"number": "393", "name": "Dépréciations des en-cours de production de biens", "account_type": "asset", "category": "classe_3", "parent_number": "39"},
    {"number": "394", "name": "Dépréciations des en-cours de production de services", "account_type": "asset", "category": "classe_3", "parent_number": "39"},
    {"number": "395", "name": "Dépréciations des stocks de produits", "account_type": "asset", "category": "classe_3", "parent_number": "39"},
    
    # ═══════════════════════════════════════════════════════════════════
    # CLASSE 4: COMPTES DE TIERS (Third Party Accounts)
    # ═══════════════════════════════════════════════════════════════════
    {"number": "40", "name": "Fournisseurs et comptes rattachés", "account_type": "liability", "category": "classe_4", "allow_manual_entry": False},
    {"number": "401", "name": "Fournisseurs", "account_type": "liability", "category": "classe_4", "parent_number": "40"},
    {"number": "4011", "name": "Fournisseurs - Achats de biens ou de prestations de services", "account_type": "liability", "category": "classe_4", "parent_number": "401"},
    {"number": "4017", "name": "Fournisseurs - Retenues de garantie", "account_type": "liability", "category": "classe_4", "parent_number": "401"},
    {"number": "402", "name": "Fournisseurs d'immobilisations", "account_type": "liability", "category": "classe_4", "parent_number": "40"},
    {"number": "403", "name": "Fournisseurs - Effets à payer", "account_type": "liability", "category": "classe_4", "parent_number": "40"},
    {"number": "404", "name": "Fournisseurs d'immobilisations - Effets à payer", "account_type": "liability", "category": "classe_4", "parent_number": "40"},
    {"number": "405", "name": "Fournisseurs d'immobilisations - Retenues de garantie", "account_type": "liability", "category": "classe_4", "parent_number": "40"},
    {"number": "408", "name": "Fournisseurs - Factures non parvenues", "account_type": "liability", "category": "classe_4", "parent_number": "40"},
    {"number": "409", "name": "Fournisseurs débiteurs", "account_type": "asset", "category": "classe_4", "parent_number": "40"},
    {"number": "4091", "name": "Fournisseurs - Avances et acomptes versés", "account_type": "asset", "category": "classe_4", "parent_number": "409"},
    {"number": "4096", "name": "Fournisseurs - Créances pour emballages à rendre", "account_type": "asset", "category": "classe_4", "parent_number": "409"},
    {"number": "4098", "name": "Fournisseurs - Rabais, ristournes, remises à obtenir", "account_type": "asset", "category": "classe_4", "parent_number": "409"},
    
    {"number": "41", "name": "Clients et comptes rattachés", "account_type": "asset", "category": "classe_4", "allow_manual_entry": False},
    {"number": "411", "name": "Clients", "account_type": "asset", "category": "classe_4", "parent_number": "41"},
    {"number": "4111", "name": "Clients - Ventes de biens ou de prestations de services", "account_type": "asset", "category": "classe_4", "parent_number": "411"},
    {"number": "4117", "name": "Clients - Retenues de garantie", "account_type": "asset", "category": "classe_4", "parent_number": "411"},
    {"number": "412", "name": "Clients - Effets à recevoir", "account_type": "asset", "category": "classe_4", "parent_number": "41"},
    {"number": "413", "name": "Clients douteux ou litigieux", "account_type": "asset", "category": "classe_4", "parent_number": "41"},
    {"number": "416", "name": "Clients douteux ou litigieux", "account_type": "asset", "category": "classe_4", "parent_number": "41"},
    {"number": "417", "name": "Clients - Dettes pour emballages consignés", "account_type": "liability", "category": "classe_4", "parent_number": "41"},
    {"number": "418", "name": "Clients - Produits non encore facturés", "account_type": "asset", "category": "classe_4", "parent_number": "41"},
    {"number": "419", "name": "Clients créditeurs", "account_type": "liability", "category": "classe_4", "parent_number": "41"},
    {"number": "4191", "name": "Clients - Avances et acomptes reçus", "account_type": "liability", "category": "classe_4", "parent_number": "419"},
    {"number": "4196", "name": "Clients - Dettes pour emballages consignés", "account_type": "liability", "category": "classe_4", "parent_number": "419"},
    {"number": "4197", "name": "Clients - Autres avoirs", "account_type": "liability", "category": "classe_4", "parent_number": "419"},
    {"number": "4198", "name": "Clients - Rabais, ristournes, remises à accorder", "account_type": "liability", "category": "classe_4", "parent_number": "419"},
    
    {"number": "42", "name": "Personnel et comptes rattachés", "account_type": "liability", "category": "classe_4"},
    {"number": "421", "name": "Personnel - Rémunérations dues", "account_type": "liability", "category": "classe_4", "parent_number": "42"},
    {"number": "422", "name": "Dettes sur avantages octroyés au personnel", "account_type": "liability", "category": "classe_4", "parent_number": "42"},
    {"number": "424", "name": "Participation des salariés aux résultats", "account_type": "liability", "category": "classe_4", "parent_number": "42"},
    {"number": "425", "name": "Personnel - Avances et acomptes", "account_type": "asset", "category": "classe_4", "parent_number": "42"},
    {"number": "426", "name": "Personnel - Dépôts", "account_type": "liability", "category": "classe_4", "parent_number": "42"},
    {"number": "427", "name": "Personnel - Oppositions", "account_type": "liability", "category": "classe_4", "parent_number": "42"},
    {"number": "428", "name": "Personnel - Charges à payer et produits à recevoir", "account_type": "liability", "category": "classe_4", "parent_number": "42"},
    
    {"number": "43", "name": "Sécurité sociale et autres organismes sociaux", "account_type": "liability", "category": "classe_4"},
    {"number": "431", "name": "Sécurité sociale", "account_type": "liability", "category": "classe_4", "parent_number": "43"},
    {"number": "432", "name": "Autres organismes sociaux", "account_type": "liability", "category": "classe_4", "parent_number": "43"},
    {"number": "433", "name": "Caisse de retraite", "account_type": "liability", "category": "classe_4", "parent_number": "43"},
    {"number": "437", "name": "Autres organismes sociaux", "account_type": "liability", "category": "classe_4", "parent_number": "43"},
    {"number": "438", "name": "Organismes sociaux - Charges à payer et produits à recevoir", "account_type": "liability", "category": "classe_4", "parent_number": "43"},
    
    {"number": "44", "name": "État et autres collectivités publiques", "account_type": "liability", "category": "classe_4"},
    {"number": "441", "name": "État - Subventions à recevoir", "account_type": "asset", "category": "classe_4", "parent_number": "44"},
    {"number": "442", "name": "État - Impôts et taxes recouvrables sur des tiers", "account_type": "asset", "category": "classe_4", "parent_number": "44"},
    {"number": "443", "name": "Opérations particulières avec l'État", "account_type": "liability", "category": "classe_4", "parent_number": "44"},
    {"number": "444", "name": "État - Impôts sur les bénéfices", "account_type": "liability", "category": "classe_4", "parent_number": "44"},
    {"number": "445", "name": "État - Taxes sur le chiffre d'affaires", "account_type": "liability", "category": "classe_4", "parent_number": "44"},
    {"number": "4456", "name": "Taxes sur le chiffre d'affaires déductibles", "account_type": "asset", "category": "classe_4", "parent_number": "445"},
    {"number": "4457", "name": "Taxes sur le chiffre d'affaires collectées", "account_type": "liability", "category": "classe_4", "parent_number": "445"},
    {"number": "4458", "name": "Taxes sur le chiffre d'affaires à régulariser ou en attente", "account_type": "liability", "category": "classe_4", "parent_number": "445"},
    {"number": "446", "name": "Obligations cautionnées", "account_type": "liability", "category": "classe_4", "parent_number": "44"},
    {"number": "447", "name": "Autres impôts, taxes et versements assimilés", "account_type": "liability", "category": "classe_4", "parent_number": "44"},
    {"number": "448", "name": "État - Charges à payer et produits à recevoir", "account_type": "liability", "category": "classe_4", "parent_number": "44"},
    
    {"number": "45", "name": "Associés et groupes", "account_type": "liability", "category": "classe_4"},
    {"number": "451", "name": "Opérations groupe", "account_type": "liability", "category": "classe_4", "parent_number": "45"},
    {"number": "455", "name": "Associés - Comptes courants", "account_type": "liability", "category": "classe_4", "parent_number": "45"},
    {"number": "456", "name": "Associés - Opérations sur le capital", "account_type": "liability", "category": "classe_4", "parent_number": "45"},
    {"number": "457", "name": "Associés - Dividendes à payer", "account_type": "liability", "category": "classe_4", "parent_number": "45"},
    {"number": "458", "name": "Associés - Opérations faites en commun", "account_type": "liability", "category": "classe_4", "parent_number": "45"},
    
    {"number": "46", "name": "Débiteurs et créditeurs divers", "account_type": "asset", "category": "classe_4"},
    {"number": "461", "name": "Débiteurs divers", "account_type": "asset", "category": "classe_4", "parent_number": "46"},
    {"number": "462", "name": "Créditeurs divers", "account_type": "liability", "category": "classe_4", "parent_number": "46"},
    {"number": "464", "name": "Dettes sur acquisitions d'immobilisations", "account_type": "liability", "category": "classe_4", "parent_number": "46"},
    {"number": "465", "name": "Dettes sur acquisitions de valeurs mobilières de placement", "account_type": "liability", "category": "classe_4", "parent_number": "46"},
    {"number": "466", "name": "Dettes sur opérations d'escompte", "account_type": "liability", "category": "classe_4", "parent_number": "46"},
    {"number": "467", "name": "Autres comptes débiteurs ou créditeurs", "account_type": "asset", "category": "classe_4", "parent_number": "46"},
    {"number": "468", "name": "Divers - Charges à payer et produits à recevoir", "account_type": "liability", "category": "classe_4", "parent_number": "46"},
    
    {"number": "47", "name": "Comptes d'attente", "account_type": "asset", "category": "classe_4"},
    {"number": "471", "name": "Comptes d'attente", "account_type": "asset", "category": "classe_4", "parent_number": "47"},
    {"number": "472", "name": "Comptes d'attente - Versements restant à effectuer", "account_type": "liability", "category": "classe_4", "parent_number": "47"},
    {"number": "473", "name": "Comptes d'attente - Produits non encore facturés", "account_type": "asset", "category": "classe_4", "parent_number": "47"},
    {"number": "475", "name": "Comptes d'attente - Charges constatées d'avance", "account_type": "asset", "category": "classe_4", "parent_number": "47"},
    {"number": "476", "name": "Comptes d'attente - Charges constatées d'avance", "account_type": "asset", "category": "classe_4", "parent_number": "47"},
    {"number": "477", "name": "Comptes d'attente - Produits constatés d'avance", "account_type": "liability", "category": "classe_4", "parent_number": "47"},
    {"number": "478", "name": "Comptes d'attente - Autres", "account_type": "asset", "category": "classe_4", "parent_number": "47"},
    
    {"number": "48", "name": "Comptes de régularisation", "account_type": "asset", "category": "classe_4"},
    {"number": "481", "name": "Charges constatées d'avance", "account_type": "asset", "category": "classe_4", "parent_number": "48"},
    {"number": "486", "name": "Charges constatées d'avance", "account_type": "asset", "category": "classe_4", "parent_number": "48"},
    {"number": "487", "name": "Produits constatés d'avance", "account_type": "liability", "category": "classe_4", "parent_number": "48"},
    
    {"number": "49", "name": "Dépréciations des comptes de tiers", "account_type": "asset", "category": "classe_4"},
    {"number": "491", "name": "Dépréciations des comptes de clients", "account_type": "asset", "category": "classe_4", "parent_number": "49"},
    {"number": "495", "name": "Dépréciations des comptes du groupe et associés", "account_type": "asset", "category": "classe_4", "parent_number": "49"},
    {"number": "496", "name": "Dépréciations des comptes de débiteurs divers", "account_type": "asset", "category": "classe_4", "parent_number": "49"},
    
    # ═══════════════════════════════════════════════════════════════════
    # CLASSE 5: COMPTES DE TRÉSORERIE (Cash and Banks)
    # ═══════════════════════════════════════════════════════════════════
    {"number": "50", "name": "Valeurs mobilières de placement", "account_type": "asset", "category": "classe_5", "allow_manual_entry": False},
    {"number": "501", "name": "Parts dans des entreprises liées", "account_type": "asset", "category": "classe_5", "parent_number": "50"},
    {"number": "502", "name": "Actions propres", "account_type": "asset", "category": "classe_5", "parent_number": "50"},
    {"number": "503", "name": "Actions", "account_type": "asset", "category": "classe_5", "parent_number": "50"},
    {"number": "504", "name": "Autres titres conférant un droit de propriété", "account_type": "asset", "category": "classe_5", "parent_number": "50"},
    {"number": "505", "name": "Obligations et bons émis par la société et rachetés par elle", "account_type": "asset", "category": "classe_5", "parent_number": "50"},
    {"number": "506", "name": "Obligations", "account_type": "asset", "category": "classe_5", "parent_number": "50"},
    {"number": "507", "name": "Bons du Trésor et bons de caisse à court terme", "account_type": "asset", "category": "classe_5", "parent_number": "50"},
    {"number": "508", "name": "Autres valeurs mobilières de placement", "account_type": "asset", "category": "classe_5", "parent_number": "50"},
    
    {"number": "51", "name": "Banques, établissements financiers et assimilés", "account_type": "asset", "category": "classe_5"},
    {"number": "511", "name": "Valeurs à l'encaissement", "account_type": "asset", "category": "classe_5", "parent_number": "51"},
    {"number": "512", "name": "Banques", "account_type": "asset", "category": "classe_5", "parent_number": "51"},
    {"number": "513", "name": "Établissements financiers", "account_type": "asset", "category": "classe_5", "parent_number": "51"},
    {"number": "514", "name": "Chèques postaux", "account_type": "asset", "category": "classe_5", "parent_number": "51"},
    {"number": "515", "name": "Caisse du Trésor", "account_type": "asset", "category": "classe_5", "parent_number": "51"},
    {"number": "516", "name": "Sociétés de bourse", "account_type": "asset", "category": "classe_5", "parent_number": "51"},
    {"number": "517", "name": "Autres organismes financiers", "account_type": "asset", "category": "classe_5", "parent_number": "51"},
    {"number": "518", "name": "Intérêts courus", "account_type": "asset", "category": "classe_5", "parent_number": "51"},
    
    {"number": "52", "name": "Instruments de trésorerie", "account_type": "asset", "category": "classe_5"},
    
    {"number": "53", "name": "Caisse", "account_type": "asset", "category": "classe_5"},
    {"number": "531", "name": "Caisse siège social", "account_type": "asset", "category": "classe_5", "parent_number": "53"},
    {"number": "532", "name": "Caisse succursale (ou usine) A", "account_type": "asset", "category": "classe_5", "parent_number": "53"},
    {"number": "533", "name": "Caisse succursale (ou usine) B", "account_type": "asset", "category": "classe_5", "parent_number": "53"},
    {"number": "534", "name": "Caisse succursale (ou usine) C", "account_type": "asset", "category": "classe_5", "parent_number": "53"},
    
    {"number": "54", "name": "Régies d'avances et accréditifs", "account_type": "asset", "category": "classe_5"},
    
    {"number": "55", "name": "Virements internes", "account_type": "asset", "category": "classe_5"},
    {"number": "551", "name": "Virements de fonds", "account_type": "asset", "category": "classe_5", "parent_number": "55"},
    {"number": "552", "name": "Chèques à encaisser", "account_type": "asset", "category": "classe_5", "parent_number": "55"},
    
    {"number": "56", "name": "Banques, crédits financiers et d'escompte", "account_type": "liability", "category": "classe_5"},
    {"number": "561", "name": "Crédits d'escompte", "account_type": "liability", "category": "classe_5", "parent_number": "56"},
    {"number": "562", "name": "Crédits de trésorerie", "account_type": "liability", "category": "classe_5", "parent_number": "56"},
    
    {"number": "57", "name": "Dépôts et cautionnements reçus", "account_type": "liability", "category": "classe_5"},
    
    {"number": "58", "name": "Virements de fonds", "account_type": "asset", "category": "classe_5"},
    
    {"number": "59", "name": "Dépréciations des comptes de trésorerie", "account_type": "asset", "category": "classe_5"},
    {"number": "590", "name": "Dépréciations des valeurs mobilières de placement", "account_type": "asset", "category": "classe_5", "parent_number": "59"},
    
    # ═══════════════════════════════════════════════════════════════════
    # CLASSE 6: COMPTES DE CHARGES (Expenses)
    # ═══════════════════════════════════════════════════════════════════
    {"number": "60", "name": "Achats et variations de stocks", "account_type": "expense", "category": "classe_6", "allow_manual_entry": False},
    {"number": "601", "name": "Achats de matières premières et fournitures liées", "account_type": "expense", "category": "classe_6", "parent_number": "60"},
    {"number": "602", "name": "Achats d'autres approvisionnements stockés", "account_type": "expense", "category": "classe_6", "parent_number": "60"},
    {"number": "603", "name": "Variations des stocks de biens achetés", "account_type": "expense", "category": "classe_6", "parent_number": "60"},
    {"number": "604", "name": "Achats d'études et prestations de services", "account_type": "expense", "category": "classe_6", "parent_number": "60"},
    {"number": "605", "name": "Achats de matériel, équipements et travaux", "account_type": "expense", "category": "classe_6", "parent_number": "60"},
    {"number": "606", "name": "Achats non stockés de matière et de fournitures", "account_type": "expense", "category": "classe_6", "parent_number": "60"},
    {"number": "607", "name": "Achats de marchandises", "account_type": "expense", "category": "classe_6", "parent_number": "60"},
    {"number": "608", "name": "Frais accessoires d'achat", "account_type": "expense", "category": "classe_6", "parent_number": "60"},
    {"number": "609", "name": "Rabais, ristournes et remises obtenus sur achats", "account_type": "expense", "category": "classe_6", "parent_number": "60"},
    
    {"number": "61", "name": "Services extérieurs", "account_type": "expense", "category": "classe_6"},
    {"number": "611", "name": "Sous-traitance générale", "account_type": "expense", "category": "classe_6", "parent_number": "61"},
    {"number": "612", "name": "Redevances de crédit-bail", "account_type": "expense", "category": "classe_6", "parent_number": "61"},
    {"number": "613", "name": "Locations", "account_type": "expense", "category": "classe_6", "parent_number": "61"},
    {"number": "614", "name": "Charges locatives et de copropriété", "account_type": "expense", "category": "classe_6", "parent_number": "61"},
    {"number": "615", "name": "Entretiens et réparations", "account_type": "expense", "category": "classe_6", "parent_number": "61"},
    {"number": "616", "name": "Primes d'assurance", "account_type": "expense", "category": "classe_6", "parent_number": "61"},
    {"number": "617", "name": "Études et recherches", "account_type": "expense", "category": "classe_6", "parent_number": "61"},
    {"number": "618", "name": "Divers", "account_type": "expense", "category": "classe_6", "parent_number": "61"},
    
    {"number": "62", "name": "Autres services extérieurs", "account_type": "expense", "category": "classe_6"},
    {"number": "621", "name": "Personnel extérieur à l'entreprise", "account_type": "expense", "category": "classe_6", "parent_number": "62"},
    {"number": "622", "name": "Rémunérations d'intermédiaires et honoraires", "account_type": "expense", "category": "classe_6", "parent_number": "62"},
    {"number": "623", "name": "Publicité, publications, relations publiques", "account_type": "expense", "category": "classe_6", "parent_number": "62"},
    {"number": "624", "name": "Transports de biens et transports collectifs du personnel", "account_type": "expense", "category": "classe_6", "parent_number": "62"},
    {"number": "625", "name": "Déplacements, missions et réceptions", "account_type": "expense", "category": "classe_6", "parent_number": "62"},
    {"number": "626", "name": "Frais postaux et de télécommunications", "account_type": "expense", "category": "classe_6", "parent_number": "62"},
    {"number": "627", "name": "Services bancaires et assimilés", "account_type": "expense", "category": "classe_6", "parent_number": "62"},
    {"number": "628", "name": "Divers", "account_type": "expense", "category": "classe_6", "parent_number": "62"},
    
    {"number": "63", "name": "Charges de personnel", "account_type": "expense", "category": "classe_6"},
    {"number": "631", "name": "Rémunérations directes versées au personnel national", "account_type": "expense", "category": "classe_6", "parent_number": "63"},
    {"number": "632", "name": "Indemnités et avantages divers", "account_type": "expense", "category": "classe_6", "parent_number": "63"},
    {"number": "633", "name": "Rémunérations directes versées au personnel expatrié", "account_type": "expense", "category": "classe_6", "parent_number": "63"},
    {"number": "634", "name": "Charges sociales", "account_type": "expense", "category": "classe_6", "parent_number": "63"},
    {"number": "635", "name": "Régimes de retraite et de prévoyance", "account_type": "expense", "category": "classe_6", "parent_number": "63"},
    {"number": "636", "name": "Régimes de retraite et de prévoyance - Cotisations", "account_type": "expense", "category": "classe_6", "parent_number": "63"},
    {"number": "637", "name": "Autres charges sociales", "account_type": "expense", "category": "classe_6", "parent_number": "63"},
    {"number": "638", "name": "Autres charges de personnel", "account_type": "expense", "category": "classe_6", "parent_number": "63"},
    
    {"number": "64", "name": "Impôts et taxes", "account_type": "expense", "category": "classe_6"},
    {"number": "641", "name": "Impôts, taxes et versements assimilés sur rémunérations", "account_type": "expense", "category": "classe_6", "parent_number": "64"},
    {"number": "642", "name": "Impôts et taxes non récupérables sur prestations", "account_type": "expense", "category": "classe_6", "parent_number": "64"},
    {"number": "643", "name": "Impôts sur le patrimoine", "account_type": "expense", "category": "classe_6", "parent_number": "64"},
    {"number": "644", "name": "Taxes sur les véhicules", "account_type": "expense", "category": "classe_6", "parent_number": "64"},
    {"number": "645", "name": "Taxes foncières", "account_type": "expense", "category": "classe_6", "parent_number": "64"},
    {"number": "646", "name": "Droits d'enregistrement et de timbre", "account_type": "expense", "category": "classe_6", "parent_number": "64"},
    {"number": "647", "name": "Autres impôts et taxes", "account_type": "expense", "category": "classe_6", "parent_number": "64"},
    {"number": "648", "name": "Taxe sur la valeur ajoutée non récupérable", "account_type": "expense", "category": "classe_6", "parent_number": "64"},
    
    {"number": "65", "name": "Autres charges", "account_type": "expense", "category": "classe_6"},
    {"number": "651", "name": "Redevances pour concessions, brevets, licences, marques, procédés, logiciels, droits et valeurs similaires", "account_type": "expense", "category": "classe_6", "parent_number": "65"},
    {"number": "652", "name": "Moins-values sur réalisation d'actifs circulants", "account_type": "expense", "category": "classe_6", "parent_number": "65"},
    {"number": "653", "name": "Jetons de présence", "account_type": "expense", "category": "classe_6", "parent_number": "65"},
    {"number": "654", "name": "Pertes sur créances irrécouvrables", "account_type": "expense", "category": "classe_6", "parent_number": "65"},
    {"number": "655", "name": "Quote-part de résultat sur opérations faites en commun", "account_type": "expense", "category": "classe_6", "parent_number": "65"},
    {"number": "656", "name": "Pertes de change", "account_type": "expense", "category": "classe_6", "parent_number": "65"},
    {"number": "657", "name": "Pénalités, amendes fiscales et pénales", "account_type": "expense", "category": "classe_6", "parent_number": "65"},
    {"number": "658", "name": "Charges diverses", "account_type": "expense", "category": "classe_6", "parent_number": "65"},
    
    {"number": "66", "name": "Charges financières", "account_type": "expense", "category": "classe_6"},
    {"number": "661", "name": "Charges d'intérêts", "account_type": "expense", "category": "classe_6", "parent_number": "66"},
    {"number": "662", "name": "Pertes de change", "account_type": "expense", "category": "classe_6", "parent_number": "66"},
    {"number": "663", "name": "Charges nettes sur cessions de valeurs mobilières de placement", "account_type": "expense", "category": "classe_6", "parent_number": "66"},
    {"number": "664", "name": "Pertes sur risques financiers", "account_type": "expense", "category": "classe_6", "parent_number": "66"},
    {"number": "665", "name": "Escomptes accordés", "account_type": "expense", "category": "classe_6", "parent_number": "66"},
    {"number": "666", "name": "Pertes de change", "account_type": "expense", "category": "classe_6", "parent_number": "66"},
    {"number": "667", "name": "Charges nettes sur risques financiers", "account_type": "expense", "category": "classe_6", "parent_number": "66"},
    {"number": "668", "name": "Autres charges financières", "account_type": "expense", "category": "classe_6", "parent_number": "66"},
    
    {"number": "67", "name": "Charges extraordinaires", "account_type": "expense", "category": "classe_6"},
    {"number": "671", "name": "Charges extraordinaires", "account_type": "expense", "category": "classe_6", "parent_number": "67"},
    {"number": "672", "name": "Charges sur exercices antérieurs", "account_type": "expense", "category": "classe_6", "parent_number": "67"},
    {"number": "678", "name": "Autres charges extraordinaires", "account_type": "expense", "category": "classe_6", "parent_number": "67"},
    
    {"number": "68", "name": "Dotations aux amortissements, provisions et pertes de valeur", "account_type": "expense", "category": "classe_6"},
    {"number": "681", "name": "Dotations aux amortissements, provisions et pertes de valeur - Charges d'exploitation", "account_type": "expense", "category": "classe_6", "parent_number": "68"},
    {"number": "6811", "name": "Dotations aux amortissements des immobilisations incorporelles et corporelles", "account_type": "expense", "category": "classe_6", "parent_number": "681"},
    {"number": "6812", "name": "Dotations aux amortissements des charges immobilisées", "account_type": "expense", "category": "classe_6", "parent_number": "681"},
    {"number": "6815", "name": "Dotations aux provisions d'exploitation", "account_type": "expense", "category": "classe_6", "parent_number": "681"},
    {"number": "6816", "name": "Dotations aux dépréciations des immobilisations incorporelles et corporelles", "account_type": "expense", "category": "classe_6", "parent_number": "681"},
    {"number": "6817", "name": "Dotations aux dépréciations des actifs circulants", "account_type": "expense", "category": "classe_6", "parent_number": "681"},
    {"number": "682", "name": "Dotations aux amortissements, provisions et pertes de valeur - Charges financières", "account_type": "expense", "category": "classe_6", "parent_number": "68"},
    {"number": "686", "name": "Dotations aux provisions financières", "account_type": "expense", "category": "classe_6", "parent_number": "68"},
    {"number": "687", "name": "Dotations aux amortissements, provisions et pertes de valeur - Charges extraordinaires", "account_type": "expense", "category": "classe_6", "parent_number": "68"},
    
    {"number": "69", "name": "Impôts sur les bénéfices et produits", "account_type": "expense", "category": "classe_6"},
    {"number": "691", "name": "Impôts sur les bénéfices", "account_type": "expense", "category": "classe_6", "parent_number": "69"},
    {"number": "695", "name": "Impôts sur les bénéfices", "account_type": "expense", "category": "classe_6", "parent_number": "69"},
    {"number": "696", "name": "Suppléments d'impôt sur les sociétés", "account_type": "expense", "category": "classe_6", "parent_number": "69"},
    {"number": "698", "name": "Intégration fiscale", "account_type": "expense", "category": "classe_6", "parent_number": "69"},
    {"number": "699", "name": "Produits - Reports déficitaires", "account_type": "income", "category": "classe_6", "parent_number": "69"},
    
    # ═══════════════════════════════════════════════════════════════════
    # CLASSE 7: COMPTES DE PRODUITS (Income/Revenue)
    # ═══════════════════════════════════════════════════════════════════
    {"number": "70", "name": "Ventes de produits fabriqués, prestations de services, marchandises", "account_type": "income", "category": "classe_7", "allow_manual_entry": False},
    {"number": "701", "name": "Ventes de produits fabriqués", "account_type": "income", "category": "classe_7", "parent_number": "70"},
    {"number": "702", "name": "Ventes de produits intermédiaires", "account_type": "income", "category": "classe_7", "parent_number": "70"},
    {"number": "703", "name": "Ventes de produits résiduels", "account_type": "income", "category": "classe_7", "parent_number": "70"},
    {"number": "704", "name": "Travaux", "account_type": "income", "category": "classe_7", "parent_number": "70"},
    {"number": "705", "name": "Études", "account_type": "income", "category": "classe_7", "parent_number": "70"},
    {"number": "706", "name": "Prestations de services", "account_type": "income", "category": "classe_7", "parent_number": "70"},
    {"number": "707", "name": "Ventes de marchandises", "account_type": "income", "category": "classe_7", "parent_number": "70"},
    {"number": "708", "name": "Produits des activités annexes", "account_type": "income", "category": "classe_7", "parent_number": "70"},
    {"number": "709", "name": "Rabais, ristournes et remises accordés par l'entreprise", "account_type": "income", "category": "classe_7", "parent_number": "70"},
    
    {"number": "71", "name": "Production stockée (ou déstockage)", "account_type": "income", "category": "classe_7"},
    {"number": "713", "name": "Variation des stocks de produits", "account_type": "income", "category": "classe_7", "parent_number": "71"},
    {"number": "7133", "name": "Variation des stocks de produits en cours", "account_type": "income", "category": "classe_7", "parent_number": "713"},
    {"number": "7134", "name": "Variation des stocks de services en cours", "account_type": "income", "category": "classe_7", "parent_number": "713"},
    {"number": "7135", "name": "Variation des stocks de produits", "account_type": "income", "category": "classe_7", "parent_number": "713"},
    {"number": "71355", "name": "Variation des stocks de produits intermédiaires", "account_type": "income", "category": "classe_7", "parent_number": "7135"},
    {"number": "71356", "name": "Variation des stocks de produits finis", "account_type": "income", "category": "classe_7", "parent_number": "7135"},
    {"number": "7137", "name": "Variation des stocks de produits résiduels", "account_type": "income", "category": "classe_7", "parent_number": "713"},
    
    {"number": "72", "name": "Production immobilisée", "account_type": "income", "category": "classe_7"},
    {"number": "721", "name": "Production immobilisée - Immobilisations incorporelles", "account_type": "income", "category": "classe_7", "parent_number": "72"},
    {"number": "722", "name": "Production immobilisée - Immobilisations corporelles", "account_type": "income", "category": "classe_7", "parent_number": "72"},
    
    {"number": "73", "name": "Variation des stocks de biens et services achetés", "account_type": "income", "category": "classe_7"},
    {"number": "731", "name": "Variation des stocks de biens achetés", "account_type": "income", "category": "classe_7", "parent_number": "73"},
    {"number": "732", "name": "Variation des stocks de services achetés", "account_type": "income", "category": "classe_7", "parent_number": "73"},
    
    {"number": "74", "name": "Subventions d'exploitation", "account_type": "income", "category": "classe_7"},
    {"number": "741", "name": "Subventions d'exploitation", "account_type": "income", "category": "classe_7", "parent_number": "74"},
    {"number": "748", "name": "Autres subventions d'exploitation", "account_type": "income", "category": "classe_7", "parent_number": "74"},
    
    {"number": "75", "name": "Autres produits de gestion courante", "account_type": "income", "category": "classe_7"},
    {"number": "751", "name": "Redevances pour concessions, brevets, licences, marques, procédés, logiciels, droits et valeurs similaires", "account_type": "income", "category": "classe_7", "parent_number": "75"},
    {"number": "752", "name": "Revenus des immeubles non affectés à des activités professionnelles", "account_type": "income", "category": "classe_7", "parent_number": "75"},
    {"number": "753", "name": "Jetons de présence et rémunérations d'administrateurs, gérants", "account_type": "income", "category": "classe_7", "parent_number": "75"},
    {"number": "754", "name": "Ristournes perçues des coopératives", "account_type": "income", "category": "classe_7", "parent_number": "75"},
    {"number": "755", "name": "Quotes-parts de résultat sur opérations faites en commun", "account_type": "income", "category": "classe_7", "parent_number": "75"},
    {"number": "756", "name": "Gains de change", "account_type": "income", "category": "classe_7", "parent_number": "75"},
    {"number": "757", "name": "Produits divers", "account_type": "income", "category": "classe_7", "parent_number": "75"},
    {"number": "758", "name": "Produits divers de gestion courante", "account_type": "income", "category": "classe_7", "parent_number": "75"},
    
    {"number": "76", "name": "Produits financiers", "account_type": "income", "category": "classe_7"},
    {"number": "761", "name": "Produits des participations", "account_type": "income", "category": "classe_7", "parent_number": "76"},
    {"number": "762", "name": "Produits des autres immobilisations financières", "account_type": "income", "category": "classe_7", "parent_number": "76"},
    {"number": "763", "name": "Revenus des autres créances financières", "account_type": "income", "category": "classe_7", "parent_number": "76"},
    {"number": "764", "name": "Revenus des valeurs mobilières de placement", "account_type": "income", "category": "classe_7", "parent_number": "76"},
    {"number": "765", "name": "Escomptes obtenus", "account_type": "income", "category": "classe_7", "parent_number": "76"},
    {"number": "766", "name": "Gains de change", "account_type": "income", "category": "classe_7", "parent_number": "76"},
    {"number": "767", "name": "Produits nets sur risques financiers", "account_type": "income", "category": "classe_7", "parent_number": "76"},
    {"number": "768", "name": "Autres produits financiers", "account_type": "income", "category": "classe_7", "parent_number": "76"},
    
    {"number": "77", "name": "Produits extraordinaires", "account_type": "income", "category": "classe_7"},
    {"number": "771", "name": "Produits extraordinaires sur opérations de gestion", "account_type": "income", "category": "classe_7", "parent_number": "77"},
    {"number": "772", "name": "Produits sur exercices antérieurs", "account_type": "income", "category": "classe_7", "parent_number": "77"},
    {"number": "775", "name": "Produits extraordinaires sur opérations en capital", "account_type": "income", "category": "classe_7", "parent_number": "77"},
    {"number": "778", "name": "Autres produits extraordinaires", "account_type": "income", "category": "classe_7", "parent_number": "77"},
    
    {"number": "78", "name": "Reprises sur amortissements, provisions et pertes de valeur", "account_type": "income", "category": "classe_7"},
    {"number": "781", "name": "Reprises sur amortissements, provisions et pertes de valeur - Produits d'exploitation", "account_type": "income", "category": "classe_7", "parent_number": "78"},
    {"number": "7811", "name": "Reprises sur amortissements des immobilisations incorporelles et corporelles", "account_type": "income", "category": "classe_7", "parent_number": "781"},
    {"number": "7815", "name": "Reprises sur provisions d'exploitation", "account_type": "income", "category": "classe_7", "parent_number": "781"},
    {"number": "7816", "name": "Reprises sur dépréciations des immobilisations incorporelles et corporelles", "account_type": "income", "category": "classe_7", "parent_number": "781"},
    {"number": "7817", "name": "Reprises sur dépréciations des actifs circulants", "account_type": "income", "category": "classe_7", "parent_number": "781"},
    {"number": "786", "name": "Reprises sur provisions financières", "account_type": "income", "category": "classe_7", "parent_number": "78"},
    {"number": "787", "name": "Reprises sur provisions extraordinaires", "account_type": "income", "category": "classe_7", "parent_number": "78"},
    
    {"number": "79", "name": "Transferts de charges", "account_type": "income", "category": "classe_7"},
    {"number": "791", "name": "Transferts de charges d'exploitation", "account_type": "income", "category": "classe_7", "parent_number": "79"},
    {"number": "796", "name": "Transferts de charges financières", "account_type": "income", "category": "classe_7", "parent_number": "79"},
    {"number": "797", "name": "Transferts de charges extraordinaires", "account_type": "income", "category": "classe_7", "parent_number": "79"},
    
    # ═══════════════════════════════════════════════════════════════════
    # CLASSE 8: COMPTES SPÉCIAUX (Special Accounts)
    # ═══════════════════════════════════════════════════════════════════
    {"number": "81", "name": "Valeurs comptables des cessions d'immobilisations", "account_type": "expense", "category": "classe_8"},
    {"number": "811", "name": "Valeurs comptables des cessions d'immobilisations incorporelles", "account_type": "expense", "category": "classe_8", "parent_number": "81"},
    {"number": "812", "name": "Valeurs comptables des cessions d'immobilisations corporelles", "account_type": "expense", "category": "classe_8", "parent_number": "81"},
    {"number": "816", "name": "Valeurs comptables des cessions d'immobilisations financières", "account_type": "expense", "category": "classe_8", "parent_number": "81"},
    
    {"number": "82", "name": "Produits des cessions d'immobilisations", "account_type": "income", "category": "classe_8"},
    {"number": "821", "name": "Produits des cessions d'immobilisations incorporelles", "account_type": "income", "category": "classe_8", "parent_number": "82"},
    {"number": "822", "name": "Produits des cessions d'immobilisations corporelles", "account_type": "income", "category": "classe_8", "parent_number": "82"},
    {"number": "826", "name": "Produits des cessions d'immobilisations financières", "account_type": "income", "category": "classe_8", "parent_number": "82"},
    
    {"number": "83", "name": "Charges hors activités ordinaires", "account_type": "expense", "category": "classe_8"},
    {"number": "831", "name": "Charges hors activités ordinaires - Pénalités, amendes", "account_type": "expense", "category": "classe_8", "parent_number": "83"},
    {"number": "832", "name": "Charges hors activités ordinaires - Dons et libéralités", "account_type": "expense", "category": "classe_8", "parent_number": "83"},
    {"number": "833", "name": "Charges hors activités ordinaires - Charges sur exercices antérieurs", "account_type": "expense", "category": "classe_8", "parent_number": "83"},
    {"number": "838", "name": "Autres charges hors activités ordinaires", "account_type": "expense", "category": "classe_8", "parent_number": "83"},
    
    {"number": "84", "name": "Produits hors activités ordinaires", "account_type": "income", "category": "classe_8"},
    {"number": "841", "name": "Produits hors activités ordinaires - Dégrevements d'impôts", "account_type": "income", "category": "classe_8", "parent_number": "84"},
    {"number": "842", "name": "Produits hors activités ordinaires - Dons et libéralités reçus", "account_type": "income", "category": "classe_8", "parent_number": "84"},
    {"number": "843", "name": "Produits hors activités ordinaires - Produits sur exercices antérieurs", "account_type": "income", "category": "classe_8", "parent_number": "84"},
    {"number": "848", "name": "Autres produits hors activités ordinaires", "account_type": "income", "category": "classe_8", "parent_number": "84"},
    
    {"number": "85", "name": "Résultats hors activités ordinaires", "account_type": "income", "category": "classe_8"},
    {"number": "851", "name": "Résultats hors activités ordinaires (bénéfice)", "account_type": "income", "category": "classe_8", "parent_number": "85"},
    {"number": "859", "name": "Résultats hors activités ordinaires (perte)", "account_type": "expense", "category": "classe_8", "parent_number": "85"},
    
    {"number": "86", "name": "Répartition des résultats", "account_type": "equity", "category": "classe_8"},
    {"number": "861", "name": "Répartition des résultats - Réserve légale", "account_type": "equity", "category": "classe_8", "parent_number": "86"},
    {"number": "862", "name": "Répartition des résultats - Réserve statutaire", "account_type": "equity", "category": "classe_8", "parent_number": "86"},
    {"number": "863", "name": "Répartition des résultats - Réserve facultative", "account_type": "equity", "category": "classe_8", "parent_number": "86"},
    {"number": "864", "name": "Répartition des résultats - Report à nouveau", "account_type": "equity", "category": "classe_8", "parent_number": "86"},
    {"number": "865", "name": "Répartition des résultats - Dividendes", "account_type": "liability", "category": "classe_8", "parent_number": "86"},
    {"number": "868", "name": "Autres répartitions", "account_type": "equity", "category": "classe_8", "parent_number": "86"},
    
    {"number": "88", "name": "Comptes de résultats", "account_type": "equity", "category": "classe_8"},
    {"number": "881", "name": "Résultat d'exploitation", "account_type": "income", "category": "classe_8", "parent_number": "88"},
    {"number": "882", "name": "Résultat financier", "account_type": "income", "category": "classe_8", "parent_number": "88"},
    {"number": "883", "name": "Résultat ordinaire avant impôt", "account_type": "income", "category": "classe_8", "parent_number": "88"},
    {"number": "884", "name": "Résultat extraordinaire", "account_type": "income", "category": "classe_8", "parent_number": "88"},
    {"number": "885", "name": "Résultat net de l'exercice", "account_type": "income", "category": "classe_8", "parent_number": "88"},
    
    {"number": "89", "name": "Bilan", "account_type": "equity", "category": "classe_8"},
    {"number": "891", "name": "Bilan d'ouverture", "account_type": "equity", "category": "classe_8", "parent_number": "89"},
    {"number": "899", "name": "Bilan de clôture", "account_type": "equity", "category": "classe_8", "parent_number": "89"},
]

# Default journals configuration
DEFAULT_JOURNALS = [
    {"code": "VT", "name": "Journal des Ventes", "journal_type": "sales"},
    {"code": "AC", "name": "Journal des Achats", "journal_type": "purchases"},
    {"code": "TRES", "name": "Journal de Trésorerie", "journal_type": "cash"},
    {"code": "BQ", "name": "Journal de Banque", "journal_type": "bank"},
    {"code": "OD", "name": "Journal des Opérations Diverses", "journal_type": "general"},
]

# Default tax rates for OHADA countries
DEFAULT_TAX_RATES = [
    {"name": "TVA 18%", "rate": 18.0, "is_default": True},
    {"name": "TVA 0%", "rate": 0.0, "is_default": False},
    {"name": "Exonéré", "rate": 0.0, "is_default": False},
]


async def seed_ohada_chart_of_accounts(
    db: AsyncSession,
    organisation_id: int,
    skip_existing: bool = True
) -> dict:
    """
    Seed the complete OHADA chart of accounts for an organisation.
    
    Args:
        db: Database session
        organisation_id: Organisation ID
        skip_existing: If True, skip accounts that already exist
        
    Returns:
        dict with counts of created accounts, journals, and tax rates
    """
    created_accounts = 0
    created_journals = 0
    created_tax_rates = 0
    skipped_accounts = 0
    
    # Build account number to ID mapping for parent references
    account_map: dict[str, int] = {}
    
    # Check if accounts already exist
    if skip_existing:
        existing = await db.execute(
            select(Account).where(Account.organisation_id == organisation_id)
        )
        existing_accounts = existing.scalars().all()
        if existing_accounts:
            for acc in existing_accounts:
                account_map[acc.number] = acc.id
    
    # Create accounts
    if not account_map:
        for account_data in OHADA_CHART_OF_ACCOUNTS:
            # Check if account with parent_number reference exists
            parent_id = None
            if "parent_number" in account_data and account_data["parent_number"] in account_map:
                parent_id = account_map[account_data["parent_number"]]
            
            account = Account(
                organisation_id=organisation_id,
                number=account_data["number"],
                name=account_data["name"],
                account_type=account_data["account_type"],
                category=account_data["category"],
                parent_id=parent_id,
                is_active=True,
                allow_manual_entry=account_data.get("allow_manual_entry", True),
                is_system=not account_data.get("allow_manual_entry", True),
            )
            db.add(account)
            await db.flush()
            account_map[account_data["number"]] = account.id
            created_accounts += 1
    
    # Create default journals
    for journal_data in DEFAULT_JOURNALS:
        existing = await db.execute(
            select(Journal).where(
                Journal.organisation_id == organisation_id,
                Journal.code == journal_data["code"]
            )
        )
        if not existing.scalar_one_or_none():
            journal = Journal(
                organisation_id=organisation_id,
                code=journal_data["code"],
                name=journal_data["name"],
                journal_type=journal_data["journal_type"],
                is_active=True,
            )
            db.add(journal)
            created_journals += 1
    
    # Create default tax rates
    for tax_data in DEFAULT_TAX_RATES:
        existing = await db.execute(
            select(TaxRate).where(
                TaxRate.organisation_id == organisation_id,
                TaxRate.name == tax_data["name"]
            )
        )
        if not existing.scalar_one_or_none():
            tax_rate = TaxRate(
                organisation_id=organisation_id,
                name=tax_data["name"],
                rate=tax_data["rate"],
                is_default=tax_data["is_default"],
                is_active=True,
            )
            db.add(tax_rate)
            created_tax_rates += 1
    
    await db.commit()
    
    return {
        "accounts_created": created_accounts,
        "journals_created": created_journals,
        "tax_rates_created": created_tax_rates,
        "accounts_skipped": skipped_accounts,
    }


async def get_account_by_number(
    db: AsyncSession,
    organisation_id: int,
    account_number: str
) -> Account | None:
    """Get an account by its OHADA number."""
    result = await db.execute(
        select(Account).where(
            Account.organisation_id == organisation_id,
            Account.number == account_number
        )
    )
    return result.scalar_one_or_none()


async def setup_default_accounts_config(
    db: AsyncSession,
    organisation_id: int
) -> dict:
    """
    Set up default account configuration for automatic journal entries.
    
    This maps business operations to their corresponding OHADA accounts.
    """
    # Default account mappings
    default_mappings = {
        "sales": "707",           # Ventes de marchandises
        "sales_vat": "4457",      # TVA collectée
        "purchases": "607",       # Achats de marchandises
        "purchase_vat": "4456",   # TVA déductible
        "customers": "411",       # Clients
        "suppliers": "401",       # Fournisseurs
        "bank": "512",            # Banques
        "cash": "53",             # Caisse
        "expenses": "658",        # Charges diverses
        "discount_granted": "665", # Escomptes accordés
        "discount_received": "765", # Escomptes obtenus
        "exchange_loss": "666",   # Pertes de change
        "exchange_gain": "766",   # Gains de change
    }
    
    created = 0
    account_map = {}
    
    # Get all account IDs
    for key, number in default_mappings.items():
        account = await get_account_by_number(db, organisation_id, number)
        if account:
            account_map[key] = account.id
    
    # Create default account configurations
    for key, account_id in account_map.items():
        existing = await db.execute(
            select(DefaultAccount).where(
                DefaultAccount.organisation_id == organisation_id,
                DefaultAccount.account_key == key
            )
        )
        if not existing.scalar_one_or_none():
            default_account = DefaultAccount(
                organisation_id=organisation_id,
                account_key=key,
                account_id=account_id,
            )
            db.add(default_account)
            created += 1
    
    await db.commit()
    return {"default_accounts_created": created}
