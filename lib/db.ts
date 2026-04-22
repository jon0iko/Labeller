import Dexie, { type EntityTable } from 'dexie';

export interface DatasetRow {
  id: string;
  text: string;
}

export interface Annotation {
  id: string; // Same as DatasetRow id
  text: string;
  
  // Branch A: Slang / Profanity
  branchA: {
    hasSlang: boolean;
    selectedSlangWords?: string[];
    slangExpressionType?: 'explicit' | 'masked_obfuscated';
    slangIntent?: 'expressive_casual' | 'directed_malicious';
  };
  
  // Branch B: Cyberbullying / Toxicity
  branchB: {
    hasCyberbullying: boolean;
    bullyingStyle?: 'explicit' | 'implicit_sarcastic';
    targetEntity?: 'individual' | 'group_community' | 'organization';
    toxicVectors?: Array<'body_shaming' | 'gender_based_sexual' | 'religious_communal' | 'intellectual_status' | 'threat_violence'>;
    severityLevel?: 'low' | 'medium' | 'high';
  };
  
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
