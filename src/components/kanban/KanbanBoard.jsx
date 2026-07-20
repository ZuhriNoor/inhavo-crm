// KanbanBoard — the full Kanban view with DnD context
import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { moveLeadToStage } from '../../services/leadsService';

const KanbanBoard = ({ stages, leads, users, onAddLead, onLeadsChange }) => {
  // Local leads state for optimistic UI
  const [localLeads, setLocalLeads] = useState(leads);
  const [activeCard, setActiveCard] = useState(null);

  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const getLeadsForStage = useCallback(
    (stageId) => {
      let stageLeads = localLeads.filter((l) => l.stageId === stageId);
      const stage = stages.find((s) => s.id === stageId);
      if (stage && stage.name.match(/won|lost/i)) {
        // Sort descending by creation/update time and take top 10
        stageLeads.sort((a, b) => {
          const tA = a.updatedAt?.toDate?.() || a.createdAt?.toDate?.() || 0;
          const tB = b.updatedAt?.toDate?.() || b.createdAt?.toDate?.() || 0;
          return tB - tA;
        });
        stageLeads = stageLeads.slice(0, 10);
      }
      return stageLeads;
    },
    [localLeads, stages],
  );

  const findLeadById = (id) => localLeads.find((l) => l.id === id);
  const findStageByLeadId = (id) => localLeads.find((l) => l.id === id)?.stageId;

  const handleDragStart = ({ active }) => {
    setActiveCard(findLeadById(active.id));
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find source and target stages
    const sourceStageId = findStageByLeadId(activeId);
    const targetStageId = stages.find((s) => s.id === overId)?.id
      || findStageByLeadId(overId);

    if (!sourceStageId || !targetStageId || sourceStageId === targetStageId) return;

    // Move lead to new stage optimistically
    setLocalLeads((prev) =>
      prev.map((l) => (l.id === activeId ? { ...l, stageId: targetStageId } : l)),
    );
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveCard(null);
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const originalLead = leads.find((l) => l.id === activeId);
    if (!originalLead) return;

    const newStageId =
      stages.find((s) => s.id === overId)?.id ||
      localLeads.find((l) => l.id === overId)?.stageId;

    if (newStageId && newStageId !== originalLead.stageId) {
      try {
        await moveLeadToStage(activeId, newStageId);
        onLeadsChange?.(false); // Silent reload
      } catch (err) {
        console.error('Failed to move lead:', err);
        // Revert on failure
        setLocalLeads(leads);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveCard(null);
    setLocalLeads(leads);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-5 px-6 py-4 overflow-x-auto h-full items-start">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={getLeadsForStage(stage.id)}
            users={users}
            onAddLead={onAddLead}
          />
        ))}
      </div>

      {/* Drag overlay — renders a floating card while dragging */}
      <DragOverlay>
        {activeCard ? (
          <div className="drag-overlay">
            <KanbanCard lead={activeCard} users={users} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
