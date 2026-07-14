// PipelinePage — Admin: manage pipeline stages with drag-and-drop reorder
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, X, GripVertical, RefreshCw } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getStages,
  createStage,
  updateStage,
  deleteStage,
  reorderStages,
  DEFAULT_STAGES,
} from '../../services/stagesService';

const STAGE_COLORS = [
  '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444',
  '#875a7b', '#00a09d', '#ec4899', '#6366f1', '#14b8a6',
];

const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400';

const StageModal = ({ stage: editStage, existingCount, onClose, onSaved }) => {
  const isEditing = !!editStage;
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name: editStage?.name || '',
      color: editStage?.color || STAGE_COLORS[existingCount % STAGE_COLORS.length],
    },
  });
  const selectedColor = watch('color');

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        await updateStage(editStage.id, { name: data.name, color: data.color });
      } else {
        await createStage({ name: data.name, color: data.color, order: existingCount });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditing ? 'Edit Stage' : 'New Stage'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Stage Name *</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className={inputCls}
              placeholder="e.g. Negotiation"
            />
            {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {STAGE_COLORS.map((color) => (
                <label key={color} className="cursor-pointer">
                  <input type="radio" value={color} {...register('color')} className="sr-only" />
                  <div
                    className={`w-7 h-7 rounded-full transition-transform ${
                      selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                    }`}
                    style={{ background: color }}
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-60 flex items-center gap-2"
              style={{ background: selectedColor || '#875a7b' }}
            >
              {isSubmitting ? <><span className="spinner w-3 h-3 border-white" /> Saving…</> : (isEditing ? 'Save' : 'Create Stage')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sortable stage row
const SortableStageRow = ({ stage, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-all"
    >
      <button {...attributes} {...listeners} className="p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
        <GripVertical size={16} />
      </button>
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ background: stage.color || '#875a7b' }}
      />
      <span className="flex-1 text-sm font-medium text-gray-800">{stage.name}</span>
      <span className="text-xs text-gray-400">Order {stage.order + 1}</span>
      <button
        onClick={() => onEdit(stage)}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
      >
        <Edit2 size={13} />
      </button>
      <button
        onClick={() => onDelete(stage)}
        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
};

const PipelinePage = () => {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStage, setEditingStage] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStages();
      setStages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = stages.findIndex((s) => s.id === active.id);
    const newIdx = stages.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(stages, oldIdx, newIdx);
    setStages(reordered);
    await reorderStages(reordered);
  };

  const handleDelete = async (stage) => {
    if (!confirm(`Delete stage "${stage.name}"? Leads in this stage will lose their stage.`)) return;
    await deleteStage(stage.id);
    loadData();
  };

  const handleSeedDefaults = async () => {
    if (!confirm('This will create the default 5 stages. Continue?')) return;
    for (const s of DEFAULT_STAGES) {
      await createStage(s);
    }
    loadData();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{stages.length} stage(s)</p>
          {stages.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              className="text-xs text-purple-600 hover:text-purple-800 underline"
            >
              Create default stages
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} disabled={loading} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { setEditingStage(null); setShowModal(true); }}
            className="flex items-center gap-2 px-3.5 py-2 text-sm text-white rounded-lg"
            style={{ background: '#875a7b' }}
          >
            <Plus size={15} /> New Stage
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <p className="text-xs text-gray-400 mb-3">
          Drag stages to reorder them. The order here is the order shown on the Kanban board.
        </p>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
        ) : stages.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No stages yet.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {stages.map((stage) => (
                  <SortableStageRow
                    key={stage.id}
                    stage={stage}
                    onEdit={(s) => { setEditingStage(s); setShowModal(true); }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {showModal && (
        <StageModal
          stage={editingStage}
          existingCount={stages.length}
          onClose={() => { setShowModal(false); setEditingStage(null); }}
          onSaved={loadData}
        />
      )}
    </div>
  );
};

export default PipelinePage;
