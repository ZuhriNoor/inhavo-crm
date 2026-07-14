// KanbanCard — individual lead card on the board
import { useNavigate } from 'react-router-dom';
import { Calendar, Phone, User } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDate, getInitials, stringToColor } from '../../utils/helpers';

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
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const assignedUser = users?.find((u) => u.uid === lead.assignedUserId);
  const assignedName = assignedUser?.displayName || lead.assignedUserId || 'Unassigned';
  const avatarColor = stringToColor(assignedName);

  const handleClick = (e) => {
    // Don't navigate if we're dragging
    if (isDragging) return;
    navigate(`/leads/${lead.id}`);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className="kanban-card bg-white rounded-lg border border-gray-200 p-3.5 mb-2 select-none"
    >
      {/* Customer Name */}
      <p className="font-semibold text-gray-800 text-sm leading-tight mb-1 truncate">
        {lead.customerName || 'Unnamed Lead'}
      </p>

      {/* Company */}
      {lead.company && (
        <p className="text-xs text-gray-500 mb-2 truncate">{lead.company}</p>
      )}

      {/* Phone */}
      {lead.phone && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
          <Phone size={11} className="shrink-0" />
          <span>{lead.phone}</span>
        </div>
      )}

      {/* Follow-up date */}
      {lead.nextFollowUp && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
          <Calendar size={11} className="shrink-0" />
          <span>
            {formatDate(
              lead.nextFollowUp?.toDate
                ? lead.nextFollowUp.toDate()
                : new Date(lead.nextFollowUp),
            )}
          </span>
        </div>
      )}

      {/* Assigned user chip */}
      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
          style={{ background: avatarColor }}
        >
          {getInitials(assignedName)}
        </div>
        <span className="text-xs text-gray-500 truncate">{assignedName}</span>
      </div>
    </div>
  );
};

export default KanbanCard;
