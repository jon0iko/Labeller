import { create } from 'zustand';
import { db, DatasetRow } from './db';

interface LabellerState {
  currentIndex: number;
  totalComments: number;
  currentComment: DatasetRow | null;
  loadDataset: (data: unknown[]) => Promise<void>;
  nextComment: () => Promise<void>;
  prevComment: () => Promise<void>;
  skipComment: () => Promise<void>;
  refreshState: () => Promise<void>;
  clearData: () => Promise<void>;
  exportAnnotations: () => Promise<void>;
}

export const useLabellerStore = create<LabellerState>((set, get) => ({
  currentIndex: 0,
  totalComments: 0,
  currentComment: null,

  loadDataset: async (data: unknown[]) => {
    // Only extract 'text' field - use array index as stable ID
    const cleanedRows = data
      .filter((row: unknown) => typeof row === 'object' && row !== null && 'text' in row && typeof (row as Record<string, unknown>).text === 'string' && ((row as Record<string, unknown>).text as string).trim().length > 0)
      .map((row: unknown, index: number) => ({
        id: `row_${index}`, // Stable ID based on position in array
        text: (row as Record<string, unknown>).text as string
      }));

    if (cleanedRows.length === 0) return;

    await db.dataset.clear();
    await db.annotations.clear(); // Restarting completely
    await db.dataset.bulkAdd(cleanedRows);
    
    // Save checkpoint to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('labellerCheckpoint', JSON.stringify({
        totalComments: cleanedRows.length,
        currentIndex: 0,
        timestamp: Date.now()
      }));
    }
    
    set({ currentIndex: 0, totalComments: cleanedRows.length, currentComment: cleanedRows[0] });
  },

  nextComment: async () => {
    const state = get();
    if (state.currentIndex < state.totalComments - 1) {
      const nextIdx = state.currentIndex + 1;
      const nextRow = await db.dataset.offset(nextIdx).first();
      set({ currentIndex: nextIdx, currentComment: nextRow || null });
      
      // Save checkpoint to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('labellerCheckpoint', JSON.stringify({
          totalComments: state.totalComments,
          currentIndex: nextIdx,
          timestamp: Date.now()
        }));
      }
    }
  },

  prevComment: async () => {
    const state = get();
    if (state.currentIndex > 0) {
      const prevIdx = state.currentIndex - 1;
      const prevRow = await db.dataset.offset(prevIdx).first();
      set({ currentIndex: prevIdx, currentComment: prevRow || null });
      
      // Save checkpoint to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('labellerCheckpoint', JSON.stringify({
          totalComments: state.totalComments,
          currentIndex: prevIdx,
          timestamp: Date.now()
        }));
      }
    }
  },

  skipComment: async () => {
    const state = get();
    if (!state.currentComment) return;

    // Save as skipped
    await db.annotations.put({
      id: state.currentComment.id,
      text: state.currentComment.text,
      hasSlang: false,
      isCyberbullying: false,
      slangAnnotations: [],
      skipped: true
    });

    await get().nextComment();
  },

  refreshState: async () => {
    const count = await db.dataset.count();
    if (count > 0) {
      // Restore from localStorage checkpoint if available
      let restoredIndex = 0;
      if (typeof window !== 'undefined') {
        const checkpoint = localStorage.getItem('labellerCheckpoint');
        if (checkpoint) {
          try {
            const parsed = JSON.parse(checkpoint);
            // Validate checkpoint is for same dataset
            if (parsed.totalComments === count) {
              restoredIndex = Math.min(parsed.currentIndex, count - 1);
            }
          } catch (e) {
            // Invalid checkpoint, use 0
            console.error('Failed to parse checkpoint:', e);
          }
        }
      }
      const comment = await db.dataset.offset(restoredIndex).first();
      set({ totalComments: count, currentIndex: restoredIndex, currentComment: comment || null });
    }
  },
  
  clearData: async () => {
    await db.dataset.clear();
    await db.annotations.clear();
    set({ currentIndex: 0, totalComments: 0, currentComment: null });
  },
  
  exportAnnotations: async () => {
    const annotations = await db.annotations.toArray();
    
    // Add serial numbers
    const annotationsWithSerial = annotations.map((ann, index) => ({
      serial: index + 1,
      ...ann
    }));
    
    const dataStr = JSON.stringify(annotationsWithSerial, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `annotations-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}));
