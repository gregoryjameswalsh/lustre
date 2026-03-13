// src/lib/pdf/InvoicePDF.tsx
// =============================================================================
// LUSTRE — Invoice PDF Template (UK HMRC compliant)
// Uses @react-pdf/renderer — no headless Chrome needed
// =============================================================================

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface InvoicePDFData {
  invoiceNumber: string
  issueDate:     string
  dueDate:       string
  status:        string

  subtotal:   number
  taxRate:    number
  taxAmount:  number
  total:      number
  amountPaid: number
  currency:   string

  notes:      string | null
  vatRegistered: boolean
  vatNumber:     string | null

  client: {
    firstName: string
    lastName:  string
    email:     string | null
    phone:     string | null
  }

  lineItems: {
    description: string
    quantity:    number
    unitPrice:   number
    amount:      number
  }[]

  org: {
    name:    string
    email:   string | null
    phone:   string | null
    address: string | null
    vatNumber: string | null
    logoUrl:   string | null
    brandColor: string | null
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
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// -----------------------------------------------------------------------------
// Styles — deliberately close to QuotePDF for brand consistency
// -----------------------------------------------------------------------------

const DEFAULT_BRAND = '#4a5c4e'
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: DEFAULT_BRAND,
  },
  orgName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: DEFAULT_BRAND,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  orgDetails: {
    fontSize: 8,
    color: GREY,
    marginTop: 3,
    lineHeight: 1.6,
  },
  docLabel: {
    fontSize: 8,
    color: GREY,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  docNumber: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: BLACK,
    textAlign: 'right',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 28,
  },
  metaBlock: { flex: 1 },
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
  table: { marginBottom: 4 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: DEFAULT_BRAND,
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
  tableRowAlt:    { backgroundColor: LIGHT },
  colDescription: { flex: 1 },
  colQty:         { width: 40, textAlign: 'center' },
  colUnitPrice:   { width: 70, textAlign: 'right' },
  colAmount:      { width: 70, textAlign: 'right' },
  tableBodyText:  { fontSize: 9, color: BLACK },
  tableBodyMuted: { fontSize: 9, color: GREY },
  totalsContainer: { alignItems: 'flex-end', marginTop: 16, marginBottom: 24 },
  totalsTable:  { width: 200 },
  totalsRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalsLabel:  { fontSize: 9, color: GREY },
  totalsValue:  { fontSize: 9, color: BLACK },
  totalsDivider:{ borderTopWidth: 1, borderTopColor: RULE, marginVertical: 4 },
  totalLabel:   { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BLACK },
  totalValue:   { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BLACK },
  notesBox: {
    backgroundColor: LIGHT,
    borderRadius: 4,
    padding: 12,
    marginBottom: 24,
  },
  notesLabel: {
    fontSize: 7, color: GREY, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5,
  },
  notesText: { fontSize: 9, color: BLACK, lineHeight: 1.6 },
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
  footerText: { fontSize: 7, color: GREY },
})

// -----------------------------------------------------------------------------
// PDF Document
// -----------------------------------------------------------------------------

export function InvoicePDF({ data }: { data: InvoicePDFData }) {
  const { org, client, lineItems } = data

  const brand = org.brandColor ?? DEFAULT_BRAND

  const orgContactLine = [org.address, org.email, org.phone].filter(Boolean).join('  ·  ')
  const vatLine = data.vatRegistered && org.vatNumber ? `VAT No. ${org.vatNumber}` : null

  const outstanding = Math.max(0, data.total - data.amountPaid)

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: brand }]}>
          <View>
            {org.logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image
                src={org.logoUrl}
                style={{ maxWidth: 140, maxHeight: 48, objectFit: 'contain', marginBottom: 6 }}
              />
            ) : (
              <Text style={[styles.orgName, { color: brand }]}>{org.name}</Text>
            )}
            {orgContactLine ? <Text style={styles.orgDetails}>{orgContactLine}</Text> : null}
            {vatLine ? <Text style={styles.orgDetails}>{vatLine}</Text> : null}
          </View>
          <View>
            <Text style={styles.docLabel}>Invoice</Text>
            <Text style={styles.docNumber}>{data.invoiceNumber}</Text>
          </View>
        </View>

        {/* Bill to / meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Bill to</Text>
            <Text style={styles.metaName}>{client.firstName} {client.lastName}</Text>
            {client.email ? <Text style={styles.metaText}>{client.email}</Text> : null}
            {client.phone ? <Text style={styles.metaText}>{client.phone}</Text> : null}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Details</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={styles.metaText}>Invoice date</Text>
              <Text style={styles.metaText}>{formatDate(data.issueDate)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={styles.metaText}>Due date</Text>
              <Text style={styles.metaText}>{formatDate(data.dueDate)}</Text>
            </View>
            {data.amountPaid > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={styles.metaText}>Amount paid</Text>
                <Text style={styles.metaText}>{formatCurrency(data.amountPaid)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Line items table */}
        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: brand }]}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colUnitPrice]}>Unit price</Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
          </View>
          {lineItems.map((item, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableBodyText, styles.colDescription]}>{item.description}</Text>
              <Text style={[styles.tableBodyText, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableBodyText, styles.colUnitPrice]}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={[styles.tableBodyText, styles.colAmount]}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsTable}>
            {data.taxRate > 0 && (
              <>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Subtotal</Text>
                  <Text style={styles.totalsValue}>{formatCurrency(data.subtotal)}</Text>
                </View>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>VAT ({data.taxRate}%)</Text>
                  <Text style={styles.totalsValue}>{formatCurrency(data.taxAmount)}</Text>
                </View>
              </>
            )}
            <View style={styles.totalsDivider} />
            <View style={styles.totalsRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.total)}</Text>
            </View>
            {data.amountPaid > 0 && outstanding > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Amount outstanding</Text>
                <Text style={styles.totalsValue}>{formatCurrency(outstanding)}</Text>
              </View>
            )}
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
          <Text style={styles.footerText}>{org.name}  ·  {data.invoiceNumber}</Text>
          <Text style={styles.footerText}>Powered by Lustre</Text>
        </View>

      </Page>
    </Document>
  )
}
