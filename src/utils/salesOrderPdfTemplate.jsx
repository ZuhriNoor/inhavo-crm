// Sale Order PDF — follows the same visual design as the Quotation PDF
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
    marginBottom: 6,
  },
  customerText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  dateText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  thirdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metaText: {
    fontSize: 9,
    color: '#4b5563',
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableHeaderText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    alignItems: 'stretch',
    minHeight: 110,
  },
  cellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#d1d5db',
  },
  colNo: { width: '5%', textAlign: 'center', justifyContent: 'center', paddingTop: 8, paddingBottom: 8 },
  colPhoto: { width: '28%', textAlign: 'left', justifyContent: 'center', paddingLeft: 10, paddingTop: 8, paddingBottom: 8 },
  colItem: { width: '27%', justifyContent: 'center', paddingLeft: 5, paddingTop: 8, paddingBottom: 8 },
  colQty: { width: '10%', textAlign: 'center', justifyContent: 'center', paddingTop: 8, paddingBottom: 8 },
  colRate: { width: '15%', textAlign: 'right', justifyContent: 'center', paddingRight: 5, paddingTop: 8, paddingBottom: 8 },
  colTotal: { width: '15%', textAlign: 'right', justifyContent: 'center', paddingRight: 10, paddingTop: 8, paddingBottom: 8 },
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
  summaryTable: {
    marginTop: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  summaryRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryHighlightRow: {
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 0,
  },
  summaryLabelCell: {
    padding: '6 10',
  },
  summaryAmountCell: {
    padding: '6 10',
    textAlign: 'right',
    borderLeftWidth: 1,
    borderLeftColor: '#d1d5db',
  },
  summaryLabel: {
    fontSize: 9,
    color: '#4b5563',
  },
  summaryValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
  },
  summaryGrandText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  sectionContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  sectionText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.4,
  },
  paymentTable: {
    marginTop: 6,
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  paymentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  paymentCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#d1d5db',
  },
  paymentCell: {
    justifyContent: 'center',
    padding: '5 8',
  },
  paymentColDate: { width: '35%', fontSize: 9 },
  paymentColMethod: { width: '35%', fontSize: 9 },
  paymentColAmount: { width: '30%', fontSize: 9, textAlign: 'right' },
  paymentHeaderText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
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
    fontSize: 10,
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

const formatDateStr = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const today = () => formatDateStr(new Date());

