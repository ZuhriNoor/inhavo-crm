import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { formatDate } from './helpers';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#334155',
    backgroundColor: '#ffffff'
  },
  // Top Header section
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  companyBox: {
    width: '50%',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  logo: {
    height: 38,
    marginBottom: 6,
    alignSelf: 'flex-start',
    marginLeft: 0,
    paddingLeft: 0,
    objectFit: 'contain'
  },
  companyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    marginBottom: 3
  },
  addressText: {
    fontSize: 8.5,
    color: '#475569',
    lineHeight: 1.3
  },

  vendorBox: {
    width: '45%',
    textAlign: 'right',
    flexDirection: 'column'
  },
  vendorLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    marginBottom: 3
  },
  vendorName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 2
  },

  // Document Title Banner
  titleBanner: {
    marginTop: 10,
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1'
  },
  mainTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#6F4E37', // Brown brand theme
    letterSpacing: 0.5,
    marginBottom: 8
  },
  metaRow: {
    flexDirection: 'row',
    gap: 30
  },
  metaItem: {
    flexDirection: 'column'
  },
  metaLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    marginBottom: 2
  },
  metaVal: {
    fontSize: 9.5,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold'
  },

  // Table styling
  table: {
    marginTop: 10,
    marginBottom: 15
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#6F4E37' // Brown header text
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 8,
    alignItems: 'flex-start'
  },

  // Column Widths
  colProduct: { width: '48%' },
  colGst: { width: '12%', textAlign: 'center' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colAmount: { width: '15%', textAlign: 'right' },

  itemTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a'
  },
  itemSpecs: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 1.3
  },

  // Financial Summary
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    marginBottom: 20
  },
  summaryBox: {
    width: '45%',
    flexDirection: 'column'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    fontSize: 9
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: '#0f172a',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    paddingVertical: 5,
    marginTop: 4,
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#6F4E37'
  },

  // Notes
  notesBox: {
    backgroundColor: '#fffbebfb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginTop: 10
  },
  notesTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#b45309',
    textTransform: 'uppercase',
    marginBottom: 3
  },
  notesBody: {
    fontSize: 8.5,
    color: '#78350f',
    lineHeight: 1.4
  },

  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8
  }
});

