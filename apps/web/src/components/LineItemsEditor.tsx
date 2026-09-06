'use client';

import { useState } from 'react';
import type { Element } from '@glaszetter/shared';
import { ELEMENT_TYPE_LABELS } from '../constants/elementTypeLabels';
import { pageStyles, formStyles } from '../styles/shared';

export interface LineItem {
  id: string;
  elementId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface LineItemInput {
  elementId?: string;
  description: string;
  quantity?: number;
  unitPrice: number;
}

interface LineItemsEditorProps {
  lines: LineItem[];
  elements: Element[];
  vatRate: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  onAddLine: (input: LineItemInput) => Promise<void>;
  onDeleteLine: (lineId: string) => Promise<void>;
}

const formatCurrency = (amount: number): string =>
  `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const LineItemsEditor: React.FC<LineItemsEditorProps> = ({
  lines,
  elements,
  vatRate,
  subtotal,
  vatAmount,
  total,
  onAddLine,
  onDeleteLine,
}) => {
  const [elementId, setElementId] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleElementChange = (id: string) => {
    setElementId(id);
    const element = elements.find((el) => el.id === id);
    if (element) {
      setDescription(`${element.code} - ${ELEMENT_TYPE_LABELS[element.type]}`);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const price = parseFloat(unitPrice.replace(',', '.'));
    if (!description.trim()) {
      setFormError('Omschrijving is verplicht.');
      return;
    }
    if (Number.isNaN(price)) {
      setFormError('Vul een geldige prijs in.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddLine({
        elementId: elementId || undefined,
        description: description.trim(),
        quantity: parseFloat(quantity.replace(',', '.')) || 1,
        unitPrice: price,
      });
      setElementId('');
      setDescription('');
      setQuantity('1');
      setUnitPrice('');
    } catch {
      setFormError('Regel toevoegen is mislukt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleAdd} style={{ ...formStyles.card, maxWidth: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 100px 140px auto', gap: 'var(--spacing-md)', alignItems: 'end' }}>
          <div>
            <label style={formStyles.label} htmlFor="line-element">
              Element (optioneel)
            </label>
            <select
              id="line-element"
              style={formStyles.select}
              value={elementId}
              onChange={(e) => handleElementChange(e.target.value)}
            >
              <option value="">— Vrije regel —</option>
              {elements.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.code} ({ELEMENT_TYPE_LABELS[el.type]})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={formStyles.label} htmlFor="line-description">
              Omschrijving
            </label>
            <input
              id="line-description"
              style={formStyles.input}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label style={formStyles.label} htmlFor="line-quantity">
              Aantal
            </label>
            <input
              id="line-quantity"
              type="number"
              step="1"
              style={formStyles.input}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <label style={formStyles.label} htmlFor="line-price">
              Prijs per stuk
            </label>
            <input
              id="line-price"
              type="number"
              step="0.01"
              style={formStyles.input}
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <button type="submit" style={formStyles.submitButton} disabled={isSubmitting}>
            + Regel
          </button>
        </div>
        {formError && <p style={pageStyles.error}>{formError}</p>}
      </form>

      {lines.length === 0 && <p style={pageStyles.empty}>Nog geen regels toegevoegd.</p>}

      {lines.length > 0 && (
        <table style={pageStyles.table}>
          <thead>
            <tr>
              <th style={pageStyles.th}>Omschrijving</th>
              <th style={pageStyles.th}>Aantal</th>
              <th style={pageStyles.th}>Prijs</th>
              <th style={pageStyles.th}>Totaal</th>
              <th style={pageStyles.th}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td style={pageStyles.td}>{line.description}</td>
                <td style={pageStyles.td}>{line.quantity}</td>
                <td style={pageStyles.td}>{formatCurrency(line.unitPrice)}</td>
                <td style={pageStyles.td}>{formatCurrency(line.quantity * line.unitPrice)}</td>
                <td style={pageStyles.td}>
                  <button type="button" style={deleteButtonStyle} onClick={() => onDeleteLine(line.id)}>
                    verwijderen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={totalsStyle}>
        <div style={totalsRowStyle}>
          <span>Subtotaal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div style={totalsRowStyle}>
          <span>BTW ({vatRate}%)</span>
          <span>{formatCurrency(vatAmount)}</span>
        </div>
        <div style={{ ...totalsRowStyle, fontWeight: 700, fontSize: 16 }}>
          <span>Totaal</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};

const deleteButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--color-error)',
  fontSize: 12,
  cursor: 'pointer',
  padding: 0,
};

const totalsStyle: React.CSSProperties = {
  maxWidth: 320,
  marginLeft: 'auto',
  marginTop: 'var(--spacing-lg)',
};

const totalsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: 'var(--spacing-xs) 0',
};
