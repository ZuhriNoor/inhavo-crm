import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, CheckSquare, Shield, FileText, ExternalLink } from 'lucide-react';
import { getSaleOrder, updateSaleOrderStatus } from '../services/salesOrdersService';
import { getDocketsBySaleOrder } from '../services/docketsService';
import { getWarrantiesBySaleOrder } from '../services/warrantiesService';
import LoadingScreen from '../components/shared/LoadingScreen';
import DocketModal from '../components/dockets/DocketModal';
import WarrantyModal from '../components/warranties/WarrantyModal';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { DocketPDF } from '../utils/docketPdfTemplate';
import { WarrantyPDF } from '../utils/warrantyPdfTemplate';
import { getDocketTemplates } from '../services/docketsService';

export default function SalesOrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [dockets, setDockets] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items'); // items, dockets, warranties
  
  const [docketModalOpen, setDocketModalOpen] = useState(false);
  const [selectedItemForDocket, setSelectedItemForDocket] = useState(null);
  const [editingDocket, setEditingDocket] = useState(null);
  
  const [warrantyModalOpen, setWarrantyModalOpen] = useState(false);

  const [docketTemplates, setDocketTemplates] = useState([]);

  useEffect(() => {
    fetchData();
  }, [orderId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const orderData = await getSaleOrder(orderId);
      if (orderData) {
        setOrder(orderData);
        const [docketsData, warrantiesData, dTpls] = await Promise.all([
          getDocketsBySaleOrder(orderId),
          getWarrantiesBySaleOrder(orderId),
          getDocketTemplates()
        ]);
        setDockets(docketsData);
        setWarranties(warrantiesData);
        setDocketTemplates(dTpls);
      }
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      await updateSaleOrderStatus(orderId, newStatus);
      setOrder(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!order) return <div className="p-8 text-center text-gray-500 dark:text-slate-400">Sale Order not found</div>;

  return (
    <div className="h-full flex flex-col bg-gray-50/50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="px-6 py-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shrink-0 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/sales-orders')} className="p-2 -ml-2 rounded-lg text-gray-400 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shrink-0">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center shrink-0">
                <Package className="text-purple-500 dark:text-purple-400" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{order.salesOrderNumber}</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">Ref: {order.quotationNumber || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto">
            <select
                value={order.status || 'Confirmed'}
                onChange={handleStatusChange}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-slate-100 transition-colors"
              >
                <option value="Confirmed">Confirmed</option>
                <option value="Sent to Factory">Sent to Factory</option>
                <option value="Woodworking">Woodworking</option>
                <option value="Polishing">Polishing</option>
                <option value="Ready for Delivery">Ready for Delivery</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-100 dark:border-slate-700 -mb-4 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          <button
            onClick={() => setActiveTab('items')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'items' ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
          >
            Line Items & Info
          </button>
          <button
            onClick={() => setActiveTab('warranties')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'warranties' ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
          >
            Warranties <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-xs">{warranties.length}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'items' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Products Table */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80">
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100">Order Items</h3>
                </div>
                <div className="block md:hidden space-y-3 p-4">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        {item.photo && <img src={item.photo} alt={item.name} className="w-12 h-12 rounded object-cover border border-gray-200 dark:border-slate-600 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-slate-100 truncate">{item.name}</p>
                          {item.description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">{item.description}</p>}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm border-y border-gray-100 dark:border-slate-700/60 py-2">
                        <span className="text-gray-500 dark:text-slate-400">Qty: <span className="font-medium text-gray-900 dark:text-slate-100">{item.qty}</span></span>
                        <span className="text-gray-500 dark:text-slate-400">Rate: <span className="font-medium text-gray-900 dark:text-slate-100">₹{Number(item.unitPrice || 0).toLocaleString('en-IN')}</span></span>
                        <span className="font-semibold text-gray-900 dark:text-slate-100">₹{(Number(item.qty || 0) * Number(item.unitPrice || 0)).toLocaleString('en-IN')}</span>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-1">
                        {(() => {
                          const existingDocket = dockets.find(d => d.productDetails?.name === item.name);
                          if (existingDocket) {
                            return (
                              <>
                                {existingDocket.pdfUrl && (
                                  <a href={existingDocket.pdfUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium flex items-center gap-1.5">
                                    <FileText size={14} /> PDF
                                  </a>
                                )}
                                <button onClick={() => { setSelectedItemForDocket(item); setEditingDocket(existingDocket); setDocketModalOpen(true); }} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">Edit</button>
                              </>
                            );
                          }
                          return (
                            <button onClick={() => { setSelectedItemForDocket(item); setDocketModalOpen(true); }} className="w-full sm:w-auto px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium text-center">Create Docket</button>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/50 dark:bg-slate-700/60 text-gray-500 dark:text-slate-300">
                      <tr>
                        <th className="px-5 py-3 font-medium">Product</th>
                        <th className="px-5 py-3 font-medium text-center">Qty</th>
                        <th className="px-5 py-3 font-medium text-right">Rate</th>
                        <th className="px-5 py-3 font-medium text-right">Total</th>
                        <th className="px-5 py-3 font-medium text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                      {order.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              {item.photo && <img src={item.photo} alt={item.name} className="w-10 h-10 rounded object-cover border border-gray-200 dark:border-slate-600" />}
                              <div>
                                <p className="font-medium text-gray-900 dark:text-slate-100">{item.name}</p>
                                {item.description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{item.description}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center text-gray-600 dark:text-slate-300">{item.qty}</td>
                          <td className="px-5 py-3 text-right text-gray-600 dark:text-slate-300">₹{Number(item.unitPrice || 0).toLocaleString('en-IN')}</td>
                          <td className="px-5 py-3 text-right font-medium text-gray-900 dark:text-slate-100">₹{(Number(item.qty || 0) * Number(item.unitPrice || 0)).toLocaleString('en-IN')}</td>
                          <td className="px-5 py-3 text-center">
                            {(() => {
                              const existingDocket = dockets.find(d => d.productDetails?.name === item.name);
                              if (existingDocket) {
                                return (
                                  <div className="flex gap-2 justify-center">
                                    {existingDocket.pdfUrl && (
                                      <a href={existingDocket.pdfUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 rounded text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5">
                                        <FileText size={14} /> PDF
                                      </a>
                                    )}
                                    <button onClick={() => { setSelectedItemForDocket(item); setEditingDocket(existingDocket); setDocketModalOpen(true); }} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded text-xs font-medium transition-colors whitespace-nowrap">Edit</button>
                                  </div>
                                );
                              }
                              return (
                                <button onClick={() => { setSelectedItemForDocket(item); setDocketModalOpen(true); }} className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded text-xs font-medium transition-colors whitespace-nowrap">Create Docket</button>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar Details */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 transition-colors">
                <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-4">Customer Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Name</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{order.customerDetails?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Phone</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{order.customerDetails?.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Delivery Address</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{order.customerDetails?.address || order.customerDetails?.deliveryAddress}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl shadow-sm p-5 text-white transition-colors" style={{ background: '#875a7b' }}>
                <p className="text-purple-100 text-sm mb-1">Total Order Value</p>
                <p className="text-3xl font-bold">₹{(order.totalAmount || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        )}



        {activeTab === 'warranties' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Warranty Certificates</h2>
              <button
                onClick={() => setWarrantyModalOpen(true)}
                className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors hover:opacity-90"
                style={{ background: '#875a7b' }}
              >
                Generate Warranty
              </button>
            </div>

            {warranties.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 p-12 text-center transition-colors">
                <Shield className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600 mb-3" />
                <h3 className="text-gray-900 dark:text-slate-100 font-medium">No Warranties Generated</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Click the button above to issue a warranty certificate for this order.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {warranties.map(warranty => {
                  return (
                    <div key={warranty.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col transition-colors">
                      <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-purple-50/30 dark:bg-purple-900/10">
                        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-semibold">
                          <Shield size={18} /> {warranty.warrantyNumber}
                        </div>
                      </div>
                      <div className="p-4 flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-1">Warranty Certificate</h4>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Items Covered: <span className="font-medium text-gray-700 dark:text-slate-300">{warranty.items?.length || 'Multiple'}</span></p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700">
                        <PDFDownloadLink
                          document={<WarrantyPDF warranty={warranty} />}
                          fileName={`${warranty.warrantyNumber}.pdf`}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors hover:opacity-90"
                          style={{ background: '#875a7b' }}
                        >
                          {({ loading }) => loading ? 'Loading...' : <><FileText size={16} /> Download Certificate</>}
                        </PDFDownloadLink>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {docketModalOpen && (
        <DocketModal 
          isOpen={docketModalOpen}
          onClose={() => { setDocketModalOpen(false); setEditingDocket(null); }}
          saleOrder={order}
          item={selectedItemForDocket}
          existingDocket={editingDocket}
          onDocketCreated={fetchData}
        />
      )}

      {warrantyModalOpen && (
        <WarrantyModal
          isOpen={warrantyModalOpen}
          onClose={() => setWarrantyModalOpen(false)}
          saleOrder={order}
          onWarrantyCreated={fetchData}
        />
      )}
    </div>
  );
}
