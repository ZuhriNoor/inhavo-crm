// PDF Template — basic quotation PDF using @react-pdf/renderer
// This is a placeholder template to be redesigned later
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Register a built-in font
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#875a7b',
  },
  logo: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#875a7b',
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.5,
  },
  quotationTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  quotationMeta: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#875a7b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  customerBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    padding: 12,
  },
  customerName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    marginBottom: 3,
  },
  customerDetail: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
    lineHeight: 1.4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#875a7b',
    borderRadius: 4,
    padding: '8 10',
    marginBottom: 2,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    padding: '7 10',
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'center' },
  col3: { flex: 1, textAlign: 'right' },
  col4: { flex: 1, textAlign: 'right' },
  cellText: {
    fontSize: 9,
    color: '#374151',
  },
  cellSubText: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#875a7b',
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    marginRight: 16,
  },
  totalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#875a7b',
    minWidth: 80,
    textAlign: 'right',
  },
  notesBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#875a7b',
  },
  notesText: {
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.6,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
});

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount || 0);

const today = () =>
  new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const QuotationPDF = ({ quotation }) => {
  const { id, customerDetails, items = [], notes, totalAmount } = quotation;

  return (
    <Document
      title={`Quotation - ${customerDetails?.name || 'Customer'}`}
      author="Inhavo CRM"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>Inhavo CRM</Text>
            <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>
              Your Sales Partner
            </Text>
          </View>
          <View style={styles.companyInfo}>
            <Text>admin@inhavo.com</Text>
            <Text>www.inhavo.com</Text>
          </View>
        </View>

        {/* Quotation title */}
        <Text style={styles.quotationTitle}>QUOTATION</Text>
        <Text style={styles.quotationMeta}>
          Reference: #{(id || 'DRAFT').slice(-8).toUpperCase()} · Date: {today()}
        </Text>

        {/* Customer Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <View style={styles.customerBox}>
            <Text style={styles.customerName}>{customerDetails?.name || '—'}</Text>
            {customerDetails?.email && (
              <Text style={styles.customerDetail}>✉  {customerDetails.email}</Text>
            )}
            {customerDetails?.phone && (
              <Text style={styles.customerDetail}>📞  {customerDetails.phone}</Text>
            )}
            {customerDetails?.address && (
              <Text style={styles.customerDetail}>📍  {customerDetails.address}</Text>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Products / Services</Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.col1]}>Item</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.col3]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.col4]}>Total</Text>
          </View>

          {/* Rows */}
          {items.map((item, idx) => {
            const rowTotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
            return (
              <View
                key={idx}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <View style={styles.col1}>
                  <Text style={styles.cellText}>{item.name || '—'}</Text>
                  {item.description && (
                    <Text style={styles.cellSubText}>{item.description}</Text>
                  )}
                </View>
                <Text style={[styles.cellText, styles.col2]}>{item.qty}</Text>
                <Text style={[styles.cellText, styles.col3]}>
                  {formatINR(item.unitPrice)}
                </Text>
                <Text style={[styles.cellText, styles.col4, { fontFamily: 'Helvetica-Bold' }]}>
                  {formatINR(rowTotal)}
                </Text>
              </View>
            );
          })}

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>{formatINR(totalAmount)}</Text>
          </View>
        </View>

        {/* Notes */}
        {notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes & Terms</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{notes}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generated by Inhavo CRM</Text>
          <Text style={styles.footerText}>
            This is a computer-generated document. No signature required.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default QuotationPDF;
