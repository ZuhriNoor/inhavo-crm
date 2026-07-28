import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { formatDate } from './helpers';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', backgroundColor: '#ffffff', color: '#1f2937' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: '2 solid #875a7b', paddingBottom: 20, marginBottom: 20 },
  logo: { width: 140, objectFit: 'contain' },
  storeAddress: { fontSize: 9, color: '#64748b', textAlign: 'right', width: 200, lineHeight: 1.3 },
  titleBox: { alignItems: 'flex-start' },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#8B4513', marginTop: 15 },
  
  // Header Info
  infoBlock: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  infoLeft: { width: '50%' },
  infoRight: { width: '45%', alignItems: 'flex-end' },
  infoLabel: { fontSize: 9, color: '#6b7280', marginBottom: 2 },
  infoValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  
  // Intro Text
  introText: { fontSize: 10, lineHeight: 1.5, marginBottom: 20, textAlign: 'justify' },
  
  // Table
  table: { width: '100%', marginBottom: 25, border: '1 solid #e5e7eb' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f9fafb', borderBottom: '1 solid #e5e7eb', padding: 8 },
  tableHeaderCell: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#4b5563' },
  tableRow: { flexDirection: 'row', borderBottom: '1 solid #f3f4f6', padding: 8 },
  tableRowLast: { flexDirection: 'row', padding: 8 },
  colItem: { width: '40%' },
  colDesc: { width: '60%' },
  cellText: { fontSize: 9, lineHeight: 1.4 },
  cellTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  
  // Terms
  termsTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#8B4513', marginBottom: 10 },
  termsTextContainer: { paddingLeft: 0 },
  termText: { fontSize: 9, lineHeight: 1.4, color: '#374151', textAlign: 'justify' }
});

export const WarrantyPDF = ({ warranty }) => {
  return (
    <Document title={`Warranty Certificate - ${warranty.warrantyNumber}`}>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleBox}>
            <Image src="/inhavo-logo-quotation-top.png" style={styles.logo} />
            <Text style={styles.title}>CERTIFICATE OF WARRANTY</Text>
          </View>
          <View style={{ alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            {warranty.storeAddress && (
              <Text style={styles.storeAddress}>{warranty.storeAddress}</Text>
            )}
          </View>
        </View>

        {/* Customer & Order Details */}
        <View style={styles.infoBlock}>
          <View style={styles.infoLeft}>
            <Text style={styles.infoLabel}>Customer Name:</Text>
            <Text style={styles.infoValue}>{warranty.customerDetails?.name}</Text>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>{warranty.customerDetails?.address || warranty.customerDetails?.deliveryAddress || 'N/A'}</Text>
          </View>
          <View style={styles.infoRight}>
            <Text style={styles.infoLabel}>Order Reference No:</Text>
            <Text style={styles.infoValue}>{warranty.salesOrderNumber}</Text>
            <Text style={styles.infoLabel}>Date of Issue/Delivery:</Text>
            <Text style={styles.infoValue}>{formatDate(new Date())}</Text>
          </View>
        </View>

        {/* Intro Text */}
        <Text style={styles.introText}>
          Dear Valued Customer,
          {'\n\n'}
          Thank you for choosing Inhavo as your preferred furniture brand. We assure the warranty for the following products as per our terms given below.
        </Text>

        {/* Products Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colItem}>
              <Text style={styles.tableHeaderCell}>Item Name</Text>
            </View>
            <View style={styles.colDesc}>
              <Text style={styles.tableHeaderCell}>Warranty Description</Text>
            </View>
          </View>
          
          {warranty.items?.map((item, idx) => (
            <View key={idx} style={idx === warranty.items.length - 1 ? styles.tableRowLast : styles.tableRow}>
              <View style={styles.colItem}>
                <Text style={styles.cellTitle}>{item.name}</Text>
                {item.description && <Text style={{ ...styles.cellText, color: '#6b7280' }}>{item.description}</Text>}
              </View>
              <View style={styles.colDesc}>
                <Text style={styles.cellText}>{item.warrantyDescription || 'Not specified'}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Terms Section */}
        {warranty.termsText && (
          <View>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <View style={styles.termsTextContainer}>
              <Text style={styles.termText}>{warranty.termsText}</Text>
            </View>
          </View>
        )}

      </Page>
    </Document>
  );
};
