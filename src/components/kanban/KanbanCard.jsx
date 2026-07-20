// KanbanCard — individual lead card on the board
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, User, Star, MapPin, IndianRupee } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getInitials, stringToColor } from '../../utils/helpers';
import { updateLead } from '../../services/leadsService';

const KanbanCard = ({ lead, users }) => {
  const navigate = useNavigate();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'move' : 'pointer',
  };

  const assignedUser = users?.find((u) => u.uid === lead.assignedUserId);
  const assignedName = assignedUser?.displayName || lead.assignedUserId || 'Unassigned';
  const avatarColor = stringToColor(assignedName);

  const handleClick = (e) => {
    // Don't navigate if we're dragging
    if (isDragging) return;
    navigate(`/leads/${lead.id}`);
  };

  const [localPriority, setLocalPriority] = useState(lead.priority || 0);

  // Sync with prop if it changes from outside
  useEffect(() => {
    setLocalPriority(lead.priority || 0);
  }, [lead.priority]);

  const handlePriorityClick = async (e, val) => {
    e.stopPropagation();
    if (isDragging) return;
    
    const newPriority = val === localPriority ? 0 : val;
    setLocalPriority(newPriority); // Optimistic UI update
    
    try {
      await updateLead(lead.id, { priority: newPriority });
    } catch (err) {
      console.error('Failed to update priority:', err);
      setLocalPriority(lead.priority || 0); // Revert on failure
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className="kanban-card bg-white rounded-lg border border-gray-200 p-3.5 mb-2 select-none hover:border-purple-300 transition-colors"
    >
      {/* Top Row: Opportunity Title & Priority */}
      <div className="flex items-start justify-between mb-1.5 gap-2">
        <p className="font-bold text-gray-900 text-sm leading-tight truncate flex-1">
          {lead.opportunityTitle || 'Unnamed Opportunity'}
        </p>
        <div className="flex items-center shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          {[1, 2, 3].map((star) => (
            <button
              key={star}
              type="button"
              onClick={(e) => handlePriorityClick(e, star)}
              className={`transition-colors p-0.5 ${
                star <= localPriority ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-200 hover:text-yellow-200'
              }`}
            >
              <Star size={13} fill={star <= localPriority ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
      </div>

      {/* Customer Name */}
      <p className="text-xs text-gray-700 font-medium mb-2 truncate">
        {lead.customerName || 'No Customer'}
      </p>

      <div className="space-y-1 mb-2">
        {/* Place */}
        {lead.address && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 truncate">
            <MapPin size={11} className="shrink-0 text-gray-400" />
            <span className="truncate">{lead.address}</span>
          </div>
        )}

        {/* Phone */}
        {lead.phone && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 truncate">
            <Phone size={11} className="shrink-0 text-gray-400" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}
      </div>

      {/* Footer: Revenue & Avatar */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs font-semibold text-gray-800">
          {lead.expectedRevenue ? `₹${lead.expectedRevenue.toLocaleString('en-IN')}` : ''}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400 truncate max-w-[60px]">{assignedName}</span>
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 shadow-sm"
            style={{ background: avatarColor }}
          >
            {getInitials(assignedName)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KanbanCard;
