/**
 * Invoice Scanner Component
 *
 * Provides drag-and-drop interface for uploading invoice images
 * and extracting data using AI OCR.
 */
import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileImage, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { api } from '../../lib/api';

interface InvoiceScannerProps {
  onExtracted?: (data: OCRResult) => void;
  language?: string;
  saveToDatabase?: boolean;
}

interface OCRResultItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
}

interface OCRResult {
  supplier_name: string;
  supplier_address: string;
  supplier_phone: string;
  invoice_number: string;
  date: string | null;
  due_date: string | null;
  items: OCRResultItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  payment_terms: string;
  notes: string;
  confidence: number;
}

export function InvoiceScanner({
  onExtracted,
  language = 'fr',
  saveToDatabase = false,
}: InvoiceScannerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Format non supporté. Utilisez JPEG, PNG, WebP ou PDF.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Fichier trop volumineux. Maximum 10MB.');
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);
      formData.append('save_to_database', String(saveToDatabase));

      const response = await api.post('/ai/ocr/invoice', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setResult(response.data.data);
        onExtracted?.(response.data.data);
      } else {
        setError(response.data.error || 'Erreur lors de l\'extraction');
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      setError(err.response?.data?.detail || 'Erreur lors du traitement de l\'image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [language, saveToDatabase]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const resetScanner = () => {
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Scanner de Facture IA
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Glissez une image de facture pour extraire automatiquement les données
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8
          flex flex-col items-center justify-center
          cursor-pointer transition-all duration-200
          ${isDragging
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'
          }
          ${isProcessing ? 'pointer-events-none' : ''}
        `}
        style={{ minHeight: '200px' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            <p className="mt-4 text-sm text-gray-600">
              Analyse de la facture en cours...
            </p>
          </div>
        ) : previewUrl ? (
          <div className="relative w-full">
            <img
              src={previewUrl}
              alt="Aperçu"
              className="max-h-48 mx-auto rounded-lg shadow-sm"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetScanner();
              }}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="p-4 bg-emerald-100 rounded-full mb-4">
              <Upload className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-600 text-center">
              Glissez une image ici ou <span className="text-emerald-600 font-medium">cliquez pour sélectionner</span>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              JPEG, PNG, WebP ou PDF (max 10MB)
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Erreur</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="font-medium text-gray-900">Extraction réussie</span>
            </div>
            <ConfidenceBadge confidence={result.confidence} />
          </div>

          <OCRResultDisplay result={result} />
        </div>
      )}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'bg-emerald-100 text-emerald-800';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceLabel = () => {
    if (confidence >= 0.8) return 'Haute confiance';
    if (confidence >= 0.5) return 'Confiance moyenne';
    return 'Basse confiance';
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor()}`}>
      {getConfidenceLabel()} ({Math.round(confidence * 100)}%)
    </span>
  );
}

function OCRResultDisplay({ result }: { result: OCRResult }) {
  return (
    <div className="space-y-4">
      {/* Supplier Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Fournisseur</h4>
          <p className="font-semibold text-gray-900">{result.supplier_name || 'Non détecté'}</p>
          {result.supplier_address && (
            <p className="text-sm text-gray-600 mt-1">{result.supplier_address}</p>
          )}
          {result.supplier_phone && (
            <p className="text-sm text-gray-600">{result.supplier_phone}</p>
          )}
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Facture</h4>
          <p className="font-semibold text-gray-900">
            N° {result.invoice_number || 'Non détecté'}
          </p>
          <div className="flex gap-4 mt-1">
            {result.date && (
              <p className="text-sm text-gray-600">Date: {result.date}</p>
            )}
            {result.due_date && (
              <p className="text-sm text-gray-600">Échéance: {result.due_date}</p>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      {result.items && result.items.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Lignes</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qté</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">P.U.</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {result.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 text-right">
                      {item.unit_price.toLocaleString('fr-FR')} {result.currency}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 font-medium text-right">
                      {item.total.toLocaleString('fr-FR')} {result.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="bg-emerald-50 rounded-lg p-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Sous-total</span>
          <span>{result.subtotal.toLocaleString('fr-FR')} {result.currency}</span>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Taxe</span>
          <span>{result.tax.toLocaleString('fr-FR')} {result.currency}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-emerald-700 pt-2 border-t border-emerald-200">
          <span>Total</span>
          <span>{result.total.toLocaleString('fr-FR')} {result.currency}</span>
        </div>
      </div>
    </div>
  );
}

export default InvoiceScanner;
