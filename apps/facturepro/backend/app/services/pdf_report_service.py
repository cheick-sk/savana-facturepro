"""PDF Report Generation Service for OHADA Accounting — FacturePro Africa.

This service generates professional PDF reports for:
- Balance Générale (Trial Balance)
- Grand Livre (General Ledger)
- Compte de Résultat (Income Statement)
- Bilan (Balance Sheet)
- Balance Âgée (Aged Balance)
"""
from __future__ import annotations

import io
from datetime import datetime, date
from typing import TYPE_CHECKING, List, Dict, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

if TYPE_CHECKING:
    pass


class AccountingPDFGenerator:
    """Generate OHADA-compliant PDF reports."""
    
    # Colors
    HEADER_BG = colors.Color(0.95, 0.95, 0.95)
    DEBIT_COLOR = colors.Color(0.2, 0.6, 0.2)  # Green for debit
    CREDIT_COLOR = colors.Color(0.8, 0.2, 0.2)  # Red for credit
    TOTAL_BG = colors.Color(0.9, 0.9, 0.95)
    
    def __init__(self, organisation_name: str, currency: str = "XOF"):
        self.organisation_name = organisation_name
        self.currency = currency
        self.styles = getSampleStyleSheet()
        self._setup_styles()
    
    def _setup_styles(self):
        """Setup custom paragraph styles."""
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=16,
            alignment=TA_CENTER,
            spaceAfter=12,
            textColor=colors.black,
        ))
        self.styles.add(ParagraphStyle(
            name='ReportSubtitle',
            parent=self.styles['Normal'],
            fontSize=12,
            alignment=TA_CENTER,
            spaceAfter=6,
            textColor=colors.gray,
        ))
        self.styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=self.styles['Heading2'],
            fontSize=11,
            spaceBefore=12,
            spaceAfter=6,
            textColor=colors.Color(0.2, 0.2, 0.4),
        ))
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            alignment=TA_CENTER,
            textColor=colors.gray,
        ))
    
    def _format_amount(self, amount: float) -> str:
        """Format amount for display."""
        return f"{amount:,.2f}".replace(",", " ").replace(".", ",")
    
    def _add_header(self, elements: list, title: str, period: str = None, extra_info: dict = None):
        """Add report header."""
        elements.append(Paragraph(self.organisation_name, self.styles['ReportTitle']))
        elements.append(Paragraph(title, self.styles['ReportSubtitle']))
        if period:
            elements.append(Paragraph(period, self.styles['Footer']))
        if extra_info:
            info_text = " | ".join([f"{k}: {v}" for k, v in extra_info.items()])
            elements.append(Paragraph(info_text, self.styles['Footer']))
        elements.append(Spacer(1, 12))
    
    def _add_footer(self, elements: list, generated_at: datetime):
        """Add report footer."""
        elements.append(Spacer(1, 20))
        footer_text = f"Généré le {generated_at.strftime('%d/%m/%Y à %H:%M')} - FacturePro Africa"
        elements.append(Paragraph(footer_text, self.styles['Footer']))
    
    def generate_trial_balance_pdf(self, data: dict) -> bytes:
        """Generate Trial Balance (Balance Générale) PDF."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            rightMargin=1*cm,
            leftMargin=1*cm,
            topMargin=1*cm,
            bottomMargin=1*cm,
        )
        elements = []
        
        # Header
        period_text = f"Du {data['period_start']} au {data['period_end']}"
        extra_info = {"Exercice": data['fiscal_year'], "Devise": data['currency']}
        self._add_header(elements, "BALANCE GÉNÉRALE", period_text, extra_info)
        
        # Table header
        header = ['N° Compte', 'Libellé', 'Classe', 
                  'Mvt Débit', 'Mvt Crédit', 
                  'Solde Débit', 'Solde Crédit']
        
        table_data = [header]
        
        # Group by category
        for line in data['lines']:
            table_data.append([
                line['account_number'],
                line['account_name'][:40],  # Truncate long names
                line['category'].replace('classe_', ''),
                self._format_amount(line['movement_debit']),
                self._format_amount(line['movement_credit']),
                self._format_amount(line['closing_debit']),
                self._format_amount(line['closing_credit']),
            ])
        
        # Totals row
        table_data.append([
            '', 'TOTAUX', '',
            self._format_amount(data['total_movement_debit']),
            self._format_amount(data['total_movement_credit']),
            self._format_amount(data['total_closing_debit']),
            self._format_amount(data['total_closing_credit']),
        ])
        
        # Create table
        col_widths = [2*cm, 6*cm, 1.5*cm, 3*cm, 3*cm, 3*cm, 3*cm]
        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        
        # Style
        style = TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), self.HEADER_BG),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            
            # Body
            ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -2), 8),
            ('ALIGN', (0, 1), (2, -1), 'LEFT'),
            ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            
            # Totals row
            ('BACKGROUND', (0, -1), (-1, -1), self.TOTAL_BG),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ])
        table.setStyle(style)
        elements.append(table)
        
        # Balance indicator
        elements.append(Spacer(1, 12))
        if data['is_balanced']:
            balance_text = "✓ Balance équilibrée - Les totaux débits et crédits sont égaux"
            balance_color = colors.Color(0.2, 0.6, 0.2)
        else:
            balance_text = "✗ Attention: La balance n'est pas équilibrée"
            balance_color = colors.Color(0.8, 0.2, 0.2)
        
        balance_style = ParagraphStyle(
            name='Balance',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=balance_color,
            alignment=TA_CENTER,
        )
        elements.append(Paragraph(balance_text, balance_style))
        
        # Footer
        self._add_footer(elements, datetime.fromisoformat(data['generated_at'].replace('Z', '+00:00')))
        
        doc.build(elements)
        return buffer.getvalue()
    
    def generate_income_statement_pdf(self, data: dict) -> bytes:
        """Generate Income Statement (Compte de Résultat) PDF."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.5*cm,
            leftMargin=1.5*cm,
            topMargin=1*cm,
            bottomMargin=1*cm,
        )
        elements = []
        
        # Header
        period_text = f"Du {data['period_start']} au {data['period_end']}"
        extra_info = {"Exercice": data['fiscal_year'], "Devise": data['currency']}
        self._add_header(elements, "COMPTE DE RÉSULTAT", period_text, extra_info)
        
        def add_section(title: str, lines: list, total: float, is_expense: bool = True):
            """Add a section with lines and total."""
            elements.append(Paragraph(title, self.styles['SectionTitle']))
            
            table_data = [['N° Compte', 'Libellé', 'Montant', '%']]
            for line in lines:
                table_data.append([
                    line['account_number'],
                    line['account_name'][:50],
                    self._format_amount(line['amount']),
                    f"{line['percentage']:.1f}%",
                ])
            table_data.append(['', 'TOTAL', self._format_amount(total), ''])
            
            col_widths = [2*cm, 10*cm, 3*cm, 1.5*cm]
            table = Table(table_data, colWidths=col_widths, repeatRows=1)
            
            style = TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), self.HEADER_BG),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('BACKGROUND', (0, -1), (-1, -1), self.TOTAL_BG),
                ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ])
            table.setStyle(style)
            elements.append(table)
            elements.append(Spacer(1, 6))
        
        # Operating section
        add_section("CHARGES D'EXPLOITATION", 
                    data['operating_expenses']['lines'],
                    data['operating_expenses']['total'],
                    is_expense=True)
        add_section("PRODUITS D'EXPLOITATION",
                    data['operating_income']['lines'],
                    data['operating_income']['total'],
                    is_expense=False)
        
        # Operating result
        result_style = ParagraphStyle(
            name='Result',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.Color(0.2, 0.6, 0.2) if data['operating_result'] >= 0 else colors.Color(0.8, 0.2, 0.2),
        )
        elements.append(Paragraph(
            f"Résultat d'Exploitation: {self._format_amount(data['operating_result'])}",
            result_style
        ))
        elements.append(Spacer(1, 12))
        
        # Financial section
        if data['financial_expenses']['total'] > 0 or data['financial_income']['total'] > 0:
            add_section("CHARGES FINANCIÈRES",
                        data['financial_expenses']['lines'],
                        data['financial_expenses']['total'],
                        is_expense=True)
            add_section("PRODUITS FINANCIERS",
                        data['financial_income']['lines'],
                        data['financial_income']['total'],
                        is_expense=False)
            elements.append(Paragraph(
                f"Résultat Financier: {self._format_amount(data['financial_result'])}",
                result_style
            ))
            elements.append(Spacer(1, 12))
        
        # Net result
        elements.append(Spacer(1, 12))
        net_style = ParagraphStyle(
            name='NetResult',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.Color(0.2, 0.6, 0.2) if data['net_result'] >= 0 else colors.Color(0.8, 0.2, 0.2),
            alignment=TA_CENTER,
        )
        elements.append(Paragraph(
            f"RÉSULTAT NET DE L'EXERCICE: {self._format_amount(data['net_result'])}",
            net_style
        ))
        
        # Footer
        self._add_footer(elements, datetime.fromisoformat(data['generated_at'].replace('Z', '+00:00')))
        
        doc.build(elements)
        return buffer.getvalue()
    
    def generate_balance_sheet_pdf(self, data: dict) -> bytes:
        """Generate Balance Sheet (Bilan) PDF."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.5*cm,
            leftMargin=1.5*cm,
            topMargin=1*cm,
            bottomMargin=1*cm,
        )
        elements = []
        
        # Header
        period_text = f"Arrêté au {data['as_of_date']}"
        extra_info = {"Exercice": data['fiscal_year'], "Devise": data['currency']}
        self._add_header(elements, "BILAN SIMPLIFIÉ", period_text, extra_info)
        
        # Create two-column layout (Actif / Passif)
        def build_column(title: str, sections: list, total: float, bg_color: colors.Color):
            """Build a column for assets or liabilities."""
            col_elements = []
            col_elements.append(Paragraph(title, self.styles['SectionTitle']))
            
            for section in sections:
                table_data = [[section['title'], 'Brut', 'Amort.', 'Net']]
                for line in section['lines']:
                    table_data.append([
                        f"{line['account_number']} {line['account_name'][:30]}",
                        self._format_amount(line['gross_amount']),
                        self._format_amount(line['depreciation']),
                        self._format_amount(line['net_amount']),
                    ])
                table_data.append(['TOTAL', '', '', self._format_amount(section['total_net'])])
                
                col_widths = [5*cm, 2*cm, 2*cm, 2*cm]
                table = Table(table_data, colWidths=col_widths)
                style = TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), bg_color),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 7),
                    ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                    ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ])
                table.setStyle(style)
                col_elements.append(table)
                col_elements.append(Spacer(1, 6))
            
            # Total
            total_table = Table([['TOTAL ' + title, self._format_amount(total)]],
                               colWidths=[7*cm, 4*cm])
            total_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), bg_color),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ]))
            col_elements.append(total_table)
            
            return col_elements
        
        # Build both columns
        asset_sections = [
            data['fixed_assets'],
            data['current_assets'],
            data['cash_and_equivalents'],
        ]
        liability_sections = [
            data['equity'],
            data['long_term_liabilities'],
            data['current_liabilities'],
        ]
        
        # Asset column
        elements.append(Paragraph("ACTIF", self.styles['SectionTitle']))
        for section in asset_sections:
            if section['lines']:
                table_data = [[section['title'], 'Net']]
                for line in section['lines']:
                    table_data.append([
                        f"{line['account_number']} {line['account_name'][:40]}",
                        self._format_amount(line['net_amount']),
                    ])
                if section['total_net'] > 0:
                    table_data.append(['TOTAL', self._format_amount(section['total_net'])])
                
                    col_widths = [10*cm, 3*cm]
                    table = Table(table_data, colWidths=col_widths)
                    table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.85, 0.9, 1)),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 8),
                        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
                    ]))
                    elements.append(table)
                    elements.append(Spacer(1, 6))
        
        # Total assets
        elements.append(Paragraph(f"<b>TOTAL ACTIF: {self._format_amount(data['total_assets'])}</b>", self.styles['Normal']))
        elements.append(Spacer(1, 12))
        
        # Liability column
        elements.append(Paragraph("PASSIF", self.styles['SectionTitle']))
        for section in liability_sections:
            if section['lines']:
                table_data = [[section['title'], 'Net']]
                for line in section['lines']:
                    table_data.append([
                        f"{line['account_number']} {line['account_name'][:40]}",
                        self._format_amount(line['net_amount']),
                    ])
                if section['total_net'] > 0:
                    table_data.append(['TOTAL', self._format_amount(section['total_net'])])
                
                    col_widths = [10*cm, 3*cm]
                    table = Table(table_data, colWidths=col_widths)
                    table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.85, 0.95, 0.85)),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 8),
                        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
                    ]))
                    elements.append(table)
                    elements.append(Spacer(1, 6))
        
        # Total liabilities
        elements.append(Paragraph(f"<b>TOTAL PASSIF: {self._format_amount(data['total_liabilities_and_equity'])}</b>", self.styles['Normal']))
        
        # Balance check
        elements.append(Spacer(1, 12))
        if data['is_balanced']:
            balance_text = "✓ Bilan équilibré - Actif = Passif"
            balance_color = colors.Color(0.2, 0.6, 0.2)
        else:
            balance_text = "✗ Attention: Le bilan n'est pas équilibré"
            balance_color = colors.Color(0.8, 0.2, 0.2)
        
        balance_style = ParagraphStyle(
            name='Balance',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=balance_color,
            alignment=TA_CENTER,
        )
        elements.append(Paragraph(balance_text, balance_style))
        
        # Footer
        self._add_footer(elements, datetime.fromisoformat(data['generated_at'].replace('Z', '+00:00')))
        
        doc.build(elements)
        return buffer.getvalue()
    
    def generate_general_ledger_pdf(self, data: dict) -> bytes:
        """Generate General Ledger (Grand Livre) PDF."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.5*cm,
            leftMargin=1.5*cm,
            topMargin=1*cm,
            bottomMargin=1*cm,
        )
        elements = []
        
        # Header
        period_text = f"Du {data['period_start']} au {data['period_end']}"
        extra_info = {"Exercice": data['fiscal_year'], "Devise": data['currency']}
        self._add_header(elements, "GRAND LIVRE", period_text, extra_info)
        
        for account in data['accounts']:
            # Account header
            elements.append(Paragraph(
                f"<b>{account['account_number']} - {account['account_name']}</b>",
                self.styles['SectionTitle']
            ))
            elements.append(Paragraph(
                f"Solde d'ouverture: {self._format_amount(account['opening_balance'])} ({account['opening_direction']})",
                self.styles['Normal']
            ))
            
            # Lines table
            table_data = [['Date', 'N° Pièce', 'Libellé', 'Débit', 'Crédit', 'Solde', 'Let']]
            for line in account['lines']:
                table_data.append([
                    line['entry_date'],
                    line['entry_number'][:12],
                    (line['description'] or '')[:30],
                    self._format_amount(line['debit']),
                    self._format_amount(line['credit']),
                    self._format_amount(line['balance']),
                    line['letter_code'] or '',
                ])
            
            table_data.append([
                '', '', 'TOTAL',
                self._format_amount(account['total_debit']),
                self._format_amount(account['total_credit']),
                self._format_amount(account['closing_balance']),
                ''
            ])
            
            col_widths = [2*cm, 2.5*cm, 4*cm, 2*cm, 2*cm, 2*cm, 1*cm]
            table = Table(table_data, colWidths=col_widths)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), self.HEADER_BG),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 7),
                ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('BACKGROUND', (0, -1), (-1, -1), self.TOTAL_BG),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ]))
            elements.append(table)
            
            elements.append(Paragraph(
                f"Solde de clôture: {self._format_amount(account['closing_balance'])} ({account['closing_direction']})",
                self.styles['Normal']
            ))
            elements.append(Spacer(1, 12))
            
            # Page break after every 3 accounts
            if data['accounts'].index(account) % 3 == 2:
                elements.append(PageBreak())
        
        # Footer
        self._add_footer(elements, datetime.fromisoformat(data['generated_at'].replace('Z', '+00:00')))
        
        doc.build(elements)
        return buffer.getvalue()
