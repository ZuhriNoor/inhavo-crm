// PDF Template — redesigned quotation PDF using @react-pdf/renderer
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  firstRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  logoImage: {
    width: 150,
  },
  companyDetails: {
    textAlign: 'right',
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
  },
  brownLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#8B4513',
    marginBottom: 20,
  },
  secondRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  customerText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  dateText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e8d5c4',
    borderBottomWidth: 1,
    borderBottomColor: '#c4a484',
    padding: '8 0',
  },
  tableHeaderText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: '8 0',
    alignItems: 'center',
    minHeight: 110,
  },
  colNo: { width: '5%', textAlign: 'center' },
  colPhoto: { width: '28%', textAlign: 'left', paddingLeft: 10 },
  colItem: { width: '27%', paddingLeft: 5 },
  colQty: { width: '10%', textAlign: 'center' },
  colRate: { width: '15%', textAlign: 'right', paddingRight: 5 },
  colTotal: { width: '15%', textAlign: 'right', paddingRight: 10 },
  photoImage: {
    width: 100,
    height: 100,
    objectFit: 'contain',
  },
  cellText: {
    fontSize: 9,
    color: '#374151',
  },
  cellSubText: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingRight: 10,
  },
  totalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginRight: 15,
  },
  totalValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  termsContainer: {
    marginTop: 20,
  },
  termsTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  termsText: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 40,
  },
  footerBlock: {
    width: '45%',
  },
  footerTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    color: '#111827',
  },
  footerText: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: '#8B4513',
  },
});

const formatNumber = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

const today = () =>
  new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const QuotationPDF = ({ quotation }) => {
  const { customerDetails, items = [], notes, totalAmount } = quotation;

  return (
    <Document title={`Quotation - ${customerDetails?.name || 'Customer'}`}>
      <Page size="A4" style={styles.page}>
        {/* First row */}
        <View style={styles.firstRow}>
          <View>
            <Image style={styles.logoImage} src="/inhavo-logo-quotation-top.png" />
          </View>
          <View style={styles.companyDetails}>
            {quotation.storeAddress ? (
              <Text>{quotation.storeAddress}</Text>
            ) : (
              <>
                <Text>Mob: 96332 71361</Text>
                <Text>Address: 2 nd Floor, AAK mall TM</Text>
                <Text>A. Naduvilangadi, Tirur, Kerala 676107</Text>
                <Text>Email: info@inhavo.com</Text>
                <Text>website: www.inhavo.com</Text>
              </>
            )}
          </View>
        </View>
        
        {/* Horizontal line (brown color) */}
        <View style={styles.brownLine} />

        {/* Second row */}
        <View style={styles.secondRow}>
          <Text style={styles.customerText}>Customer Name: {customerDetails?.name || '—'}</Text>
          <Text style={styles.dateText}>Date: {today()}</Text>
        </View>

        {/* Third row - Products table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colNo]}>No</Text>
          <Text style={[styles.tableHeaderText, styles.colPhoto]}>Photo</Text>
          <Text style={[styles.tableHeaderText, styles.colItem]}>Product Details</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colRate]}>Rate</Text>
          <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
        </View>

        {items.map((item, idx) => {
          const rowTotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
          return (
            <View key={idx} style={styles.tableRow} wrap={false}>
              <Text style={[styles.cellText, styles.colNo]}>{idx + 1}</Text>
              <View style={styles.colPhoto}>
                {item.photo ? (
                  <Image src={item.photo} style={styles.photoImage} />
                ) : (
                  <Text style={{ fontSize: 8, color: '#aaa', textAlign: 'center' }}>No Image</Text>
                )}
              </View>
              <View style={styles.colItem}>
                <Text style={styles.cellText}>{item.name || '—'}</Text>
                {item.description && (
                  <Text style={styles.cellSubText}>{item.description}</Text>
                )}
              </View>
              <Text style={[styles.cellText, styles.colQty]}>{item.qty}</Text>
              <Text style={[styles.cellText, styles.colRate]}>{formatNumber(item.unitPrice)}</Text>
              <Text style={[styles.cellText, styles.colTotal, { fontFamily: 'Helvetica-Bold' }]}>
                {formatNumber(rowTotal)}
              </Text>
            </View>
          );
        })}

        <View style={styles.totalRow} wrap={false}>
          <Text style={styles.totalLabel}>Grand Total:</Text>
          <Text style={styles.totalValue}>Rs. {formatNumber(totalAmount)}</Text>
        </View>

        {/* Horizontal line (brown) before terms */}
        <View style={[styles.brownLine, { marginTop: 20 }]} wrap={false} />

        {/* Terms and conditions */}
        <View style={styles.termsContainer} wrap={false}>
          <Text style={styles.termsTitle}>Terms and conditions</Text>
          <Text style={styles.termsText}>{notes || 'No special terms.'}</Text>
        </View>

        {/* Footer section (Bank Details & Prepared By) */}
        <View style={styles.footerSection} wrap={false}>
          <View style={styles.footerBlock}>
            {quotation.storeBankDetails && (
              <>
                <Text style={styles.footerTitle}>Bank Account Details</Text>
                <Text style={styles.footerText}>{quotation.storeBankDetails}</Text>
              </>
            )}
          </View>
          <View style={[styles.footerBlock, { alignItems: 'flex-end' }]}>
            {quotation.preparedBy && (
              <>
                <Text style={styles.footerTitle}>Prepared By</Text>
                <Text style={styles.footerText}>{quotation.preparedBy.name}</Text>
                {quotation.preparedBy.location && <Text style={styles.footerText}>{quotation.preparedBy.location}</Text>}
                {quotation.preparedBy.phone && <Text style={styles.footerText}>{quotation.preparedBy.phone}</Text>}
              </>
            )}
          </View>
        </View>

        {/* Full-width brown rectangle at the bottom */}
        <View style={styles.bottomBar} fixed />
      </Page>
    </Document>
  );
};

export default QuotationPDF;
