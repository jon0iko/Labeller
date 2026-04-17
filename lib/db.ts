import Dexie, { type EntityTable } from 'dexie';

export interface DatasetRow {
  id: string;
  text: string;
}

export interface Annotation {
  id: string; // Same as DatasetRow id
  text: string;
  hasSlang: boolean;
  isCyberbullying: boolean;
  slangAnnotations: Array<{
    word: string;
    rootWord: string;
    usesBypass: boolean;
    bypassType: 'codemixed' | 'spelling variation' | 'other';
    bypassTypeOther: string | null;
  }>;
  skipped: boolean; 
}

const db = new Dexie('LabellerDB') as Dexie & {
  dataset: EntityTable<DatasetRow, 'id'>;
  annotations: EntityTable<Annotation, 'id'>;
};

// Schema declaration
db.version(1).stores({
  dataset: 'id, text',
  annotations: 'id, skipped'
});

export { db };
