// KanbanColumn — a single stage column on the Kanban board
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import KanbanCard from './KanbanCard';

const KanbanColumn = ({ stage, leads, users, onAddLead }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const leadIds = leads.map((l) => l.id);

  return (
    <div className="flex flex-col shrink-0" style={{ width: 280 }}>
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 mb-2">
        <div className="flex items-center gap-2">
          {/* Stage color dot */}
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: stage.color || '#875a7b' }}
          />
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
            {stage.name}
          </h3>
          <span className="text-xs text-gray-400 font-normal ml-0.5">
            ({leads.length})
          </span>
        </div>
        <button
          onClick={() => onAddLead(stage.id)}
          className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title={`Add lead to ${stage.name}`}
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Droppable column body */}
      <div
        ref={setNodeRef}
        className={`kanban-column px-1 rounded-lg transition-colors ${
          isOver ? 'bg-purple-50/60' : 'bg-gray-100/50'
        }`}
        style={{ minHeight: 120 }}
      >
        <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} users={users} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-8 text-gray-400 text-xs"
            style={{ minHeight: 80 }}
          >
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center mb-2">
              <Plus size={14} />
            </div>
            Drop here or add a lead
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
