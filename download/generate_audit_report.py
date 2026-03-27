#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rapport d'Audit Complet - Projet SaaS Multi-Tenant
FacturePro Africa & SavanaFlow
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, ListFlowable, ListItem
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
import os
from datetime import datetime

# Register fonts
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
pdfmetrics.registerFont(TTFont('SimHei', '/usr/share/fonts/truetype/chinese/SimHei.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')
registerFontFamily('SimHei', normal='SimHei', bold='SimHei')

# Colors
DARK_BLUE = colors.HexColor('#1F4E79')
LIGHT_GRAY = colors.HexColor('#F5F5F5')
RED = colors.HexColor('#D32F2F')
GREEN = colors.HexColor('#388E3C')
ORANGE = colors.HexColor('#F57C00')

def create_styles():
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='CoverTitle',
        fontName='Times New Roman',
        fontSize=36,
        leading=44,
        alignment=TA_CENTER,
        textColor=DARK_BLUE,
        spaceAfter=20
    ))
    
    styles.add(ParagraphStyle(
        name='CoverSubtitle',
        fontName='Times New Roman',
        fontSize=18,
        leading=24,
        alignment=TA_CENTER,
        textColor=colors.gray,
        spaceAfter=30
    ))
    
    styles.add(ParagraphStyle(
        name='H1',
        fontName='Times New Roman',
        fontSize=20,
        leading=26,
        alignment=TA_LEFT,
        textColor=DARK_BLUE,
        spaceBefore=20,
        spaceAfter=12
    ))
    
    styles.add(ParagraphStyle(
        name='H2',
        fontName='Times New Roman',
        fontSize=16,
        leading=22,
        alignment=TA_LEFT,
        textColor=DARK_BLUE,
        spaceBefore=16,
        spaceAfter=10
    ))
    
    styles.add(ParagraphStyle(
        name='H3',
        fontName='Times New Roman',
        fontSize=13,
        leading=18,
        alignment=TA_LEFT,
        textColor=colors.black,
        spaceBefore=12,
        spaceAfter=8
    ))
    
    styles.add(ParagraphStyle(
        name='Body',
        fontName='Times New Roman',
        fontSize=11,
        leading=16,
        alignment=TA_LEFT,
        spaceBefore=4,
        spaceAfter=8
    ))
    
    styles.add(ParagraphStyle(
        name='BodyJustify',
        fontName='Times New Roman',
        fontSize=11,
        leading=16,
        alignment=TA_JUSTIFY,
        spaceBefore=4,
        spaceAfter=8
    ))
    
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontName='Times New Roman',
        fontSize=10,
        leading=14,
        alignment=TA_CENTER,
        textColor=colors.white
    ))
    
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='Times New Roman',
        fontSize=10,
        leading=14,
        alignment=TA_CENTER
    ))
    
    styles.add(ParagraphStyle(
        name='TableCellLeft',
        fontName='Times New Roman',
        fontSize=10,
        leading=14,
        alignment=TA_LEFT
    ))
    
    styles.add(ParagraphStyle(
        name='Critical',
        fontName='Times New Roman',
        fontSize=11,
        leading=16,
        alignment=TA_LEFT,
        textColor=RED,
        spaceBefore=4,
        spaceAfter=8
    ))
    
    styles.add(ParagraphStyle(
        name='Success',
        fontName='Times New Roman',
        fontSize=11,
        leading=16,
        alignment=TA_LEFT,
        textColor=GREEN,
        spaceBefore=4,
        spaceAfter=8
    ))
    
    styles.add(ParagraphStyle(
        name='Warning',
        fontName='Times New Roman',
        fontSize=11,
        leading=16,
        alignment=TA_LEFT,
        textColor=ORANGE,
        spaceBefore=4,
        spaceAfter=8
    ))
    
    return styles

def create_table(data, col_widths, header=True):
    table = Table(data, colWidths=col_widths)
    
    style_commands = [
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]
    
    if header:
        style_commands.append(('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE))
        style_commands.append(('TEXTCOLOR', (0, 0), (-1, 0), colors.white))
    
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY))
    
    table.setStyle(TableStyle(style_commands))
    return table