export const SalesOrderPDF = ({ order, storeAddress, storeBankDetails, paymentTerms, preparedBy }) => {
  const { customerDetails, items = [], deliveryDate, salesOrderNumber } = order;

  const productsTotal =
    order.productsTotal ??
    items.reduce((acc, item) => acc + (Number(item.qty) || 0) * (Number(item.unitPrice) || 0), 0);

  const extraCosts = order.extraCosts || [];
  const extraCostsTotal =
    order.extraCostsTotal ??
    extraCosts.reduce((acc, ec) => acc + (Number(ec.amount) || 0), 0);

  const grandTotal = order.grandTotal ?? order.totalAmount ?? (productsTotal + extraCostsTotal);

  const payments = order.payments || [];
  const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const remaining = Math.max(grandTotal - totalPaid, 0);

  const address = storeAddress ?? order.storeAddress;
  const bankDetails = storeBankDetails ?? order.storeBankDetails;
  const terms = paymentTerms ?? order.paymentTerms;

  return (
    <Document title={`Sales Order - ${customerDetails?.name || 'Customer'}`}>
      <Page size="A4" style={styles.page}>
        {/* First row */}
        <View style={styles.firstRow}>
          <View>
            <Image style={styles.logoImage} src="/inhavo-logo-quotation-top.png" />
          </View>
          <View style={styles.companyDetails}>
            {address ? (
              <Text>{address}</Text>
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

        {/* Third row - Sale Order meta */}
        <View style={styles.thirdRow}>
          <Text style={styles.metaText}>Sale Order No: {salesOrderNumber || '—'}</Text>
          <Text style={styles.metaText}>Delivery Date: {deliveryDate ? formatDateStr(deliveryDate) : '—'}</Text>
        </View>

        {/* Products table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <View style={styles.colNo}>
              <Text style={styles.tableHeaderText}>No</Text>
            </View>
            <View style={[styles.colPhoto, styles.cellBorder]}>
              <Text style={styles.tableHeaderText}>Photo</Text>
            </View>
            <View style={[styles.colItem, styles.cellBorder]}>
              <Text style={styles.tableHeaderText}>Product Details</Text>
            </View>
            <View style={[styles.colQty, styles.cellBorder]}>
              <Text style={styles.tableHeaderText}>Qty</Text>
            </View>
            <View style={[styles.colRate, styles.cellBorder]}>
              <Text style={styles.tableHeaderText}>Rate</Text>
            </View>
            <View style={[styles.colTotal, styles.cellBorder]}>
              <Text style={styles.tableHeaderText}>Total</Text>
            </View>
          </View>

          {items.map((item, idx) => {
            const rowTotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
            return (
              <View key={idx} style={styles.tableRow} wrap={false}>
                <View style={styles.colNo}>
                  <Text style={styles.cellText}>{idx + 1}</Text>
                </View>
                <View style={[styles.colPhoto, styles.cellBorder]}>
                  {item.photo ? (
                    <Image src={item.photo} style={styles.photoImage} />
                  ) : (
                    <Text style={{ fontSize: 8, color: '#aaa', textAlign: 'center' }}>No Image</Text>
                  )}
                </View>
                <View style={[styles.colItem, styles.cellBorder]}>
                  <Text style={styles.cellText}>{item.name || '—'}</Text>
                  {item.description && (
                    <Text style={styles.cellSubText}>{item.description}</Text>
                  )}
                </View>
                <View style={[styles.colQty, styles.cellBorder]}>
                  <Text style={styles.cellText}>{item.qty}</Text>
                </View>
                <View style={[styles.colRate, styles.cellBorder]}>
                  <Text style={styles.cellText}>{formatNumber(item.unitPrice)}</Text>
                </View>
                <View style={[styles.colTotal, styles.cellBorder]}>
                  <Text style={[styles.cellText, { fontFamily: 'Helvetica-Bold' }]}>
                    {formatNumber(rowTotal)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Totals Breakdown — value column matches the Products table's Rate+Total columns (30%) */}
        <View style={styles.summaryTable} wrap={false}>
          {extraCosts.length > 0 && (
            <>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.summaryLabelCell, { width: '70%' }]}>Products Subtotal</Text>
                <Text style={[styles.summaryValue, styles.summaryAmountCell, { width: '30%' }]}>Rs. {formatNumber(productsTotal)}</Text>
              </View>
              {extraCosts.map((ec, idx) => (
                <View key={idx} style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, styles.summaryLabelCell, { width: '70%' }]}>{ec.label || ec.name || 'Extra Cost'}</Text>
                  <Text style={[styles.summaryValue, styles.summaryAmountCell, { width: '30%' }]}>Rs. {formatNumber(ec.amount)}</Text>
                </View>
              ))}
            </>
          )}
          <View style={[styles.summaryRow, styles.summaryHighlightRow]}>
            <Text style={[styles.summaryGrandText, styles.summaryLabelCell, { width: '70%' }]}>Grand Total</Text>
            <Text style={[styles.summaryGrandText, styles.summaryAmountCell, { width: '30%' }]}>Rs. {formatNumber(grandTotal)}</Text>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.sectionContainer} wrap={false}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          {payments.length === 0 ? (
            <Text style={styles.sectionText}>No payments recorded yet.</Text>
          ) : (
            <View style={styles.paymentTable}>
              <View style={styles.paymentHeaderRow}>
                <View style={[styles.paymentColDate, styles.paymentCell]}>
                  <Text style={styles.paymentHeaderText}>Date</Text>
                </View>
                <View style={[styles.paymentColMethod, styles.paymentCell, styles.paymentCellBorder]}>
                  <Text style={styles.paymentHeaderText}>Method / Note</Text>
                </View>
                <View style={[styles.paymentColAmount, styles.paymentCell, styles.paymentCellBorder]}>
                  <Text style={styles.paymentHeaderText}>Amount</Text>
                </View>
              </View>
              {payments
                .slice()
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map((p, idx) => (
                  <View key={p.id || idx} style={styles.paymentRow}>
                    <View style={[styles.paymentColDate, styles.paymentCell]}>
                      <Text style={styles.cellText}>{formatDateStr(p.date)}</Text>
                    </View>
                    <View style={[styles.paymentColMethod, styles.paymentCell, styles.paymentCellBorder]}>
                      <Text style={styles.cellText}>{p.method || p.note || '—'}</Text>
                    </View>
                    <View style={[styles.paymentColAmount, styles.paymentCell, styles.paymentCellBorder]}>
                      <Text style={styles.cellText}>Rs. {formatNumber(p.amount)}</Text>
                    </View>
                  </View>
                ))}
            </View>
          )}
          {/* Value column matches the Payment Details table's Amount column (30%) */}
          <View style={styles.summaryTable} wrap={false}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.summaryLabelCell, { width: '70%' }]}>Total Paid</Text>
              <Text style={[styles.summaryValue, styles.summaryAmountCell, { width: '30%' }]}>Rs. {formatNumber(totalPaid)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryHighlightRow]}>
              <Text style={[styles.summaryGrandText, styles.summaryLabelCell, { width: '70%' }]}>Balance Due</Text>
              <Text style={[styles.summaryGrandText, styles.summaryAmountCell, { width: '30%' }]}>Rs. {formatNumber(remaining)}</Text>
            </View>
          </View>
        </View>

        {/* Horizontal line (brown) before terms */}
        <View style={[styles.brownLine, { marginTop: 20 }]} wrap={false} />

        {/* Payment Terms */}
        {terms && (
          <View style={styles.sectionContainer} wrap={false}>
            <Text style={styles.sectionTitle}>Payment Terms</Text>
            <Text style={styles.sectionText}>{terms}</Text>
          </View>
        )}

        {/* Footer section (Bank Details & Prepared By) */}
        <View style={styles.footerSection} wrap={false}>
          <View style={styles.footerBlock}>
            {bankDetails && (
              <>
                <Text style={styles.footerTitle}>Bank Account Details</Text>
                <Text style={styles.footerText}>{bankDetails}</Text>
              </>
            )}
          </View>
          <View style={[styles.footerBlock, { alignItems: 'flex-end' }]}>
            {preparedBy && (
              <>
                <Text style={styles.footerTitle}>Prepared By</Text>
                <Text style={styles.footerText}>{preparedBy.name}</Text>
                {preparedBy.location && <Text style={styles.footerText}>{preparedBy.location}</Text>}
                {preparedBy.phone && <Text style={styles.footerText}>{preparedBy.phone}</Text>}
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

export default SalesOrderPDF;
