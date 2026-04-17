'use client';
import { useRef } from 'react';
import { useLabellerStore } from '../lib/store';
import { db } from '../lib/db';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Upload, Download, Trash2 } from 'lucide-react';

export function Sidebar() {
  const { currentIndex, totalComments, loadDataset, clearData } = useLabellerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          if (window.confirm("Loading a new dataset will clear existing unsaved exported data. Proceed?")) {
             loadDataset(json);
          }
        } else {
          alert('JSON must be an array of objects.');
        }
      } catch (err) {
        console.error(err);
        alert('Invalid JSON file.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleExport = async () => {
    // Collect all where skipped is false (falsy)
    const allAnnos = await db.annotations.filter(a => !a.skipped).toArray();
    
    // Map to specific schema with serial numbers
    const exportData = allAnnos.map((a, index) => ({
      serial: index + 1,
      id: a.id,
      text: a.text,
      hasSlang: a.hasSlang,
      isCyberbullying: a.isCyberbullying,
      slangAnnotations: a.slangAnnotations
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `labeled_data_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="flex flex-col md:flex-col p-4 w-full md:w-64 md:h-full md:min-h-screen bg-slate-50 md:border-r rounded-none md:shrink-0 gap-6 border-b md:border-b-0">
      <div>
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Labeller</h2>
        <div className="flex flex-col gap-2">
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
            className="hidden" 
          />
          <Button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 text-sm md:text-base py-2 md:py-2">
            <Upload size={16} /> Load JSON
          </Button>

          <Button onClick={handleExport} variant="secondary" className="w-full flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-sm md:text-base py-2 md:py-2">
            <Download size={16} /> Export JSON
          </Button>

          <Button onClick={() => { if(window.confirm('Wipe local database?')) clearData(); }} variant="destructive" className="w-full flex items-center justify-center gap-2 mt-4 text-black text-sm md:text-base py-2 md:py-2">
            <Trash2 size={16} /> Clear All
          </Button>
        </div>
      </div>

      <div className="md:mt-auto pb-2 md:pb-4">
        <p className="text-xs md:text-sm font-medium text-slate-500 mb-1">Progress</p>
        <div className="text-xl md:text-2xl font-bold">
          {totalComments > 0 ? `${currentIndex + 1} / ${totalComments}` : '0 / 0'}
        </div>
        <p className="text-xs text-slate-400 mt-1">Auto-saved</p>
      </div>
    </Card>
  );
}