export function PurchaseOrderPDF({ po }) {
  const formattedDate = formatDate(po?.createdAt || new Date());

  const subtotal = Number(po?.subtotal) || 0;
  const gstTotal = Number(po?.gstTotal) || 0;
  const grandTotal = Number(po?.grandTotal) || 0;

  const showGst = Boolean(po?.includeGst || gstTotal > 0);

  const formatCurrency = (val) => {
    if (!val || val <= 0) return '-';
    return `Rs. ${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const colProdStyle = showGst ? styles.colProduct : { width: '60%' };
  const colQtyStyle = showGst ? styles.colQty : { width: '12%', textAlign: 'center' };
  const colPriceStyle = showGst ? styles.colPrice : { width: '14%', textAlign: 'right' };
  const colAmountStyle = showGst ? styles.colAmount : { width: '14%', textAlign: 'right' };

  return (
    <Document title={`Purchase Order - ${po?.poNumber || 'Draft'}`}>
      <Page size="A4" style={styles.page}>
        
        {/* Top Header: Company (Left) & Vendor (Right) */}
        <View style={styles.topHeaderRow}>
          <View style={styles.companyBox}>
            <Image src="/inhavo-logo-quotation-top.png" style={styles.logo} />
            <Text style={styles.companyName}>{po?.storeName || 'INHAVO LUXE DECOR'}</Text>
            <Text style={styles.addressText}>{po?.storeAddress || 'Main Branch / Showroom Address'}</Text>
            {po?.storeGstin && <Text style={styles.addressText}>GSTIN: {po.storeGstin}</Text>}
          </View>

          <View style={styles.vendorBox}>
            <Text style={styles.vendorLabel}>Vendor / Supplier Address:</Text>
            <Text style={styles.vendorName}>{po?.vendor?.name || 'N/A'}</Text>
            {po?.vendor?.contactPerson && <Text style={styles.addressText}>Attn: {po.vendor.contactPerson}</Text>}
            {po?.vendor?.address && <Text style={styles.addressText}>{po.vendor.address}</Text>}
            {po?.vendor?.phone && <Text style={styles.addressText}>Phone: {po.vendor.phone}</Text>}
            {po?.vendor?.gstin && <Text style={styles.addressText}>GSTIN: {po.vendor.gstin}</Text>}
          </View>
        </View>

        {/* Title Banner */}
        <View style={styles.titleBanner}>
          <Text style={styles.mainTitle}>Purchase Order #{po?.poNumber || 'N/A'}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Our Order Reference:</Text>
              <Text style={styles.metaVal}>{po?.poNumber || 'N/A'}</Text>
            </View>
            {po?.deliveryDate && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Target Delivery Date:</Text>
                <Text style={styles.metaVal}>{formatDate(po.deliveryDate)}</Text>
              </View>
            )}
            {po?.salesOrderNumber && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Sales Order Ref:</Text>
                <Text style={styles.metaVal}>{po.salesOrderNumber}</Text>
              </View>
            )}
            {(po?.customerRef || po?.customerName || po?.customerDetails?.name) && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Customer Name:</Text>
                <Text style={styles.metaVal}>{po.customerRef || po.customerName || po.customerDetails?.name}</Text>
              </View>
            )}
            {(po?.customerAddress || po?.customerDetails?.address) && (
              <View style={{ ...styles.metaItem, maxWidth: 150 }}>
                <Text style={styles.metaLabel}>Customer Address:</Text>
                <Text style={{ ...styles.metaVal, fontSize: 8.5, lineHeight: 1.2 }}>{po.customerAddress || po.customerDetails?.address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Product Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={colProdStyle}>Product</Text>
            {showGst && <Text style={styles.colGst}>GST %</Text>}
            <Text style={colQtyStyle}>Qty</Text>
            <Text style={colPriceStyle}>Unit Price</Text>
            <Text style={colAmountStyle}>Amount</Text>
          </View>

          {po?.items?.map((item, index) => {
            const qty = Number(item.qty) || 1;
            const price = Number(item.unitPrice) || 0;
            const amount = Number(item.amount) || (qty * price);
            const gstPercent = item.gstPercent || 0;

            return (
              <View key={index} style={styles.tableRow}>
                <View style={colProdStyle}>
                  <Text style={styles.itemTitle}>{item.name}</Text>
                  {item.description && <Text style={styles.itemSpecs}>{item.description}</Text>}
                </View>

                {showGst && (
                  <Text style={styles.colGst}>
                    {gstPercent > 0 ? `GST ${gstPercent}%` : '-'}
                  </Text>
                )}

                <Text style={colQtyStyle}>
                  {qty.toFixed(2)}
                </Text>

                <Text style={colPriceStyle}>
                  {formatCurrency(price)}
                </Text>

                <Text style={colAmountStyle}>
                  {formatCurrency(amount)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Financial Summary */}
        {subtotal > 0 && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>Subtotal</Text>
                <Text>{formatCurrency(subtotal)}</Text>
              </View>

              <View style={styles.totalRow}>
                <Text>Total</Text>
                <Text>{formatCurrency(grandTotal)}</Text>
              </View>

              {showGst && gstTotal > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={{ fontSize: 8.5, color: '#64748b' }}>GST Amount:</Text>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#0f172a' }}>
                    {formatCurrency(gstTotal)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Vendor Notes */}
        {po?.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Vendor Instructions & Notes</Text>
            <Text style={styles.notesBody}>{po.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={{ fontSize: 8, color: '#94a3b8' }}>
            Inhavo Purchase Order — Generated electronically
          </Text>
          <Text
            style={{ fontSize: 9, color: '#000000', fontFamily: 'Helvetica-Bold' }}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
