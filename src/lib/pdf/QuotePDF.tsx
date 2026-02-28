// src/lib/pdf/QuotePDF.tsx
// =============================================================================
// LUSTRE — Quote PDF Template
// Uses @react-pdf/renderer — serverless compatible, no headless Chrome needed
// =============================================================================

import {
  Document, Page, Text, View, StyleSheet, Font
} from '@react-pdf/renderer'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface QuotePDFData {
  quoteNumber: string
  title: string
  status: string
  pricingType: string
  fixedPrice: number | null
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  notes: string | null
  validUntil: string | null
  createdAt: string
  vatRegistered: boolean
  vatNumber: string | null

  client: {
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
  }

  property: {
    addressLine1: string
    addressLine2: string | null
    town: string
    postcode: string
  } | null

  lineItems: {
    description: string
    quantity: number
    unitPrice: number
    amount: number
    isAddon: boolean
  }[]

  org: {
    name: string
    email: string | null
    phone: string | null
    address: string | null
    vatNumber: string | null
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return '£' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const SAGE  = '#4a5c4e'
const BLACK = '#0c0c0b'
const GREY  = '#6b7280'
const LIGHT = '#f9f8f5'
const RULE  = '#e5e7eb'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: BLACK,
    backgroundColor: '#ffffff',
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: SAGE,
  },
  orgName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: SAGE,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  orgDetails: {
    fontSize: 8,
    color: GREY,
    marginTop: 3,
    lineHeight: 1.6,
  },
  quoteLabel: {
    fontSize: 8,
    color: GREY,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  quoteNumber: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: BLACK,
    textAlign: 'right',
    marginTop: 2,
  },

  // Bill to / details row
  metaRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 28,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7,
    color: GREY,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  metaName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: BLACK,
    marginBottom: 2,
  },
  metaText: {
    fontSize: 9,
    color: GREY,
    lineHeight: 1.5,
  },

  // Title
  quoteTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: BLACK,
    marginBottom: 20,
  },

  // Line items table
  table: {
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: SAGE,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  tableRowAlt: {
    backgroundColor: LIGHT,
  },
  colDescription: { flex: 1 },
  colQty:         { width: 40, textAlign: 'center' },
  colUnitPrice:   { width: 70, textAlign: 'right' },
  colAmount:      { width: 70, textAlign: 'right' },
  tableBodyText: {
    fontSize: 9,
    color: BLACK,
  },
  tableBodyMuted: {
    fontSize: 9,
    color: GREY,
  },

  // Add-ons section
  addOnLabel: {
    fontSize: 7,
    color: GREY,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 10,
  },

  // Totals
  totalsContainer: {
    alignItems: 'flex-end',
    marginTop: 16,
    marginBottom: 24,
  },
  totalsTable: {
    width: 200,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalsLabel: {
    fontSize: 9,
    color: GREY,
  },
  totalsValue: {
    fontSize: 9,
    color: BLACK,
  },
  totalsDivider: {
    borderTopWidth: 1,
    borderTopColor: RULE,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: BLACK,
  },
  totalValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: BLACK,
  },

  // Notes
  notesBox: {
    backgroundColor: LIGHT,
    borderRadius: 4,
    padding: 12,
    marginBottom: 24,
  },
  notesLabel: {
    fontSize: 7,
    color: GREY,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 9,
    color: BLACK,
    lineHeight: 1.6,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 7,
    color: GREY,
  },
})

// -----------------------------------------------------------------------------
// PDF Document
// -----------------------------------------------------------------------------

export function QuotePDF({ data }: { data: QuotePDFData }) {
  const { org, client, property, lineItems, taxRate } = data

  const coreItems  = lineItems.filter(i => !i.isAddon)
  const addonItems = lineItems.filter(i => i.isAddon)

  const orgAddressLines = [org.address, org.email, org.phone].filter(Boolean).join('  ·  ')
  const vatLine = data.vatRegistered && data.org.vatNumber
    ? `VAT No. ${data.org.vatNumber}`
    : null

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.orgName}>{org.name}</Text>
            {orgAddressLines ? <Text style={styles.orgDetails}>{orgAddressLines}</Text> : null}
            {vatLine ? <Text style={styles.orgDetails}>{vatLine}</Text> : null}
          </View>
          <View>
            <Text style={styles.quoteLabel}>Quote</Text>
            <Text style={styles.quoteNumber}>{data.quoteNumber}</Text>
          </View>
        </View>

        {/* Bill to / meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Bill to</Text>
            <Text style={styles.metaName}>{client.firstName} {client.lastName}</Text>
            {client.email ? <Text style={styles.metaText}>{client.email}</Text> : null}
            {client.phone ? <Text style={styles.metaText}>{client.phone}</Text> : null}
            {property ? (
              <Text style={styles.metaText}>
                {[property.addressLine1, property.addressLine2, property.town, property.postcode]
                  .filter(Boolean).join(', ')}
              </Text>
            ) : null}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Details</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={styles.metaText}>Date issued</Text>
              <Text style={styles.metaText}>{formatDate(data.createdAt)}</Text>
            </View>
            {data.validUntil ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={styles.metaText}>Valid until</Text>
                <Text style={styles.metaText}>{formatDate(data.validUntil)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Quote title */}
        <Text style={styles.quoteTitle}>{data.title}</Text>

        {/* Pricing — fixed */}
        {data.pricingType === 'fixed' ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
              <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableBodyText, styles.colDescription]}>{data.title}</Text>
              <Text style={[styles.tableBodyText, styles.colAmount]}>
                {formatCurrency(data.fixedPrice ?? data.total)}
              </Text>
            </View>
          </View>
        ) : (
          /* Pricing — itemised */
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
              <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.colUnitPrice]}>Unit price</Text>
              <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
            </View>
            {coreItems.map((item, i) => (
              <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tableBodyText, styles.colDescription]}>{item.description}</Text>
                <Text style={[styles.tableBodyText, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.tableBodyText, styles.colUnitPrice]}>{formatCurrency(item.unitPrice)}</Text>
                <Text style={[styles.tableBodyText, styles.colAmount]}>{formatCurrency(item.amount)}</Text>
              </View>
            ))}
            {addonItems.length > 0 && (
              <>
                <Text style={styles.addOnLabel}>Add-ons</Text>
                {addonItems.map((item, i) => (
                  <View key={i} style={[styles.tableRow, styles.tableRowAlt]}>
                    <Text style={[styles.tableBodyMuted, styles.colDescription]}>{item.description}</Text>
                    <Text style={[styles.tableBodyMuted, styles.colQty]}>{item.quantity}</Text>
                    <Text style={[styles.tableBodyMuted, styles.colUnitPrice]}>{formatCurrency(item.unitPrice)}</Text>
                    <Text style={[styles.tableBodyMuted, styles.colAmount]}>{formatCurrency(item.amount)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsTable}>
            {taxRate > 0 && (
              <>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Subtotal</Text>
                  <Text style={styles.totalsValue}>{formatCurrency(data.subtotal)}</Text>
                </View>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>VAT ({taxRate}%)</Text>
                  <Text style={styles.totalsValue}>{formatCurrency(data.taxAmount)}</Text>
                </View>
              </>
            )}
            <View style={styles.totalsDivider} />
            <View style={styles.totalsRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {data.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{org.name}  ·  {data.quoteNumber}</Text>
          <Text style={styles.footerText}>Powered by Lustre</Text>
        </View>

      </Page>
    </Document>
  )
}