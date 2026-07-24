import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: '2 solid #875a7b', paddingBottom: 15, marginBottom: 20 },
  docketTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#875a7b', marginBottom: 4 },
  section: { marginVertical: 10, padding: 12, backgroundColor: '#f8fafc', borderRadius: 4, border: '1 solid #e2e8f0' },
  fieldLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 },
  fieldValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  descriptionBox: { fontSize: 10, color: '#334155', lineHeight: 1.4, marginTop: 4 },
  generalPhoto: { width: '100%', height: 250, objectFit: 'contain', marginVertical: 10, border: '1 solid #cbd5e1', backgroundColor: '#ffffff' },
  
  // Grid layout styles
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  gridCell: { width: '50%', height: 350, padding: 10 },
  gridCellInner: { border: '1 solid #e2e8f0', borderRadius: 6, padding: 10, height: '100%', backgroundColor: '#f8fafc', overflow: 'hidden' },
  cellTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#875a7b', marginBottom: 4 },
  cellDesc: { fontSize: 9, color: '#475569', marginBottom: 8, lineHeight: 1.3 },
  cellPhoto: { flex: 1, width: '100%', objectFit: 'contain', border: '1 solid #e2e8f0', backgroundColor: '#ffffff' }
});

export const DocketPDF = ({ docket, template }) => {
  // Split dynamic fields into chunks of 4 (for 2x2 grid on pages)
  const fields = docket.dynamicFields || [];
  const fieldChunks = [];
  for (let i = 0; i < fields.length; i += 4) {
    fieldChunks.push(fields.slice(i, i + 4));
  }

  return (
    <Document title={`Docket - ${docket.docketNumber}`}>
      {/* Page 1: General Info */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.docketTitle}>PRODUCTION DOCKET</Text>
            <Text style={{ fontSize: 10, color: '#475569' }}>
              Docket No: {docket.docketNumber} | SO: {docket.salesOrderNumber} | Category: {template?.name || docket.templateName}
            </Text>
          </View>
        </View>

        {/* Product & Customer Info */}
        <View style={[styles.section, { flexDirection: 'row' }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Product Details</Text>
            <Text style={styles.fieldValue}>{docket.productDetails?.name}</Text>
            <Text style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>Qty: {docket.productDetails?.qty}</Text>
          </View>
          <View style={{ flex: 1, borderLeft: '1 solid #cbd5e1', paddingLeft: 15 }}>
             <Text style={styles.fieldLabel}>Customer Info</Text>
             <Text style={styles.fieldValue}>{docket.customerDetails?.name || 'N/A'}</Text>
             <Text style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{docket.customerDetails?.phone || 'N/A'}</Text>
             <Text style={{ fontSize: 9, color: '#475569' }}>{docket.customerDetails?.address || 'N/A'}</Text>
          </View>
        </View>

        {/* General Description */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Description & Specifications</Text>
          <Text style={styles.descriptionBox}>{docket.generalDescription || 'No description provided.'}</Text>
        </View>

        {/* General Image */}
        {docket.generalImageUrl && (
          <View style={{ marginTop: 15 }}>
            <Text style={styles.fieldLabel}>General Reference Image</Text>
            <Image src={docket.generalImageUrl} style={styles.generalPhoto} />
          </View>
        )}
      </Page>

      {/* Pages 2+: Dynamic Fields Grid */}
      {fieldChunks.map((chunk, chunkIdx) => (
        <Page key={`chunk-${chunkIdx}`} size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.docketTitle}>SPECIFICATIONS - PAGE {chunkIdx + 1}</Text>
            <Text style={{ fontSize: 10, color: '#475569' }}>Docket No: {docket.docketNumber}</Text>
          </View>
          
          <View style={styles.gridContainer}>
            {chunk.map((field, fieldIdx) => (
              <View key={`field-${fieldIdx}`} style={styles.gridCell}>
                <View style={styles.gridCellInner}>
                  <Text style={styles.cellTitle}>{field.label}</Text>
                  {field.description && <Text style={styles.cellDesc}>{field.description}</Text>}
                  {field.imageUrl && <Image src={field.imageUrl} style={styles.cellPhoto} />}
                </View>
              </View>
            ))}
          </View>
        </Page>
      ))}

      {/* Pages for Extra Images */}
      {docket.extraImageUrls && docket.extraImageUrls.length > 0 && docket.extraImageUrls.map((imgUrl, idx) => (
        <Page key={`extra-img-${idx}`} size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.docketTitle}>ATTACHMENT - PAGE {idx + 1}</Text>
            <Text style={{ fontSize: 10, color: '#475569' }}>Docket No: {docket.docketNumber}</Text>
          </View>
          <Image src={imgUrl} style={{ width: '100%', height: '80%', objectFit: 'contain' }} />
        </Page>
      ))}
    </Document>
  );
};