def main():
    output_path = '/home/z/my-project/download/rapport_audit_facturepro_savanaflow.pdf'
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
        title='rapport_audit_facturepro_savanaflow',
        author='Z.ai',
        creator='Z.ai',
        subject='Audit complet FacturePro Africa et SavanaFlow'
    )
    
    styles = create_styles()
    story = []
    
    # ========== COVER PAGE ==========
    story.append(Spacer(1, 100))
    story.append(Paragraph("<b>RAPPORT D'AUDIT COMPLET</b>", styles['CoverTitle']))
    story.append(Spacer(1, 20))
    story.append(Paragraph("Projet SaaS Multi-Tenant", styles['CoverSubtitle']))
    story.append(Paragraph("FacturePro Africa | SavanaFlow", styles['CoverSubtitle']))
    story.append(Spacer(1, 60))
    story.append(Paragraph(f"Date : {datetime.now().strftime('%d/%m/%Y')}", styles['CoverSubtitle']))
    story.append(Paragraph("Version : 1.0", styles['CoverSubtitle']))
    story.append(Spacer(1, 40))
    story.append(Paragraph("Prepared by: Z.ai", styles['CoverSubtitle']))
    story.append(PageBreak())
    
    # ========== EXECUTIVE SUMMARY ==========
    story.append(Paragraph("<b>1. RESUME EXECUTIF</b>", styles['H1']))
    story.append(Paragraph(
        "Ce rapport presente un audit complet du projet SaaS multi-tenant comprenant deux applications : "
        "FacturePro Africa (facturation) et SavanaFlow (POS/commerce de detail). "
        "L'audit couvre l'infrastructure, les backends FastAPI, les frontends React/Vite, les bases de donnees "
        "et la conformite commerciale pour le marche africain, avec un focus particulier sur la Guinee.",
        styles['BodyJustify']
    ))
    
    # Summary table
    summary_data = [
        [Paragraph('<b>Domaine</b>', styles['TableHeader']), 
         Paragraph('<b>Note</b>', styles['TableHeader']), 
         Paragraph('<b>Statut</b>', styles['TableHeader']),
         Paragraph('<b>Priorite</b>', styles['TableHeader'])],
        [Paragraph('Infrastructure', styles['TableCell']), 
         Paragraph('5.9/10', styles['TableCell']), 
         Paragraph('A ameliorer', styles['TableCell']),
         Paragraph('Critique', styles['TableCell'])],
        [Paragraph('Backend FacturePro', styles['TableCell']), 
         Paragraph('8.2/10', styles['TableCell']), 
         Paragraph('Bon', styles['TableCell']),
         Paragraph('Moyenne', styles['TableCell'])],
        [Paragraph('Backend SavanaFlow', styles['TableCell']), 
         Paragraph('7.4/10', styles['TableCell']), 
         Paragraph('Acceptable', styles['TableCell']),
         Paragraph('Moyenne', styles['TableCell'])],
        [Paragraph('Frontend FacturePro', styles['TableCell']), 
         Paragraph('7.5/10', styles['TableCell']), 
         Paragraph('Acceptable', styles['TableCell']),
         Paragraph('Moyenne', styles['TableCell'])],
        [Paragraph('Frontend SavanaFlow', styles['TableCell']), 
         Paragraph('8.0/10', styles['TableCell']), 
         Paragraph('Bon', styles['TableCell']),
         Paragraph('Basse', styles['TableCell'])],
        [Paragraph('Base de donnees', styles['TableCell']), 
         Paragraph('6.5/10', styles['TableCell']), 
         Paragraph('A ameliorer', styles['TableCell']),
         Paragraph('Haute', styles['TableCell'])],
        [Paragraph('Conformite legale', styles['TableCell']), 
         Paragraph('7.5/10', styles['TableCell']), 
         Paragraph('Bon', styles['TableCell']),
         Paragraph('Moyenne', styles['TableCell'])],
    ]
    story.append(Spacer(1, 12))
    story.append(create_table(summary_data, [4*cm, 2*cm, 3*cm, 3*cm]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<i>Tableau 1 : Resume des notes par domaine</i>", styles['TableCell']))
    story.append(Spacer(1, 18))
    
    story.append(Paragraph("<b>Note globale du projet : 7.2/10</b>", styles['H2']))
    story.append(Paragraph(
        "Le projet presente une architecture solide avec deux applications complementaires bien conçues pour le marche africain. "
        "Les points forts incluent l'architecture multi-tenant de FacturePro et l'excellente PWA de SavanaFlow. "
        "Les ameliorations necessaires concernent principalement la securite infrastructurelle (HTTPS, secrets) et les tests.",
        styles['BodyJustify']
    ))
    
    # ========== INFRASTRUCTURE ==========
    story.append(Paragraph("<b>2. AUDIT INFRASTRUCTURE</b>", styles['H1']))
    story.append(Paragraph("Note globale : 5.9/10", styles['H2']))
    
    # Docker
    story.append(Paragraph("<b>2.1 Docker et Docker-Compose (7/10)</b>", styles['H3']))
    story.append(Paragraph("<b>Points positifs :</b>", styles['Body']))
    story.append(Paragraph("- Architecture multi-apps avec 2 bases PostgreSQL separees (ports 5442-5443)", styles['Success']))
    story.append(Paragraph("- Healthchecks configures sur PostgreSQL, Redis et backends", styles['Success']))
    story.append(Paragraph("- Redis partage avec bases logiques (DB 0, 1)", styles['Success']))
    story.append(Paragraph("- Celery workers/beat pour taches asynchrones (une paire par app)", styles['Success']))
    story.append(Paragraph("- Volumes persistants pour donnees et uploads", styles['Success']))
    story.append(Paragraph("- Mailhog pour tests d'emails en developpement", styles['Success']))
    
    story.append(Paragraph("<b>Problemes critiques :</b>", styles['Critical']))
    story.append(Paragraph("- PAS de limites de ressources CPU/RAM (risque de saturation serveur)", styles['Critical']))
    story.append(Paragraph("- Mots de passe en clair dans docker-compose.yml (postgres_pass, etc.)", styles['Critical']))
    story.append(Paragraph("- Ports bases de donnees exposes sur l'hote (5442, 5443)", styles['Critical']))
    
    story.append(Paragraph("<b>Problemes moyens :</b>", styles['Warning']))
    story.append(Paragraph("- Pas de logging driver configure", styles['Warning']))
    story.append(Paragraph("- Workers Celery sans healthcheck", styles['Warning']))
    story.append(Paragraph("- Images sans version fixee (latest)", styles['Warning']))
    
    # Nginx
    story.append(Paragraph("<b>2.2 Nginx Reverse Proxy (5/10)</b>", styles['H3']))
    story.append(Paragraph("<b>Problemes critiques :</b>", styles['Critical']))
    story.append(Paragraph("- PAS DE HTTPS - Bloquant pour la production", styles['Critical']))
    story.append(Paragraph("- Pas de certificats SSL/TLS configures", styles['Critical']))
    story.append(Paragraph("- Pas de rate limiting au niveau nginx", styles['Critical']))
    
    story.append(Paragraph("<b>Problemes moyens :</b>", styles['Warning']))
    story.append(Paragraph("- Pas de caching pour assets statiques (JS, CSS, images)", styles['Warning']))
    story.append(Paragraph("- Pas de security headers (HSTS, X-Frame-Options, CSP)", styles['Warning']))
    story.append(Paragraph("- Pas de compression Brotli", styles['Warning']))
    
    # CI/CD
    story.append(Paragraph("<b>2.3 CI/CD GitHub Actions (6/10)</b>", styles['H3']))
    story.append(Paragraph("<b>Points positifs :</b>", styles['Success']))
    story.append(Paragraph("- Pipeline complet : tests backend + frontend + security scan", styles['Success']))
    story.append(Paragraph("- Trivy pour scan de vulnerabilites conteneurs", styles['Success']))
    story.append(Paragraph("- Bandit pour securite Python", styles['Success']))
    story.append(Paragraph("- Codecov pour couverture de code", styles['Success']))
    story.append(Paragraph("- Build Docker avec cache GitHub Actions", styles['Success']))
    
    story.append(Paragraph("<b>Problemes :</b>", styles['Warning']))
    story.append(Paragraph("- Scripts de deploiement vides (juste echo 'Deploying...')", styles['Warning']))
    story.append(Paragraph("- Pas de tests E2E automatises (Playwright/Cypress)", styles['Warning']))
    story.append(Paragraph("- Pas de rollback automatisé", styles['Warning']))
    
    # Security
    story.append(Paragraph("<b>2.4 Securite Infrastructure (4/10) - CRITIQUE</b>", styles['H3']))
    story.append(Paragraph("<b>Problemes bloquants :</b>", styles['Critical']))
    story.append(Paragraph("- PAS DE HTTPS en production", styles['Critical']))
    story.append(Paragraph("- PAS DE certificats SSL/TLS", styles['Critical']))
    story.append(Paragraph("- Mots de passe en clair dans les fichiers de config", styles['Critical']))
    story.append(Paragraph("- Ports bases de donnees exposes publiquement", styles['Critical']))
    
    story.append(Paragraph("<b>Problemes de securite :</b>", styles['Warning']))
    story.append(Paragraph("- Pas de WAF (Web Application Firewall)", styles['Warning']))
    story.append(Paragraph("- Pas de firewall reseau configure", styles['Warning']))
    story.append(Paragraph("- Pas de CSP (Content Security Policy)", styles['Warning']))
    story.append(Paragraph("- Endpoint /health publique sans authentification", styles['Warning']))
    story.append(Paragraph("- Pas de rotation des secrets/cles", styles['Warning']))
    
    # ========== BACKEND ==========
    story.append(Paragraph("<b>3. AUDIT BACKENDS FASTAPI</b>", styles['H1']))
    
    # FacturePro Backend
    story.append(Paragraph("<b>3.1 FacturePro Backend (8.2/10)</b>", styles['H2']))
    story.append(Paragraph(
        "Le backend FacturePro est mature et bien structure, avec une architecture multi-tenant SaaS complete, "
        "un systeme de facturation robuste et des services bien organises. C'est le plus avance des deux backends.",
        styles['BodyJustify']
    ))
    
    backend_fp_data = [
        [Paragraph('<b>Critere</b>', styles['TableHeader']), 
         Paragraph('<b>Note</b>', styles['TableHeader']), 
         Paragraph('<b>Commentaire</b>', styles['TableHeader'])],
        [Paragraph('Architecture', styles['TableCellLeft']), 
         Paragraph('8/10', styles['TableCell']), 
         Paragraph('Modulaire, bien organisee, separation des responsabilites', styles['TableCellLeft'])],
        [Paragraph('Modeles SQLAlchemy', styles['TableCellLeft']), 
         Paragraph('8.5/10', styles['TableCell']), 
         Paragraph('26 modeles, relations bien configurees, enums', styles['TableCellLeft'])],
        [Paragraph('Endpoints API', styles['TableCellLeft']), 
         Paragraph('8/10', styles['TableCell']), 
         Paragraph('16 routers, pagination, filtres, audit logging', styles['TableCellLeft'])],
        [Paragraph('Authentification', styles['TableCellLeft']), 
         Paragraph('7.5/10', styles['TableCell']), 
         Paragraph('JWT, 2FA TOTP disponible mais non integre login', styles['TableCellLeft'])],
        [Paragraph('Validation Pydantic', styles['TableCellLeft']), 
         Paragraph('8.5/10', styles['TableCell']), 
         Paragraph('Schemas complets, EmailStr, patterns regex', styles['TableCellLeft'])],
        [Paragraph('Tests', styles['TableCellLeft']), 
         Paragraph('6/10', styles['TableCell']), 
         Paragraph('Couverture faible (~15%), tests de base presents', styles['TableCellLeft'])],
        [Paragraph('Documentation API', styles['TableCellLeft']), 
         Paragraph('8/10', styles['TableCell']), 
         Paragraph('OpenAPI auto-genere, /docs et /redoc disponibles', styles['TableCellLeft'])],
        [Paragraph('Celery Tasks', styles['TableCellLeft']), 
         Paragraph('8.5/10', styles['TableCell']), 
         Paragraph('Configuration complete, queues separees, beat schedule', styles['TableCellLeft'])],
        [Paragraph('Services', styles['TableCellLeft']), 
         Paragraph('8/10', styles['TableCell']), 
         Paragraph('Email, PDF, cache, webhook, backup, 2FA', styles['TableCellLeft'])],
    ]
    story.append(Spacer(1, 12))
    story.append(create_table(backend_fp_data, [3.5*cm, 1.5*cm, 7*cm]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<i>Tableau 2 : Evaluation detaillee FacturePro Backend</i>", styles['TableCell']))
    story.append(Spacer(1, 18))
    
    # SavanaFlow Backend
    story.append(Paragraph("<b>3.2 SavanaFlow Backend (7.4/10)</b>", styles['H2']))
    story.append(Paragraph(
        "Backend POS specialise avec gestion des stocks multi-magasins, fidelite client et promotions. "
        "Architecture solide mais moins mature que FacturePro.",
        styles['BodyJustify']
    ))
    
    backend_sf_data = [
        [Paragraph('<b>Critere</b>', styles['TableHeader']), 
         Paragraph('<b>Note</b>', styles['TableHeader']), 
         Paragraph('<b>Commentaire</b>', styles['TableHeader'])],
        [Paragraph('Architecture', styles['TableCellLeft']), 
         Paragraph('7/10', styles['TableCell']), 
         Paragraph('Structure standard, dossier endpoints_new a nettoyer', styles['TableCellLeft'])],
        [Paragraph('Modeles SQLAlchemy', styles['TableCellLeft']), 
         Paragraph('8/10', styles['TableCell']), 
         Paragraph('21 modeles POS: Sale, Shift, Store, Loyalty, Promotion', styles['TableCellLeft'])],
        [Paragraph('Endpoints API', styles['TableCellLeft']), 
         Paragraph('7.5/10', styles['TableCell']), 
         Paragraph('14 routers, endpoints shifts, transfers, refunds', styles['TableCellLeft'])],
        [Paragraph('Authentification', styles['TableCellLeft']), 
         Paragraph('6.5/10', styles['TableCell']), 
         Paragraph('JWT standard, PAS de 2FA, PAS de password reset', styles['TableCellLeft'])],
        [Paragraph('Tests', styles['TableCellLeft']), 
         Paragraph('5/10', styles['TableCell']), 
         Paragraph('Seulement 3 tests de base', styles['TableCellLeft'])],
        [Paragraph('Celery Tasks', styles['TableCellLeft']), 
         Paragraph('8/10', styles['TableCell']), 
         Paragraph('Taches inventory, reports, sync, offline sync', styles['TableCellLeft'])],
    ]
    story.append(Spacer(1, 12))
    story.append(create_table(backend_sf_data, [3.5*cm, 1.5*cm, 7*cm]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<i>Tableau 3 : Evaluation detaillee SavanaFlow Backend</i>", styles['TableCell']))
    story.append(Spacer(1, 18))
    
    # Backend common issues
    story.append(Paragraph("<b>3.3 Problemes communs aux backends</b>", styles['H3']))
    common_issues = [
        [Paragraph('<b>Probleme</b>', styles['TableHeader']), 
         Paragraph('<b>Impact</b>', styles['TableHeader']), 
         Paragraph('<b>Solution recommandee</b>', styles['TableHeader'])],
        [Paragraph('Secret keys par defaut en dur', styles['TableCellLeft']), 
         Paragraph('Critique', styles['TableCell']), 
         Paragraph('Externaliser vers variables environnement ou Vault', styles['TableCellLeft'])],
        [Paragraph('Tokens JWT non revocables', styles['TableCellLeft']), 
         Paragraph('Haute', styles['TableCell']), 
         Paragraph('Implementer token blacklist avec Redis', styles['TableCellLeft'])],
        [Paragraph('Pas de refresh token rotation', styles['TableCellLeft']), 
         Paragraph('Moyenne', styles['TableCell']), 
         Paragraph('Revoquer ancien refresh token a chaque usage', styles['TableCellLeft'])],
        [Paragraph('Couverture tests < 20%', styles['TableCellLeft']), 
         Paragraph('Haute', styles['TableCell']), 
         Paragraph('Ajouter tests integration et E2E', styles['TableCellLeft'])],
        [Paragraph('Manque indexes composites', styles['TableCellLeft']), 
         Paragraph('Moyenne', styles['TableCell']), 
         Paragraph('Ajouter index sur (organisation_id, status)', styles['TableCellLeft'])],
        [Paragraph('2FA non integre login', styles['TableCellLeft']), 
         Paragraph('Moyenne', styles['TableCell']), 
         Paragraph('Ajouter etape verification apres login', styles['TableCellLeft'])],
    ]
    story.append(Spacer(1, 12))
    story.append(create_table(common_issues, [4*cm, 2*cm, 6*cm]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<i>Tableau 4 : Problemes communs et solutions</i>", styles['TableCell']))
    story.append(Spacer(1, 18))
    
    # ========== FRONTEND ==========
    story.append(Paragraph("<b>4. AUDIT FRONTENDS REACT/VITE</b>", styles['H1']))
    
    # FacturePro Frontend
    story.append(Paragraph("<b>4.1 FacturePro Frontend (7.5/10)</b>", styles['H2']))
    story.append(Paragraph("<b>Points forts :</b>", styles['Success']))
    story.append(Paragraph("- Internationalisation complete : 5 langues (fr, en, wo, sw, sus)", styles['Success']))
    story.append(Paragraph("- PWA avec service worker (493 lignes)", styles['Success']))
    story.append(Paragraph("- Mode offline avec IndexedDB", styles['Success']))
    story.append(Paragraph("- 11 composants UI reutilisables (Button, Input, Modal, Card, etc.)", styles['Success']))
    story.append(Paragraph("- Gestion auth avec Zustand + refresh token automatique", styles['Success']))
    story.append(Paragraph("- Helper functions : formatCurrency, formatDate pour Afrique", styles['Success']))
    
    story.append(Paragraph("<b>Problemes :</b>", styles['Warning']))
    story.append(Paragraph("- PAS de tests frontend (0%)", styles['Critical']))
    story.append(Paragraph("- Pas de lazy loading (React.lazy/Suspense)", styles['Warning']))
    story.append(Paragraph("- Pas de menu mobile responsive (sidebar fixe)", styles['Warning']))
    story.append(Paragraph("- React Query dans package.json mais non utilise", styles['Warning']))
    story.append(Paragraph("- Service worker non enregistre dans main.tsx", styles['Warning']))
    story.append(Paragraph("- Pas de ErrorBoundary global", styles['Warning']))
    
    # SavanaFlow Frontend
    story.append(Paragraph("<b>4.2 SavanaFlow Frontend (8.0/10)</b>", styles['H2']))
    story.append(Paragraph(
        "Meilleur frontend des deux avec une PWA tres complete, mode offline robuste et UI moderne.",
        styles['BodyJustify']
    ))
    
    story.append(Paragraph("<b>Points forts :</b>", styles['Success']))
    story.append(Paragraph("- PWA excellente avec background sync", styles['Success']))
    story.append(Paragraph("- IndexedDB pour ventes offline (saveOfflineSale)", styles['Success']))
    story.append(Paragraph("- Hook personnalise useOfflineSync", styles['Success']))
    story.append(Paragraph("- Sidebar mobile avec overlay (responsive)", styles['Success']))
    story.append(Paragraph("- Store cart avec calculs automatiques (subtotal, tax, total)", styles['Success']))
    story.append(Paragraph("- Manifest.json tres complet (screenshots, shortcuts)", styles['Success']))
    story.append(Paragraph("- Cache products/customers pour recherche offline", styles['Success']))
    
    story.append(Paragraph("<b>Problemes :</b>", styles['Warning']))
    story.append(Paragraph("- PAS de tests frontend (0%)", styles['Critical']))
    story.append(Paragraph("- Labels de navigation hardcodeds en francais dans Layout", styles['Warning']))
    story.append(Paragraph("- Pas de lazy loading", styles['Warning']))
    
    # Frontend comparison table
    story.append(Paragraph("<b>4.3 Comparaison des frontends</b>", styles['H3']))
    frontend_data = [
        [Paragraph('<b>Critere</b>', styles['TableHeader']), 
         Paragraph('<b>FacturePro</b>', styles['TableHeader']), 
         Paragraph('<b>SavanaFlow</b>', styles['TableHeader'])],
        [Paragraph('i18n (Internationalisation)', styles['TableCellLeft']), 
         Paragraph('9/10', styles['TableCell']), 
         Paragraph('8/10', styles['TableCell'])],
        [Paragraph('PWA/Offline', styles['TableCellLeft']), 
         Paragraph('8/10', styles['TableCell']), 
         Paragraph('10/10', styles['TableCell'])],
        [Paragraph('Responsive Design', styles['TableCellLeft']), 
         Paragraph('7/10', styles['TableCell']), 
         Paragraph('9/10', styles['TableCell'])],
        [Paragraph('Tests', styles['TableCellLeft']), 
         Paragraph('2/10', styles['TableCell']), 
         Paragraph('2/10', styles['TableCell'])],
        [Paragraph('Performance', styles['TableCellLeft']), 
         Paragraph('6/10', styles['TableCell']), 
         Paragraph('6/10', styles['TableCell'])],
        [Paragraph('Accessibilite', styles['TableCellLeft']), 
         Paragraph('6/10', styles['TableCell']), 
         Paragraph('6/10', styles['TableCell'])],
        [Paragraph('Composants UI', styles['TableCellLeft']), 
         Paragraph('8/10', styles['TableCell']), 
         Paragraph('8/10', styles['TableCell'])],
    ]
    story.append(Spacer(1, 12))
    story.append(create_table(frontend_data, [4.5*cm, 3.5*cm, 3.5*cm]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<i>Tableau 5 : Comparaison detaillee des frontends</i>", styles['TableCell']))
    story.append(Spacer(1, 18))
    
    # ========== DATABASE ==========
    story.append(Paragraph("<b>5. AUDIT BASE DE DONNEES</b>", styles['H1']))
    story.append(Paragraph("Note globale : 6.5/10", styles['H2']))
    
    db_summary = [
        [Paragraph('<b>Application</b>', styles['TableHeader']), 
         Paragraph('<b>Tables</b>', styles['TableHeader']), 
         Paragraph('<b>Note</b>', styles['TableHeader']),
         Paragraph('<b>Statut</b>', styles['TableHeader'])],
        [Paragraph('FacturePro', styles['TableCell']), 
         Paragraph('22+', styles['TableCell']), 
         Paragraph('7.8/10', styles['TableCell']),
         Paragraph('Bon', styles['TableCell'])],
        [Paragraph('SavanaFlow', styles['TableCell']), 
         Paragraph('19', styles['TableCell']), 
         Paragraph('5.1/10', styles['TableCell']),
         Paragraph('A ameliorer', styles['TableCell'])],
    ]
    story.append(Spacer(1, 12))
    story.append(create_table(db_summary, [3.5*cm, 2*cm, 2*cm, 3.5*cm]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<i>Tableau 6 : Resume des bases de donnees</i>", styles['TableCell']))
    story.append(Spacer(1, 18))
    
    story.append(Paragraph("<b>5.1 Points forts</b>", styles['H3']))
    story.append(Paragraph("- Architecture multi-tenant mature avec Organisation, Subscription, Plan (FacturePro)", styles['Success']))
    story.append(Paragraph("- Types appropries : Numeric pour montants financiers (pas de float)", styles['Success']))
    story.append(Paragraph("- Index composites pour requetes frequentes (org_id, status, date)", styles['Success']))
    story.append(Paragraph("- Service de backup complet avec S3 upload (FacturePro)", styles['Success']))
    story.append(Paragraph("- ORM moderne : SQLAlchemy 2.0 async avec selectin loading", styles['Success']))
    story.append(Paragraph("- Relations bien configurees avec cascades appropriees", styles['Success']))
    story.append(Paragraph("- Audit logging avec tracking IP et details JSON", styles['Success']))
    
    story.append(Paragraph("<b>5.2 Problemes critiques</b>", styles['H3']))
    story.append(Paragraph("- PAS de soft delete (deleted_at) - suppression definitive des donnees", styles['Critical']))
    story.append(Paragraph("- PAS de chiffrement au repos pour donnees sensibles (telephones, emails)", styles['Critical']))
    story.append(Paragraph("- PAS de RLS (Row Level Security) PostgreSQL pour isolation tenant", styles['Critical']))
    story.append(Paragraph("- Secret keys hardcodedes dans le code source", styles['Critical']))
    
    story.append(Paragraph("<b>5.3 Problemes moyens</b>", styles['H3']))
    story.append(Paragraph("- Pas de CHECK constraints pour validation metier (amount > 0, score <= max)", styles['Warning']))
    story.append(Paragraph("- Pas de backup automatique configure pour SavanaFlow", styles['Warning']))
    story.append(Paragraph("- Pas d'index GIN pour colonnes JSONB (settings, attributes)", styles['Warning']))
    
    # ========== LEGAL COMPLIANCE ==========
    story.append(Paragraph("<b>6. CONFORMITE LEGALE ET COMMERCIALE</b>", styles['H1']))
    story.append(Paragraph("Note globale : 7.5/10", styles['H2']))
    
    story.append(Paragraph("<b>6.1 Elements presents et conformes</b>", styles['H3']))
    story.append(Paragraph("- Pages legales completes : CGV, Politique Confidentialite, CGU, Cookies", styles['Success']))
    story.append(Paragraph("- Support multilingue africain : 5 langues (fr, en, wo, sw, sus)", styles['Success']))
    story.append(Paragraph("- Devises africaines supportees : XOF, XAF, GNF, NGN, GHS, KES, TZS, etc.", styles['Success']))
    story.append(Paragraph("- Integration Mobile Money : Orange Money, MTN MoMo, Wave, M-Pesa, Celtis Cash", styles['Success']))
    story.append(Paragraph("- Configuration fiscale par pays africain (taux TVA, format facture)", styles['Success']))
    story.append(Paragraph("- Exigences fiscales guineennes configurees (NIF, DNI)", styles['Success']))
    
    story.append(Paragraph("<b>6.2 Elements manquants pour commercialisation</b>", styles['H3']))
    story.append(Paragraph("- Mentions legales avec RCCM/NIF reels de l'entreprise", styles['Critical']))
    story.append(Paragraph("- Certificat SSL/TLS pour HTTPS en production", styles['Critical']))
    story.append(Paragraph("- Agreement/licence pour transactions financieres (selon pays)", styles['Warning']))
    story.append(Paragraph("- Politique de remboursement detaillee", styles['Warning']))
    story.append(Paragraph("- Conditions specifiques par pays africain", styles['Warning']))
    story.append(Paragraph("- CGU specifiques pour operateurs Mobile Money", styles['Warning']))
    
    # ========== ACTION PLAN ==========
    story.append(Paragraph("<b>7. PLAN D'ACTION PRIORITAIRE</b>", styles['H1']))
    
    story.append(Paragraph("<b>7.1 Actions CRITIQUES (Semaine 1) - BLOQUANTES</b>", styles['H3']))
    critical_actions = [
        [Paragraph('<b>#</b>', styles['TableHeader']), 
         Paragraph('<b>Action</b>', styles['TableHeader']), 
         Paragraph('<b>Impact</b>', styles['TableHeader']),
         Paragraph('<b>Effort</b>', styles['TableHeader'])],
        [Paragraph('1', styles['TableCell']), 
         Paragraph('Configurer HTTPS avec certificats SSL/TLS (Let\'s Encrypt)', styles['TableCellLeft']), 
         Paragraph('Bloquant', styles['TableCell']),
         Paragraph('1-2 jours', styles['TableCell'])],
        [Paragraph('2', styles['TableCell']), 
         Paragraph('Externaliser tous les secrets vers variables environnement', styles['TableCellLeft']), 
         Paragraph('Bloquant', styles['TableCell']),
         Paragraph('1 jour', styles['TableCell'])],
        [Paragraph('3', styles['TableCell']), 
         Paragraph('Fermer les ports bases de donnees exposes (5442-5443)', styles['TableCellLeft']), 
         Paragraph('Bloquant', styles['TableCell']),
         Paragraph('2 heures', styles['TableCell'])],
        [Paragraph('4', styles['TableCell']), 
         Paragraph('Ajouter au moins tests basiques pour authentification', styles['TableCellLeft']), 
         Paragraph('Critique', styles['TableCell']),
         Paragraph('2 jours', styles['TableCell'])],
    ]
    story.append(Spacer(1, 12))
    story.append(create_table(critical_actions, [0.8*cm, 7.5*cm, 2*cm, 2*cm]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<i>Tableau 7 : Actions critiques a implementer en premier</i>", styles['TableCell']))
    story.append(Spacer(1, 18))
    
    story.append(Paragraph("<b>7.2 Actions HAUTE PRIORITE (Semaines 2-3)</b>", styles['H3']))
    story.append(Paragraph("- Implementer token blacklist Redis pour revocation JWT", styles['Warning']))
    story.append(Paragraph("- Ajouter indexes composites sur (organisation_id, status)", styles['Warning']))
    story.append(Paragraph("- Implementer soft delete sur toutes les tables (deleted_at)", styles['Warning']))
    story.append(Paragraph("- Configurer Prometheus/Grafana pour monitoring", styles['Warning']))
    story.append(Paragraph("- Ajouter rate limiting sur endpoints auth (login, register)", styles['Warning']))
    story.append(Paragraph("- Enregistrer service worker dans FacturePro main.tsx", styles['Warning']))
    
    story.append(Paragraph("<b>7.3 Actions MOYENNE PRIORITE (Mois 1)</b>", styles['H3']))
    story.append(Paragraph("- Augmenter couverture tests a 50%+ (backend)", styles['Body']))
    story.append(Paragraph("- Ajouter tests frontend avec Vitest + Testing Library", styles['Body']))
    story.append(Paragraph("- Implementer lazy loading sur toutes les pages", styles['Body']))
    story.append(Paragraph("- Ajouter ErrorBoundary global", styles['Body']))
    story.append(Paragraph("- Configurer backup automatique pour SavanaFlow", styles['Body']))
    story.append(Paragraph("- Integrer 2FA dans le flux login principal", styles['Body']))
    story.append(Paragraph("- Traduire labels navigation SavanaFlow", styles['Body']))
    
    story.append(Paragraph("<b>7.4 Actions BASSE PRIORITE (Mois 2-3)</b>", styles['H3']))
    story.append(Paragraph("- Couverture tests a 80%+", styles['Body']))
    story.append(Paragraph("- Implementer RLS PostgreSQL pour isolation multi-tenant", styles['Body']))
    story.append(Paragraph("- Ajouter pagination keyset pour grandes tables", styles['Body']))
    story.append(Paragraph("- Chiffrement au repos pour PII (telephones, emails)", styles['Body']))
    story.append(Paragraph("- Configurer Storybook pour documentation composants", styles['Body']))
    
    # ========== CHECKLIST ==========
    story.append(Paragraph("<b>8. CHECKLIST COMMERCIALISATION</b>", styles['H1']))
    
    checklist = [
        [Paragraph('<b>Element</b>', styles['TableHeader']), 
         Paragraph('<b>Statut</b>', styles['TableHeader']), 
         Paragraph('<b>Action requise</b>', styles['TableHeader'])],
        [Paragraph('HTTPS/SSL', styles['TableCellLeft']), 
         Paragraph('NON', styles['TableCell']), 
         Paragraph('Configurer Let\'s Encrypt ou certificat achete', styles['TableCellLeft'])],
        [Paragraph('Secrets securises', styles['TableCellLeft']), 
         Paragraph('NON', styles['TableCell']), 
         Paragraph('Externaliser vers env vars ou Vault', styles['TableCellLeft'])],
        [Paragraph('Firewall/ports fermes', styles['TableCellLeft']), 
         Paragraph('NON', styles['TableCell']), 
         Paragraph('Fermer ports DB, configurer firewall', styles['TableCellLeft'])],
        [Paragraph('Tests unitaires backend', styles['TableCellLeft']), 
         Paragraph('PARTIEL', styles['TableCell']), 
         Paragraph('Augmenter couverture a 50%+', styles['TableCellLeft'])],
        [Paragraph('Tests frontend', styles['TableCellLeft']), 
         Paragraph('NON', styles['TableCell']), 
         Paragraph('Ajouter Vitest + Testing Library', styles['TableCellLeft'])],
        [Paragraph('Tests E2E', styles['TableCellLeft']), 
         Paragraph('NON', styles['TableCell']), 
         Paragraph('Ajouter Playwright ou Cypress', styles['TableCellLeft'])],
        [Paragraph('Monitoring (Sentry)', styles['TableCellLeft']), 
         Paragraph('OUI', styles['TableCell']), 
         Paragraph('Configure sur FacturePro', styles['TableCellLeft'])],
        [Paragraph('Monitoring (Prometheus/Grafana)', styles['TableCellLeft']), 
         Paragraph('NON', styles['TableCell']), 
         Paragraph('A configurer', styles['TableCellLeft'])],
        [Paragraph('Backup automatique', styles['TableCellLeft']), 
         Paragraph('PARTIEL', styles['TableCell']), 
         Paragraph('FacturePro OK, ajouter SavanaFlow', styles['TableCellLeft'])],
        [Paragraph('PWA/Offline', styles['TableCellLeft']), 
         Paragraph('OUI', styles['TableCell']), 
         Paragraph('Excellent sur SavanaFlow', styles['TableCellLeft'])],
        [Paragraph('Internationalisation', styles['TableCellLeft']), 
         Paragraph('OUI', styles['TableCell']), 
         Paragraph('5 langues dont Soussou', styles['TableCellLeft'])],
        [Paragraph('Pages legales', styles['TableCellLeft']), 
         Paragraph('OUI', styles['TableCell']), 
         Paragraph('Completes (CGV, CGU, Privacy, Cookies)', styles['TableCellLeft'])],
        [Paragraph('Paiements africains', styles['TableCellLeft']), 
         Paragraph('PARTIEL', styles['TableCell']), 
         Paragraph('Configs presentes, integrer APIs officielles', styles['TableCellLeft'])],
        [Paragraph('Conformite fiscale', styles['TableCellLeft']), 
         Paragraph('OUI', styles['TableCell']), 
         Paragraph('Par pays africain', styles['TableCellLeft'])],
    ]
    story.append(Spacer(1, 12))
    story.append(create_table(checklist, [4*cm, 2*cm, 6*cm]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<i>Tableau 8 : Checklist pre-commercialisation</i>", styles['TableCell']))
    story.append(Spacer(1, 18))
    
    # ========== CONCLUSION ==========
    story.append(Paragraph("<b>9. CONCLUSION ET ESTIMATION</b>", styles['H1']))
    story.append(Paragraph(
        "Le projet FacturePro/SavanaFlow presente une architecture solide avec deux applications complementaires "
        "bien adaptees au marche africain. Les points forts sont l'architecture multi-tenant de FacturePro, "
        "l'excellente PWA de SavanaFlow et le support multilingue africain complet.",
        styles['BodyJustify']
    ))
    story.append(Spacer(1, 12))
    story.append(Paragraph("<b>Blocants pour commercialisation :</b>", styles['Critical']))
    story.append(Paragraph("1. Absence de HTTPS/SSL - Impossible de vendre sans connexion securisee", styles['Critical']))
    story.append(Paragraph("2. Secrets exposes dans le code - Risque de securite majeur", styles['Critical']))
    story.append(Paragraph("3. Ports bases de donnees exposes - Vulnerabilite critique", styles['Critical']))
    story.append(Spacer(1, 12))
    story.append(Paragraph("<b>Points forts du projet :</b>", styles['Success']))
    story.append(Paragraph("- Architecture multi-tenant SaaS mature (FacturePro)", styles['Success']))
    story.append(Paragraph("- PWA excellente avec mode offline (SavanaFlow)", styles['Success']))
    story.append(Paragraph("- Support 5 langues africaines dont Soussou (Guinee)", styles['Success']))
    story.append(Paragraph("- Integration Mobile Money africains prete", styles['Success']))
    story.append(Paragraph("- Conformite fiscale par pays configuree", styles['Success']))
    story.append(Spacer(1, 12))
    
    # Timeline
    story.append(Paragraph("<b>Estimation delai commercialisation :</b>", styles['H3']))
    timeline_data = [
        [Paragraph('<b>Phase</b>', styles['TableHeader']), 
         Paragraph('<b>Duree</b>', styles['TableHeader']), 
         Paragraph('<b>Objectifs</b>', styles['TableHeader'])],
        [Paragraph('Phase 1 - Critique', styles['TableCellLeft']), 
         Paragraph('1 semaine', styles['TableCell']), 
         Paragraph('HTTPS, secrets, ports fermes', styles['TableCellLeft'])],
        [Paragraph('Phase 2 - Haute priorite', styles['TableCellLeft']), 
         Paragraph('2 semaines', styles['TableCell']), 
         Paragraph('Tests, token blacklist, soft delete', styles['TableCellLeft'])],
        [Paragraph('Phase 3 - Moyenne priorite', styles['TableCellLeft']), 
         Paragraph('1 semaine', styles['TableCell']), 
         Paragraph('Monitoring, backups, 2FA', styles['TableCellLeft'])],
        [Paragraph('TOTAL', styles['TableCellLeft']), 
         Paragraph('4 semaines', styles['TableCell']), 
         Paragraph('Projet commercialisable', styles['TableCellLeft'])],
    ]
    story.append(Spacer(1, 12))
    story.append(create_table(timeline_data, [4*cm, 2.5*cm, 5.5*cm]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<i>Tableau 9 : Timeline de mise en production</i>", styles['TableCell']))
    story.append(Spacer(1, 18))
    
    story.append(Paragraph(
        "Avec l'execution du plan d'action propose, le projet peut etre commercialisable en Guinee et en Afrique "
        "dans un delai de 4 semaines. L'investissement principal doit porter sur la securite infrastructurelle "
        "(HTTPS, secrets, firewall) et les tests automatises.",
        styles['BodyJustify']
    ))
    
    # Build PDF
    doc.build(story)
    print(f"PDF genere : {output_path}")

if __name__ == '__main__':
    main()
